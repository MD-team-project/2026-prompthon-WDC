/**
 * The one place FE talks to BE.
 *
 * FE-R-24: `lang` is attached here, centrally, to every request. Per-call-site
 * passing means one site gets missed and that one interaction replies in the
 * wrong language.
 *
 * FE-R-27: one SSE connection for the whole app, carrying events for all three
 * characters. A per-character connection cannot deliver an announcement for a
 * character the user is not viewing, which is what the badge depends on.
 *
 * FE does NOT retry. NFR-2.1's timeout and single retry live where the model
 * call lives; retrying here would produce two retries and double the worst case.
 *
 * Route shapes are FE's proposal - see
 * `aidlc-docs/construction/fe/functional-design/backend-mock-contract.md`.
 */

import type {
  ActionResponse,
  Character,
  DeviceStats,
  Lang,
  SendMessageRequest,
  Skill,
  SkillDiscoveredEvent,
  TranscribeResponse,
} from '@prompthon/shared';
import { createMockClient } from './mock';

export interface ApiClient {
  listCharacters(): Promise<Character[]>;
  getDeviceState(characterId: string): Promise<DeviceStats>;
  listSkills(characterId: string): Promise<Skill[]>;
  sendMessage(characterId: string, text: string, skillId: string | null): Promise<ActionResponse>;
  invokeSkill(characterId: string, skillId: string): Promise<ActionResponse>;
  transcribe(audio: Blob): Promise<string>;
  /** Returns a disconnect function. */
  connectEvents(handlers: EventHandlers): () => void;
}

export interface EventHandlers {
  onAnnouncement(event: SkillDiscoveredEvent): void;
  onOpen(): void;
  onDrop(): void;
}

export type GetLang = () => Lang;

/**
 * FE chooses failure wording by WHICH call failed, not by an error code from the
 * body - a failed message, a failed invoke and a failed transcription each have
 * their own sentence. So the error code is not read here, and parsing it out
 * would be flexibility with no consumer.
 *
 * BE is free to return `{ error: { code, message } }` as the mock contract
 * proposes. FE simply does not branch on it yet.
 */
async function unwrap<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

function createHttpClient(getLang: GetLang): ApiClient {
  const withLang = (path: string) => {
    const separator = path.includes('?') ? '&' : '?';
    return `${path}${separator}lang=${getLang()}`;
  };

  // Typed against the shared shape rather than `unknown`, so the request body is
  // checked against the contract BE reads instead of only being documented in it.
  const postJson = async (
    path: string,
    body: Omit<SendMessageRequest, 'lang'> | Record<string, never>,
  ): Promise<ActionResponse> => {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, lang: getLang() }),
    });
    return unwrap<ActionResponse>(response);
  };

  return {
    async listCharacters() {
      return unwrap<Character[]>(await fetch(withLang('/api/characters')));
    },

    async getDeviceState(characterId) {
      return unwrap<DeviceStats>(await fetch(withLang(`/api/characters/${characterId}/state`)));
    },

    async listSkills(characterId) {
      return unwrap<Skill[]>(await fetch(withLang(`/api/characters/${characterId}/skills`)));
    },

    async sendMessage(characterId, text, skillId) {
      return postJson(`/api/characters/${characterId}/messages`, { text, skillId });
    },

    async invokeSkill(characterId, skillId) {
      return postJson(`/api/characters/${characterId}/skills/${skillId}/invoke`, {});
    },

    async transcribe(audio) {
      // Q10 C: one REST route, no WebSocket. The credential stays server-side
      // (NFR-1.2) - the browser never talks to Transcribe.
      const form = new FormData();
      form.append('audio', audio, 'utterance.webm');
      const response = await fetch(withLang('/api/transcribe'), { method: 'POST', body: form });
      const body = await unwrap<TranscribeResponse>(response);
      return body.text;
    },

    connectEvents(handlers) {
      // EventSource reconnects on its own, honouring the server's `retry:`
      // interval. Hand-rolling backoff on top of that would be reimplementing a
      // platform feature - and worse than it, since the native retry respects
      // what the server asks for.
      //
      // The one case the platform does NOT cover is a fatal error, where
      // readyState goes to CLOSED and it stops trying. That is exactly the SSE
      // failure a dev-server proxy produces, so it gets a plain fixed retry.
      let source: EventSource | null = null;
      let retryTimer: ReturnType<typeof setTimeout> | null = null;
      let closed = false;

      const open = () => {
        if (closed) return;
        source = new EventSource('/api/events');

        source.onopen = () => handlers.onOpen();

        source.addEventListener('skill_discovered', (raw) => {
          try {
            handlers.onAnnouncement(JSON.parse((raw as MessageEvent).data) as SkillDiscoveredEvent);
          } catch {
            // A malformed event is not worth tearing the connection down for.
          }
        });

        source.onerror = () => {
          // The banner goes up either way (FE-R-18). If the browser is still
          // retrying, `onopen` will fire again and clear it.
          handlers.onDrop();
          if (source?.readyState === EventSource.CLOSED && !closed) {
            retryTimer = setTimeout(open, 3000);
          }
        };
      };

      open();

      return () => {
        closed = true;
        if (retryTimer) clearTimeout(retryTimer);
        source?.close();
      };
    },
  };
}

/**
 * Q2 A: one client interface, two implementations, selected by an env flag.
 *
 * The flag rather than a code change is what makes the hour-5.5 integration
 * checkpoint cheap - and it allows partial integration, real routes for what BE
 * has finished and mock for what it has not, by editing one file.
 */
export function createApiClient(getLang: GetLang): ApiClient {
  return import.meta.env.VITE_USE_MOCK === 'false'
    ? createHttpClient(getLang)
    : createMockClient(getLang);
}
