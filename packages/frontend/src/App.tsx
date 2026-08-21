/**
 * Owns all state. Everything below is presentational.
 *
 * Network calls live here rather than in leaf components, for two reasons that
 * are rules rather than preferences:
 *   FE-R-24  `lang` must be on every request. One client called from a handful of
 *            handlers makes that trivial; any card being able to fetch makes it
 *            an audit problem.
 *   FE-R-1   Stats may only come from a response's `deviceState`. That is easy to
 *            hold when responses land in one reducer and impossible to police
 *            when they land anywhere.
 *
 * FE-R-27: the SSE connections are opened once here, not per character screen.
 *          BE's events route is per-product, so there are three of them - but the
 *          rule is about ownership, not count. A connection opened by a mounting
 *          character screen cannot deliver an announcement for a character the
 *          user is not viewing, and the roster badge depends on exactly that.
 */

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import type { Lang } from '@prompthon/shared';
import { createApiClient } from './api';
import { isSendable, normalizeInput } from './pure';
import { translator } from './strings';
import {
  activeSkills,
  feedbackSkill,
  initialState,
  messagesFor,
  reducer,
  selectedCharacter,
  statsFor,
  unseenTotalExcept,
} from './state';
import { RosterView } from './components/RosterView';
import { CharacterView } from './components/CharacterView';

const LANG_KEY = 'prompthon.lang';

/** The one thing FE persists. NFR-2.3 leaves nothing else to the client. */
function readLang(): Lang {
  try {
    const stored = localStorage.getItem(LANG_KEY);
    return stored === 'en' || stored === 'ko' ? stored : 'ko';
  } catch {
    // Private mode or a blocked store. Korean default still holds (FR-8.1).
    return 'ko';
  }
}

const now = () => new Date().toISOString();

