/**
 * Session state and the reducer.
 *
 * This file is where four rules are enforced structurally rather than by
 * discipline:
 *
 *   FE-R-1  A stat value never originates in message text. The `action/response`
 *           case reads `response.message.text` and `response.deviceState` as two
 *           separate fields with two separate destinations. There is no function
 *           in this file that takes a string and produces stats.
 *   FE-R-2  Progression and device state are held in two separate slices and are
 *           never combined into one collection.
 *   FE-R-3  `pending` is a boolean per character. There is no shape here that
 *           could hold a predicted stat value.
 *   FE-R-4  Every terminal action clears `pending`. There is no fourth case.
 *
 * The reducer is pure. Timestamps and generated text arrive on the action rather
 * than being read from the clock, which is what lets the FR-5.5 check be a plain
 * unit test with no DOM and no fake timers.
 */

import type {
  ActionResponse,
  Character,
  ChatMessage,
  DailyContextStats,
  DeviceStats,
  Lang,
  Progression,
  Skill,
  SkillDiscoveredEvent,
} from '@prompthon/shared';
import { applyExpBump, applyLevelUp, MESSAGE_EXP_GAIN } from './pure';

export type SseStatus = 'connecting' | 'open' | 'dropped';
export type View = 'roster' | 'character';
export type MicStatus = 'idle' | 'unavailable' | 'recording' | 'transcribing';

export interface State {
  lang: Lang;
  view: View;
  selectedCharacterId: string | null;
  compendiumOpen: boolean;
  logOpen: boolean;
  sse: SseStatus;
  /** Announcement counts for characters the user is not looking at. FE-R-28. */
  unseen: Record<string, number>;
  /** In-flight marker. Boolean by decision - never a predicted value. FE-R-3. */
  pending: Record<string, boolean>;
  /** True from the first streamed token of a reply until it finalizes on `done`. */
  streaming: Record<string, boolean>;
  /** Skill the next message refers to, when feedback started from a card. */
  feedbackSkillId: string | null;
  draft: string;
  micStatus: MicStatus;
  loadError: boolean;
  characters: Character[];
  deviceStats: Record<string, DeviceStats>;
  /**
   * Today's weather / movement / screen-time readings.
   *
   * A single value, NOT a `Record` keyed by character, and that is the whole
   * shape of the rule: there is one user with one phone, so there is nothing to
   * key it by. Making it per-character would allow two characters to hold
   * different step counts for the same day, which no source could ever produce.
   *
   * Held in the same reducer as `deviceStats` but in a separate field, for the
   * FE-R-1 reason: a device reading and a phone reading must never be able to
   * end up in each other's slot.
   */
  dailyContext: DailyContextStats | null;
  /** Distinguishes "still loading" from "we asked and it failed". FE-R-19. */
  contextFailed: boolean;
  skills: Record<string, Skill[]>;
  messages: Record<string, ChatMessage[]>;
  /** Transient: drives the in-place level-up effect until it reports done. */
  levelUp: Record<string, boolean>;
  /**
   * Transient: drives the in-place skill-discovery reaction until it reports
   * done. Only set for a genuinely NEW skill (never a revision - see
   * `isNewSkill`), and only while that character is on screen, mirroring the
   * level-up effect's rule that an effect missed while the user was elsewhere
   * is never replayed on arrival.
   */
  discovery: Record<string, boolean>;
  /**
   * Sticky, unlike `levelUp` above: once a character has levelled up at all
   * this session, it stays in its powered-up idle form - this is what a
   * character's art checks, not the transient effect flag, which clears the
   * moment the effect finishes playing.
   */
  poweredUp: Record<string, boolean>;
  /**
   * A level-up earned by reaching two skills, held here until the discovery
   * reaction for that exact skill finishes playing (`discovery/done` is where
   * it resolves) - skill discovery and levelling up are separate events now,
   * and this is what keeps their effects from landing on top of each other
   * when one happens to cause the other.
   */
  pendingLevelUp: Record<string, boolean>;
  /** Local message id counter. Keeps id generation pure. */
  seq: number;
}

