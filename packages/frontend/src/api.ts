/**
 * The one place FE talks to BE.
 *
 * FE-R-24: `lang` is attached here, centrally, to every request that BE actually
 * reads. Per-call-site passing means one site gets missed and that one
 * interaction replies in the wrong language.
 *
 * FE-R-27: one SSE connection per character, opened here once and shared by the
 * whole app. A connection opened per character SCREEN cannot deliver an
 * announcement for a character the user is not viewing, which is what the badge
 * depends on.
 *
 * FE does NOT retry. NFR-2.1's timeout and single retry live where the model
 * call lives; retrying here would produce two retries and double the worst case.
 *
 * The real client below is written against BE's ACTUAL contract, not FE's
 * original proposal in `aidlc-docs/construction/fe/functional-design/
 * backend-mock-contract.md` - see `packages/backend` on `construction/be` (PR #7).
 * BE's own capture of its real request/response/SSE shapes is in
 * `aidlc-docs/construction/be/code/api-examples.md` on that branch, which is the
 * source to reconcile `packages/shared/src/types.ts` against.
 * Three real gaps in that contract, and how this file bridges them:
 *
 *   1. No `/api/characters` route, no progression, no per-product tier/status -
 *      that data simply never arrives from BE. `./characters.ts` supplies the
 *      roster locally, and `state.ts` supplies a local cosmetic exp bump. See
 *      the note there.
 *   2. `/invoke` returns no `deviceState` even when the skill it ran changed
 *      one, so the panel waits for the next chat turn that reports on the
 *      device. `GET /device-state` itself is real and is what `getDeviceState`
 *      reads when the screen opens, so the panel is no longer empty until the
 *      first chat turn.
 *   3. No `/api/transcribe` route yet. `transcribe` below is still wired to
 *      FE's original mock contract so it starts working the moment BE adds it,
 *      but it is unreachable today because the mic is forced to `unavailable`
 *      in real-API mode (see `App.tsx`).
 *
 * `getTodayContext` is NOT in that list: `/api/context/today` is a real route
 * that really returns data, and it is the one thing here that is not
 * per-character - one user, one reading, deliberately outside
 * `/api/characters/:productId` on BE's side too.
 */

import type {
  ActionResponse,
  Character,
  ChatMessage,
  DailyContextStats,
  DeviceStats,
  Lang,
  ProductId,
  Skill,
  SkillDiscoveredEvent,
  WeatherCondition,
} from '@prompthon/shared';
import { CHARACTER_DEFAULTS } from './characters';
import { createMockClient } from './mock';