export function App() {
  const [state, dispatch] = useReducer(reducer, readLang(), initialState);
  const t = translator(state.lang);

  // The client reads `lang` through a ref so it always sees the current value
  // without being rebuilt, which would tear down the SSE connection on toggle.
  const langRef = useRef(state.lang);
  langRef.current = state.lang;
  const api = useMemo(() => createApiClient(() => langRef.current), []);

  const recorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(LANG_KEY, state.lang);
    } catch {
      // Not being able to remember the choice is not worth failing over.
    }
  }, [state.lang]);

  // FE-R-20: decide once whether voice is even possible. Everything else works
  // regardless.
  useEffect(() => {
    const supported =
      typeof MediaRecorder !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      Boolean(navigator.mediaDevices?.getUserMedia);
    // BE (construction/be PR #7) has no /api/transcribe route yet, so voice input has
    // nowhere real to go in real-API mode - off regardless of what the browser supports.
    const usingRealBackend = import.meta.env.VITE_USE_MOCK === 'false';
    if (!supported || usingRealBackend) {
      dispatch({ type: 'mic/status', status: 'unavailable' });
    }
  }, []);

  // All characters' event connections, opened once here and torn down together.
  // `onOpen` fires only when every one of them is up, so `sse` is the weakest of
  // the three rather than the first to connect.
  useEffect(() => {
    const disconnect = api.connectEvents({
      onAnnouncement: (event) => dispatch({ type: 'sse/announcement', event }),
      onOpen: () => dispatch({ type: 'sse/status', status: 'open' }),
      onDrop: () => dispatch({ type: 'sse/status', status: 'dropped' }),
    });
    return disconnect;
  }, [api]);

  useEffect(() => {
    let cancelled = false;
    api
      .listCharacters()
      .then((characters) => {
        if (!cancelled) dispatch({ type: 'characters/loaded', characters });
      })
      .catch(() => {
        // FE-R-19: report it, never blank the screen.
        if (!cancelled) dispatch({ type: 'characters/failed' });
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  /**
   * Today's context, fetched once here rather than on the character screen.
   *
   * There is one reading for one user, so a per-screen fetch would be three
   * requests for one value - and the panel would be empty for a moment every
   * time the user switched character, which reads as the data having changed.
   */
  const loadContext = useCallback(() => {
    api
      .getTodayContext()
      .then((context) => dispatch({ type: 'context/loaded', context }))
      // Deliberately no `action/failed`: this is a background reading, not
      // something the user asked for, and a chat line saying it failed would be
      // the character apologising for something the user never requested. The
      // panel says so itself instead.
      .catch(() => dispatch({ type: 'context/failed' }));
  }, [api]);

  useEffect(loadContext, [loadContext]);

  const selectCharacter = (characterId: string) => {
    dispatch({ type: 'character/select', characterId });
    // Refetched on open because BE has no push channel for it and the demo
    // switches the reading between takes (device-stub's `/context/today`).
    // Opening a character is the natural moment to catch up.
    loadContext();
    Promise.all([api.getDeviceState(characterId), api.listSkills(characterId)])
      .then(([deviceStats, skills]) =>
        dispatch({ type: 'character/detailLoaded', characterId, deviceStats, skills }),
      )
      .catch(() =>
        dispatch({ type: 'action/failed', characterId, text: t('error.load'), at: now() }),
      );
  };

  const send = (raw: string) => {
    const characterId = state.selectedCharacterId;
    if (!characterId) return;

    const text = normalizeInput(raw);
    if (!isSendable(text)) return;

    // FE-R-30: the skill the message refers to travels with it. The user writes
    // natural language only; the UI already knows which card they came from.
    const skillId = state.feedbackSkillId;

    dispatch({ type: 'message/sent', characterId, text, at: now() });

    // Client-generated so the very first token (still in `onToken`'s closure
    // below) already knows which message to create/append to - the reducer
    // never invents this id itself (state.ts's own "id generation pure" rule
    // is about the reducer's own local seq counter, not this one).
    const streamMessageId = `stream_${crypto.randomUUID()}`;
    api
      .sendMessage(characterId, text, skillId, (delta) =>
        dispatch({ type: 'message/streamToken', characterId, messageId: streamMessageId, delta, at: now() }),
      )
      .then((response) => {
        dispatch({ type: 'action/response', characterId, response });

        if (skillId) {
          // BE's /chat route never returns the skill it revised or deleted - that
          // happens entirely inside the turn via the agent's own tools (see
          // routes/skills.ts). Refetching is what actually gets the change to the
          // compendium instead of it only existing inside BE's store.
          api
            .listSkills(characterId)
            .then((skills) =>
              dispatch({ type: 'character/detailLoaded', characterId, deviceStats: null, skills }),
            )
            .catch(() => {
              // A compendium that is stale until the next natural refresh is not worth
              // a second failure message stacked on a message that otherwise succeeded.
            });
        }
      })
      .catch(() =>
        dispatch({ type: 'action/failed', characterId, text: t('error.request'), at: now() }),
      );
  };

  const invokeSkill = (skillId: string) => {
    const characterId = state.selectedCharacterId;
    if (!characterId) return;

    // FE-R-31: by id, never by name.
    dispatch({ type: 'action/started', characterId });
    api
      .invokeSkill(characterId, skillId)
      .then((response) => dispatch({ type: 'action/response', characterId, response }))
      .catch(() =>
        dispatch({ type: 'action/failed', characterId, text: t('error.invoke'), at: now() }),
      );
  };

  const toggleVoice = async () => {
    const characterId = state.selectedCharacterId;
    if (!characterId || state.micStatus === 'unavailable' || state.micStatus === 'transcribing') {
      return;
    }

    if (state.micStatus === 'recording') {
      recorderRef.current?.stop();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      recorder.onstop = () => {
        for (const track of stream.getTracks()) track.stop();
        recorderRef.current = null;
        dispatch({ type: 'mic/status', status: 'transcribing' });

        api
          .transcribe(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }))
          // FE-R-21: a draft, not a dispatch. A wrong transcript is editable
          // rather than merely visible.
          .then((text) => dispatch({ type: 'transcript/ready', text }))
          .catch(() => {
            dispatch({ type: 'mic/status', status: 'idle' });
            dispatch({
              type: 'action/failed',
              characterId,
              text: t('error.transcribe'),
              at: now(),
            });
          });
      };

      recorder.start();
      recorderRef.current = recorder;
      dispatch({ type: 'mic/status', status: 'recording' });
    } catch {
      // Permission denied or no device. FE-R-20: nothing else is lost.
      dispatch({ type: 'mic/status', status: 'unavailable' });
    }
  };

  const character = selectedCharacter(state);

  return (
    <div className="app">
      <ConnectionBanner status={state.sse} t={t} />

      {state.view === 'roster' || !character ? (
        <RosterView
          characters={state.characters}
          unseen={state.unseen}
          loadError={state.loadError}
          lang={state.lang}
          t={t}
          onSelect={selectCharacter}
          onToggleLang={() => dispatch({ type: 'lang/toggle' })}
        />
      ) : (
        <CharacterView
          character={character}
          characters={state.characters}
          lang={state.lang}
          deviceStats={statsFor(state, character.id)}
          dailyContext={state.dailyContext}
          contextFailed={state.contextFailed}
          messages={messagesFor(state, character.id)}
          skills={activeSkills(state, character.id)}
          unseen={state.unseen}
          pending={Boolean(state.pending[character.id])}
          streaming={Boolean(state.streaming[character.id])}
          levelUp={Boolean(state.levelUp[character.id])}
          discovery={Boolean(state.discovery[character.id])}
          compendiumOpen={state.compendiumOpen}
          logOpen={state.logOpen}
          draft={state.draft}
          micStatus={state.micStatus}
          feedbackSkill={feedbackSkill(state)}
          unseenElsewhere={unseenTotalExcept(state, character.id)}
          t={t}
          onBack={() => dispatch({ type: 'view/back' })}
          onSelectCharacter={selectCharacter}
          onToggleCompendium={(open) => dispatch({ type: 'compendium/toggle', open })}
          onToggleLog={(open) => dispatch({ type: 'log/toggle', open })}
          onDraftChange={(draft) => dispatch({ type: 'draft/set', draft })}
          onSend={send}
          onVoice={toggleVoice}
          onInvoke={invokeSkill}
          onStartFeedback={(skillId) => dispatch({ type: 'feedback/start', skillId })}
          onClearFeedback={() => dispatch({ type: 'feedback/clear' })}
          onLevelUpDone={() => dispatch({ type: 'levelUp/done', characterId: character.id })}
          onDiscoveryDone={() => dispatch({ type: 'discovery/done', characterId: character.id })}
        />
      )}
    </div>
  );
}

/**
 * FE-R-17 connection class, FE-R-18 not dismissible.
 *
 * A dropped stream means the character cannot speak to you unprompted, and the
 * demo's central beat depends on that channel. A dismissible banner gets
 * dismissed absent-mindedly on stage and then a missing announcement has no
 * visible cause.
 */
function ConnectionBanner({
  status,
  t,
}: {
  status: 'connecting' | 'open' | 'dropped';
  t: ReturnType<typeof translator>;
}) {
  if (status !== 'dropped') return null;
  return (
    <div className="banner" role="status" aria-live="polite" data-testid="connection-banner">
      <span>{t('error.connection')}</span>
      <span className="banner-retry">{t('error.connection.retrying')}</span>
    </div>
  );
}