export type Action =
  | { type: 'lang/toggle' }
  | { type: 'characters/loaded'; characters: Character[] }
  | { type: 'characters/failed' }
  | {
      type: 'character/detailLoaded';
      characterId: string;
      deviceStats: DeviceStats | null;
      skills: Skill[];
    }
  | { type: 'context/loaded'; context: DailyContextStats }
  | { type: 'context/failed' }
  | { type: 'character/select'; characterId: string }
  | { type: 'view/back' }
  | { type: 'compendium/toggle'; open: boolean }
  | { type: 'log/toggle'; open: boolean }
  | { type: 'draft/set'; draft: string }
  | { type: 'mic/status'; status: MicStatus }
  | { type: 'transcript/ready'; text: string }
  | { type: 'message/sent'; characterId: string; text: string; at: string }
  | { type: 'message/streamToken'; characterId: string; messageId: string; delta: string; at: string }
  | { type: 'action/started'; characterId: string }
  | { type: 'action/response'; characterId: string; response: ActionResponse }
  | { type: 'action/failed'; characterId: string; text: string; at: string }
  | { type: 'sse/status'; status: SseStatus }
  | { type: 'sse/announcement'; event: SkillDiscoveredEvent }
  | { type: 'feedback/start'; skillId: string }
  | { type: 'feedback/clear' }
  | { type: 'levelUp/done'; characterId: string }
  | { type: 'discovery/done'; characterId: string }
  /**
   * The other way to level up, alongside reaching two skills: tapping the
   * level/exp button in the HUD (`CharacterView`). Immediate, unlike the
   * two-skill path - there's no reaction it could be landing on top of, since
   * nothing about it is tied to a discovery.
   */
  | { type: 'levelUp/trigger'; characterId: string };

export function initialState(lang: Lang): State {
  return {
    lang,
    view: 'roster',
    selectedCharacterId: null,
    compendiumOpen: false,
    logOpen: false,
    sse: 'connecting',
    unseen: {},
    pending: {},
    streaming: {},
    feedbackSkillId: null,
    draft: '',
    micStatus: 'idle',
    loadError: false,
    characters: [],
    deviceStats: {},
    dailyContext: null,
    contextFailed: false,
    skills: {},
    messages: {},
    levelUp: {},
    discovery: {},
    poweredUp: {},
    pendingLevelUp: {},
    seq: 0,
  };
}

/** Replace a character's progression fields. Touches nothing else. FE-R-2. */
function applyProgression(
  characters: Character[],
  characterId: string,
  progression: Progression,
): Character[] {
  return characters.map((c) =>
    c.id === characterId
      ? { ...c, level: progression.level, exp: progression.exp, expToNext: progression.expToNext }
      : c,
  );
}

/**
 * Insert or replace a skill, keeping its position.
 *
 * FE-R-16: a revised skill keeps its identity. Replacing in place rather than
 * removing and appending is what makes that visible - the card updates where it
 * already was instead of jumping to the end of the list.
 *
 * FE-R-15: a retired skill leaves the list.
 */
/** True only for a skill id not already in the list - a revision is not a discovery. */
function isNewSkill(existing: Skill[] | undefined, skill: Skill): boolean {
  return !(existing ?? []).some((s) => s.id === skill.id);
}

function upsertSkill(existing: Skill[] | undefined, skill: Skill): Skill[] {
  const list = existing ?? [];
  if (skill.status === 'retired') {
    return list.filter((s) => s.id !== skill.id);
  }
  const index = list.findIndex((s) => s.id === skill.id);
  if (index === -1) {
    return [...list, skill];
  }
  const next = [...list];
  next[index] = skill;
  return next;
}

function appendMessage(
  messages: Record<string, ChatMessage[]>,
  characterId: string,
  message: ChatMessage,
): Record<string, ChatMessage[]> {
  return { ...messages, [characterId]: [...(messages[characterId] ?? []), message] };
}

/**
 * A terminal reply (`done`, or a transport failure) either finalizes the
 * streamed placeholder `message/streamToken` built up token by token, or - if
 * nothing streamed (mock latency with no chunks, or a failure before the
 * first token) - appends fresh, same as before streaming existed.
 */