export interface ApiClient {
  listCharacters(): Promise<Character[]>;
  /** `null` when there is nothing to report yet - see the class-level note. */
  getDeviceState(characterId: string): Promise<DeviceStats | null>;
  /**
   * Today's weather / movement / screen-time readings. Takes no characterId:
   * one user, one reading, shared by all three characters - BE serves it from
   * `/api/context/today`, outside the per-product routes, for that reason.
   */
  getTodayContext(): Promise<DailyContextStats>;
  listSkills(characterId: string): Promise<Skill[]>;
  /** `onToken` fires with each chunk of the reply as BE streams it, before the returned promise settles. */
  sendMessage(
    characterId: string,
    text: string,
    skillId: string | null,
    onToken?: (text: string) => void,
  ): Promise<ActionResponse>;
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
 */
async function unwrap<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

// ---------------------------------------------------------------------------
// BE's actual wire shapes (packages/backend/src/routes + @prompthon/shared on
// construction/be). Kept local rather than imported from a real shared
// package: this repo's own `@prompthon/shared` (packages/shared/src/types.ts)
// is FE's pre-integration proposal, not BE's package, and the two have not
// been reconciled into one build yet. Everything below adapts these into the
// view-model types FE's components already render.
// ---------------------------------------------------------------------------

interface BeDeviceState {
  productId: ProductId;
  power: 'on' | 'off';
  attributes: Record<string, unknown>;
  updatedAt: string;
}

/**
 * `GET /api/context/today`. BE passes device-stub's reading through verbatim,
 * so this is the stub's shape. `date` is carried on the wire but not rendered -
 * the panel is titled "today" and repeating the date in it would be noise.
 */
interface BeDailyContext {
  date: string;
  weather: WeatherCondition;
  temperatureC: number;
  steps: number;
  distanceKm: number;
  screenTimeMinutes: number;
  observedAt: string;
}

interface BeBilingual {
  ko: string;
  en: string;
}

/**
 * FE-facing shape only - `content` (the full analysis) never leaves BE over
 * REST (construction/be, PR #7 follow-up). `title`/`summary` are the only
 * fields the compendium shows, one language picked at read time.
 */
interface BeSkillSummary {
  id: string;
  productId: ProductId;
  title: BeBilingual;
  kind: 'buff' | 'action';
  summary: BeBilingual;
  createdAt: string;
}

interface BeFailure {
  code: string;
  message: string;
}

interface BeAgentReply {
  prose: string;
  deviceState?: BeDeviceState;
  invokedSkillId?: string;
  failure?: BeFailure;
}

type BeControlEvent =
  | { type: 'token'; text: string }
  | { type: 'deviceState'; state: BeDeviceState }
  | { type: 'done'; reply: BeAgentReply }
  | { type: 'discoveryProgress'; productId: ProductId; phase: string }
  | { type: 'discoveryReasoning'; productId: ProductId; attempt: number; reasoning: string; response: string }
  | { type: 'skillDiscovered'; productId: ProductId; skill: BeSkillSummary };

const PRODUCT_IDS: ProductId[] = CHARACTER_DEFAULTS.map((c) => c.productId);

function toDeviceStats(state: BeDeviceState): DeviceStats {
  const attributes: DeviceStats['attributes'] = [{ key: 'power', value: state.power === 'on' }];
  for (const [key, value] of Object.entries(state.attributes)) {
    attributes.push({ key, value: value as string | number | boolean });
  }
  return { characterId: state.productId, attributes, observedAt: state.updatedAt };
}

/**
 * Drops `date` and keeps the four readings plus `observedAt`. Nothing is
 * computed, rounded or unit-converted here - the panel formats for display, and
 * doing it at the boundary instead would mean the value FE holds is no longer
 * the value BE reported.
 */
function toDailyContext(body: BeDailyContext): DailyContextStats {
  return {
    weather: body.weather,
    temperatureC: body.temperatureC,
    steps: body.steps,
    distanceKm: body.distanceKm,
    screenTimeMinutes: body.screenTimeMinutes,
    observedAt: body.observedAt,
  };
}

/**
 * BE has no tier, status or revision concept (construction/be PR #7) - every
 * skill it returns is presented uniformly rather than guessed at. Revisit once
 * BE distinguishes them.
 */
function toSkill(record: BeSkillSummary, lang: Lang): Skill {
  return {
    id: record.id,
    characterId: record.productId,
    name: record.title[lang],
    tier: 'basic',
    kind: record.kind,
    reason: record.summary[lang],
    status: 'active',
    discoveredAt: record.createdAt,
    revisedAt: null,
  };
}

function characterMessage(characterId: string, text: string, kind: ChatMessage['kind'] = 'normal'): ChatMessage {
  return {
    id: `be_${crypto.randomUUID()}`,
    characterId,
    role: 'character',
    text,
    kind,
    at: new Date().toISOString(),
  };
}

/**
 * Reads an SSE response body until its `done` event, and returns that event's
 * reply. Each intermediate `token` event is BE's live progress as the reply is
 * generated - forwarded to `onToken` as it arrives so the UI can render it
 * word by word instead of waiting for `done`. The `done` event's `reply` is
 * still the source of truth returned here (accumulated prose and the last
 * deviceState BE saw - see `packages/backend/src/routes/character.ts`).
 */
async function readChatUntilDone(
  body: ReadableStream<Uint8Array>,
  onToken?: (text: string) => void,
): Promise<BeAgentReply> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let separatorIndex = buffer.indexOf('\n\n');
    while (separatorIndex !== -1) {
      const frame = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(separatorIndex + 2);

      for (const line of frame.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const event = JSON.parse(line.slice('data: '.length)) as BeControlEvent;
        if (event.type === 'token') onToken?.(event.text);
        if (event.type === 'done') return event.reply;
      }

      separatorIndex = buffer.indexOf('\n\n');
    }
  }

  throw new Error('chat stream ended without a done event');
}

/**
 * `/chat` takes no `skillId` parameter - feedback on a skill is meant to
 * happen entirely through natural language, with the agent using its own
 * `listSkills`/`getSkill` tools to find the one being discussed (see
 * `packages/backend/src/routes/skills.ts`'s closing note). Naming the exact id
 * inline gives it something to resolve directly instead of relying on the
 * skill having been named in prose - a bridge over a real gap, not a
 * documented BE parameter.
 */
function withSkillContext(text: string, skillId: string | null): string {
  return skillId ? `[skillId: ${skillId}] ${text}` : text;
}

function createHttpClient(getLang: GetLang): ApiClient {
  return {
    async listCharacters() {
      return structuredClone(CHARACTER_DEFAULTS);
    },

    /**
     * The device's own reading, fetched when the character screen opens.
     *
     * FR-5.5 is not loosened by this: `GET /device-state` returns the same
     * structured `DeviceState` device-stub reports to the agent's tools, run
     * through the same `toDeviceStats`. Nothing is invented here - a device
     * nobody has commanded yet reports its resting values (power off), and
     * those are what the panel shows instead of a permanent loading line.
     */
    async getDeviceState(characterId) {
      const state = await unwrap<BeDeviceState>(
        await fetch(`/api/characters/${characterId}/device-state`),
      );
      return toDeviceStats(state);
    },

    async getTodayContext() {
      return toDailyContext(await unwrap<BeDailyContext>(await fetch('/api/context/today')));
    },

    async listSkills(characterId) {
      const summaries = await unwrap<BeSkillSummary[]>(await fetch(`/api/characters/${characterId}/skills`));
      // The list already carries title/summary in both languages - no per-skill
      // detail fetch needed now that `/skills/:id` returns the same shape (BE
      // never sends the full analysis over REST).
      return summaries.map((s) => toSkill(s, getLang()));
    },

    async sendMessage(characterId, text, skillId, onToken) {
      const response = await fetch(`/api/characters/${characterId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: withSkillContext(text, skillId), lang: getLang() }),
      });
      if (!response.ok || !response.body) {
        throw new Error(`Request failed (${response.status})`);
      }

      const reply = await readChatUntilDone(response.body, onToken);
      // A model-call failure still arrives as a `done` event with its own in-character
      // apology and no deviceState (NFR-2.2, by BE's own design) - that is rendered as
      // the character speaking, styled as a failure, rather than discarded in favour of
      // FE's generic error text. Only a transport-level failure (above) throws.
      return {
        message: characterMessage(characterId, reply.prose, reply.failure ? 'failure' : 'normal'),
        deviceState: reply.deviceState ? toDeviceStats(reply.deviceState) : null,
        skill: null,
      };
    },

    async invokeSkill(characterId, skillId) {
      const response = await fetch(`/api/characters/${characterId}/skills/${skillId}/invoke`, {
        method: 'POST',
      });
      const body = await unwrap<{ prose: string; invokedSkillId?: string; failure?: BeFailure }>(response);
      // No deviceState in this response even when the skill changed one (a real BE gap) -
      // the panel simply waits for the next chat turn that reports on the device.
      return {
        message: characterMessage(characterId, body.prose, body.failure ? 'failure' : 'normal'),
        deviceState: null,
        skill: null,
      };
    },

    async transcribe(audio) {
      // Q10 C: one REST route, no WebSocket. The credential stays server-side
      // (NFR-1.2) - the browser never talks to Transcribe.
      const form = new FormData();
      form.append('audio', audio, 'utterance.webm');
      const response = await fetch('/api/transcribe', { method: 'POST', body: form });
      const body = await unwrap<{ text: string }>(response);
      return body.text;
    },

    connectEvents(handlers) {
      // BE's events route is per-product (`/api/characters/:productId/events`), not the
      // single global stream FE's original proposal assumed - so this opens one
      // EventSource per character rather than one for the app. `onOpen` waits for all of
      // them; `onDrop`/reconnect happen per connection, since one character's channel can
      // drop independently of the others.
      let closed = false;
      const sources = new Map<ProductId, EventSource>();
      const retryTimers = new Map<ProductId, ReturnType<typeof setTimeout>>();
      const openIds = new Set<ProductId>();

      const announceText = (name: string): string =>
        getLang() === 'ko' ? `${name} 스킬을 새로 발견했어요!` : `I discovered a new skill: ${name}`;

      const notifyDiscovery = (productId: ProductId, summary: BeSkillSummary) => {
        // The event already carries title/summary in both languages - same
        // shape `/skills` and `/skills/:id` return, so no extra fetch needed.
        const skill = toSkill(summary, getLang());
        const event: SkillDiscoveredEvent = {
          characterId: productId,
          skill,
          // BE's discovery graph never produces user-facing prose for this moment (only
          // dev-facing reasoning, logged server-side) - the announcement caption is FE's
          // own wording, not BE's.
          message: characterMessage(productId, announceText(skill.name), 'announcement'),
        };
        handlers.onAnnouncement(event);
      };

      const open = (productId: ProductId) => {
        if (closed) return;
        const source = new EventSource(`/api/characters/${productId}/events`);
        sources.set(productId, source);

        source.onopen = () => {
          openIds.add(productId);
          if (openIds.size === PRODUCT_IDS.length) handlers.onOpen();
        };

        source.onmessage = (raw) => {
          let event: BeControlEvent;
          try {
            event = JSON.parse((raw as MessageEvent).data) as BeControlEvent;
          } catch {
            return; // A malformed event is not worth tearing the connection down for.
          }
          if (event.type === 'skillDiscovered') notifyDiscovery(productId, event.skill);
        };

        source.onerror = () => {
          openIds.delete(productId);
          handlers.onDrop();
          if (source.readyState === EventSource.CLOSED && !closed) {
            retryTimers.set(productId, setTimeout(() => open(productId), 3000));
          }
        };
      };

      for (const productId of PRODUCT_IDS) open(productId);

      return () => {
        closed = true;
        for (const timer of retryTimers.values()) clearTimeout(timer);
        for (const source of sources.values()) source.close();
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