function finalizeStreamedMessage(
  messages: Record<string, ChatMessage[]>,
  characterId: string,
  wasStreaming: boolean,
  message: ChatMessage,
): Record<string, ChatMessage[]> {
  const existing = messages[characterId] ?? [];
  if (wasStreaming && existing.length > 0) {
    return { ...messages, [characterId]: [...existing.slice(0, -1), message] };
  }
  return appendMessage(messages, characterId, message);
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'lang/toggle':
      // FE-R-25: strings change. Nothing already generated is rewritten.
      return { ...state, lang: state.lang === 'ko' ? 'en' : 'ko' };

    case 'characters/loaded':
      return { ...state, characters: action.characters, loadError: false };

    case 'characters/failed':
      // FE-R-19: report it, do not blank the screen.
      return { ...state, loadError: true };

    case 'character/detailLoaded': {
      const deviceStats = action.deviceStats
        ? { ...state.deviceStats, [action.characterId]: action.deviceStats }
        : state.deviceStats;
      return {
        ...state,
        deviceStats,
        skills: { ...state.skills, [action.characterId]: action.skills },
      };
    }

    case 'context/loaded':
      return { ...state, dailyContext: action.context, contextFailed: false };

    case 'context/failed':
      // Keeps whatever was already read rather than blanking the panel: a
      // refetch that failed does not make this morning's step count untrue, and
      // an emptied panel would read as "you didn't move today". `contextFailed`
      // is what the panel reports if it has nothing at all yet.
      return { ...state, contextFailed: true };

    case 'character/select': {
      // FE-R-29: a badge clears only when that character's screen is opened.
      const unseen = { ...state.unseen };
      delete unseen[action.characterId];
      return {
        ...state,
        view: 'character',
        selectedCharacterId: action.characterId,
        compendiumOpen: false,
        logOpen: false,
        draft: '',
        feedbackSkillId: null,
        unseen,
      };
    }

    case 'view/back':
      return {
        ...state,
        view: 'roster',
        selectedCharacterId: null,
        compendiumOpen: false,
        logOpen: false,
        feedbackSkillId: null,
      };

    case 'compendium/toggle':
      return { ...state, compendiumOpen: action.open };

    case 'log/toggle':
      return { ...state, logOpen: action.open };

    case 'draft/set':
      return { ...state, draft: action.draft };

    case 'mic/status':
      return { ...state, micStatus: action.status };

    case 'transcript/ready':
      // FE-R-21: the transcript is an editable draft, not a dispatch.
      return { ...state, draft: action.text, micStatus: 'idle' };

    case 'message/sent': {
      // The user's own utterance. Not optimistic - it records what the user did,
      // it does not predict any result.
      const message: ChatMessage = {
        id: `local-${state.seq}`,
        characterId: action.characterId,
        role: 'user',
        text: action.text,
        kind: 'normal',
        at: action.at,
      };
      return {
        ...state,
        seq: state.seq + 1,
        draft: '',
        messages: appendMessage(state.messages, action.characterId, message),
        pending: { ...state.pending, [action.characterId]: true },
      };
    }

    case 'action/started':
      return { ...state, pending: { ...state.pending, [action.characterId]: true } };

    case 'message/streamToken': {
      const { characterId, messageId, delta, at } = action;
      const list = state.messages[characterId] ?? [];
      const index = list.findIndex((m) => m.id === messageId);
      const nextList =
        index === -1
          ? [...list, { id: messageId, characterId, role: 'character' as const, text: delta, kind: 'normal' as const, at }]
          : list.map((m, i) => (i === index ? { ...m, text: m.text + delta } : m));
      return {
        ...state,
        messages: { ...state.messages, [characterId]: nextList },
        streaming: { ...state.streaming, [characterId]: true },
      };
    }

    case 'action/response': {
      const { characterId, response } = action;
      const wasStreaming = Boolean(state.streaming[characterId]);

      // ------------------------------------------------------------------
      // FE-R-1 / FR-5.5. The single most important transition in this unit.
      //
      // `response.message.text` is prose and goes to `messages`.
      // `response.deviceState` is structured and goes to `deviceStats`.
      //
      // Two fields, two destinations, no crossing. When the device clamps a
      // 30-minute request to 25, `deviceState` says 25 and the prose may well
      // mention 30 - and the screen shows 25, because 25 is the only number
      // that reached `deviceStats`.
      // ------------------------------------------------------------------
      const messages = finalizeStreamedMessage(state.messages, characterId, wasStreaming, response.message);
      const deviceStats = response.deviceState
        ? { ...state.deviceStats, [characterId]: response.deviceState }
        : state.deviceStats;

      // BE sends no progression at all (construction/be PR #7) - `response.progression`
      // is mock-only. Absent it, a local cosmetic bump keeps the exp bar moving
      // instead of sitting dead. See `applyExpBump` - it never levels the
      // character up on its own, so there is nothing here to check for that.
      const currentCharacter = state.characters.find((c) => c.id === characterId);
      const progression =
        response.progression ??
        (currentCharacter ? applyExpBump(currentCharacter, MESSAGE_EXP_GAIN) : null);

      const characters = progression
        ? applyProgression(state.characters, characterId, progression)
        : state.characters;

      const skills = response.skill
        ? { ...state.skills, [characterId]: upsertSkill(state.skills[characterId], response.skill) }
        : state.skills;

      return {
        ...state,
        messages,
        deviceStats,
        characters,
        skills,
        // FE-R-4
        pending: { ...state.pending, [characterId]: false },
        streaming: { ...state.streaming, [characterId]: false },
        feedbackSkillId: null,
      };
    }

    case 'action/failed': {
      // FE-R-17: request-level failure reads as the character reporting it.
      // FE-R-19: stats already on screen are untouched.
      const message: ChatMessage = {
        id: `local-${state.seq}`,
        characterId: action.characterId,
        role: 'character',
        text: action.text,
        kind: 'failure',
        at: action.at,
      };
      const wasStreaming = Boolean(state.streaming[action.characterId]);
      return {
        ...state,
        seq: state.seq + 1,
        messages: finalizeStreamedMessage(state.messages, action.characterId, wasStreaming, message),
        // FE-R-4
        pending: { ...state.pending, [action.characterId]: false },
        streaming: { ...state.streaming, [action.characterId]: false },
      };
    }

    case 'sse/status':
      return { ...state, sse: action.status };

    case 'sse/announcement': {
      const { event } = action;
      const onScreen = state.view === 'character' && state.selectedCharacterId === event.characterId;
      const discovered = isNewSkill(state.skills[event.characterId], event.skill);

      // The skill is applied either way, so it is correct whenever the user
      // arrives. Discovery is visual only now - the `surprise` reaction below
      // and nothing else. Levelling up is a fully separate concern (see
      // `applyLevelUp`); the only thing this event can do toward it is push
      // the active skill count across the two-skill mark.
      const skills = {
        ...state.skills,
        [event.characterId]: upsertSkill(state.skills[event.characterId], event.skill),
      };

      const activeBefore = (state.skills[event.characterId] ?? []).filter((s) => s.status === 'active').length;
      const activeAfter = skills[event.characterId].filter((s) => s.status === 'active').length;
      const crossesTwoSkills = activeBefore < 2 && activeAfter >= 2;

      // The announcement is appended regardless, so opening that character shows
      // it saying what it found rather than showing nothing.
      const messages = appendMessage(state.messages, event.characterId, event.message);

      // A reaction is about to play for this exact discovery, on screen - the
      // level-up has to wait for it to finish (`discovery/done` is where it
      // actually resolves) rather than land on top of it.
      if (onScreen && crossesTwoSkills && discovered) {
        return {
          ...state,
          skills,
          messages,
          discovery: { ...state.discovery, [event.characterId]: true },
          pendingLevelUp: { ...state.pendingLevelUp, [event.characterId]: true },
        };
      }

      // Nothing to wait for here - either this doesn't cross the mark, or it
      // did without being a fresh discovery (a revision changing status, in
      // principle), so there's no reaction playing to land on top of.
      const character = state.characters.find((c) => c.id === event.characterId);
      const progression = crossesTwoSkills && character ? applyLevelUp(character) : null;
      const characters = progression
        ? applyProgression(state.characters, event.characterId, progression)
        : state.characters;
      // Sticky for the rest of the session, unlike `levelUp` below - this is
      // what a character's idle art checks to stay in its powered-up form
      // after the effect itself has finished playing.
      const poweredUp = progression
        ? { ...state.poweredUp, [event.characterId]: true }
        : state.poweredUp;

      if (onScreen) {
        // FE-R-9: the effect is not synchronised with the message. Both are
        // applied here and rendered independently. Same rule for the discovery
        // reaction: it plays because a NEW skill just arrived, not because the
        // announcement text says so.
        return {
          ...state,
          skills,
          characters,
          messages,
          poweredUp,
          levelUp: progression ? { ...state.levelUp, [event.characterId]: true } : state.levelUp,
          discovery: discovered
            ? { ...state.discovery, [event.characterId]: true }
            : state.discovery,
        };
      }

      // FE-R-28: a badge, and nothing that takes the screen.
      //
      // The level-up effect (and the discovery reaction) are deliberately NOT
      // queued for arrival. They happened while the user was elsewhere, and
      // playing them on arrival would assert a timing that did not occur. The
      // badge is the signal; progression, the skill and the sticky
      // powered-up art are already applied.
      return {
        ...state,
        skills,
        characters,
        messages,
        poweredUp,
        unseen: {
          ...state.unseen,
          [event.characterId]: (state.unseen[event.characterId] ?? 0) + 1,
        },
      };
    }

    case 'feedback/start':
      // Q6 D: the overlay closes, the input takes focus, the skill is bound.
      return {
        ...state,
        compendiumOpen: false,
        feedbackSkillId: action.skillId,
      };

    case 'feedback/clear':
      return { ...state, feedbackSkillId: null };

    case 'levelUp/done': {
      const levelUp = { ...state.levelUp };
      delete levelUp[action.characterId];
      return { ...state, levelUp };
    }

    case 'discovery/done': {
      const { characterId } = action;
      const discovery = { ...state.discovery };
      delete discovery[characterId];

      // The discovery this level-up was waiting on has just finished playing
      // - now it can land, same as it would have if nothing had made it wait.
      if (!state.pendingLevelUp[characterId]) {
        return { ...state, discovery };
      }

      const pendingLevelUp = { ...state.pendingLevelUp };
      delete pendingLevelUp[characterId];

      const character = state.characters.find((c) => c.id === characterId);
      if (!character) return { ...state, discovery, pendingLevelUp };

      const progression = applyLevelUp(character);
      return {
        ...state,
        discovery,
        pendingLevelUp,
        characters: applyProgression(state.characters, characterId, progression),
        levelUp: { ...state.levelUp, [characterId]: true },
        poweredUp: { ...state.poweredUp, [characterId]: true },
      };
    }

    case 'levelUp/trigger': {
      const { characterId } = action;
      const character = state.characters.find((c) => c.id === characterId);
      if (!character) return state;
      const progression = applyLevelUp(character);
      return {
        ...state,
        characters: applyProgression(state.characters, characterId, progression),
        levelUp: { ...state.levelUp, [characterId]: true },
        poweredUp: { ...state.poweredUp, [characterId]: true },
      };
    }

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Selectors. Small enough to be worth having, small enough not to be a layer.
// ---------------------------------------------------------------------------

export function selectedCharacter(state: State): Character | null {
  if (!state.selectedCharacterId) return null;
  return state.characters.find((c) => c.id === state.selectedCharacterId) ?? null;
}

export function activeSkills(state: State, characterId: string): Skill[] {
  return (state.skills[characterId] ?? []).filter((s) => s.status === 'active');
}

export function messagesFor(state: State, characterId: string): ChatMessage[] {
  return state.messages[characterId] ?? [];
}

export function statsFor(state: State, characterId: string): DeviceStats | null {
  return state.deviceStats[characterId] ?? null;
}

export function unseenTotalExcept(state: State, characterId: string | null): number {
  return Object.entries(state.unseen).reduce(
    (total, [id, count]) => (id === characterId ? total : total + count),
    0,
  );
}

export function feedbackSkill(state: State): Skill | null {
  if (!state.feedbackSkillId || !state.selectedCharacterId) return null;
  return (
    (state.skills[state.selectedCharacterId] ?? []).find((s) => s.id === state.feedbackSkillId) ??
    null
  );
}
