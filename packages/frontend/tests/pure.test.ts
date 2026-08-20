/**
 * Example-based tests.
 *
 * PBT-10: property-based tests complement these rather than replacing them. The
 * critical path gets an explicit example pinning expected behaviour, because a
 * property says "this holds generally" and an example says "this specific thing
 * must be this specific value" - and for FR-5.5 the second is what matters.
 */

import { describe, expect, it } from 'vitest';
import type {
  ActionResponse,
  Character,
  DailyContextStats,
  Skill,
  SkillDiscoveredEvent,
} from '@prompthon/shared';
import { initialState, reducer, activeSkills, statsFor, unseenTotalExcept, type State } from '../src/state';
import { isSendable, normalizeInput, resolveLabel } from '../src/pure';
import { attributeLabel, attributeValue, contextChips } from '../src/strings';

const shoecase: Character = {
  id: 'shoecase',
  productId: 'shoecase',
  name: '슈케이스',
  level: 3,
  exp: 120,
  expToNext: 200,
  artRef: 'shoecase/base',
};

const pral: Character = {
  id: 'pral',
  productId: 'pral',
  name: '프라엘',
  level: 2,
  exp: 40,
  expToNext: 100,
  artRef: 'pral/base',
};

function loaded(): State {
  let state = initialState('ko');
  state = reducer(state, { type: 'characters/loaded', characters: [shoecase, pral] });
  state = reducer(state, { type: 'character/select', characterId: 'shoecase' });
  return state;
}

// ---------------------------------------------------------------------------
// FE-R-1 / FR-5.5. The single most important check in this unit.
// ---------------------------------------------------------------------------

describe('FE-R-1: displayed stats originate in the structured device response', () => {
  it('renders the clamped value, not the number the conversation was about', () => {
    // The device clamps a 30-minute request to its own limit of 25. The prose
    // mentions both numbers - which is exactly what a real reply does. A UI fed
    // from reply text would show 30, because 30 is what the conversation was
    // about.
    const response: ActionResponse = {
      message: {
        id: 'm_1',
        characterId: 'shoecase',
        role: 'character',
        text: '30분 말씀하셨는데 이 제품은 25분까지만 돼서 25분으로 맞췄어요.',
        kind: 'normal',
        at: '2026-08-20T09:00:00Z',
      },
      deviceState: {
        characterId: 'shoecase',
        attributes: [
          { key: 'power', value: true },
          { key: 'mode', value: 'dry' },
          { key: 'remainingMinutes', value: 25, unit: 'min' },
        ],
        observedAt: '2026-08-20T09:00:00Z',
      },
      progression: { level: 3, exp: 135, expToNext: 200, leveledUp: false },
      skill: null,
    };

    const state = reducer(loaded(), { type: 'action/response', characterId: 'shoecase', response });

    const remaining = statsFor(state, 'shoecase')!.attributes.find((a) => a.key === 'remainingMinutes');
    expect(remaining!.value).toBe(25);

    // And nothing anywhere in the stats carries 30.
    const values = statsFor(state, 'shoecase')!.attributes.map((a) => String(a.value));
    expect(values).not.toContain('30');
  });

  it('leaves stats untouched when a response carries no deviceState', () => {
    let state = loaded();
    state = reducer(state, {
      type: 'character/detailLoaded',
      characterId: 'shoecase',
      deviceStats: {
        characterId: 'shoecase',
        attributes: [{ key: 'remainingMinutes', value: 25, unit: 'min' }],
        observedAt: '2026-08-20T09:00:00Z',
      },
      skills: [],
    });

    state = reducer(state, {
      type: 'action/response',
      characterId: 'shoecase',
      response: {
        message: {
          id: 'm_2',
          characterId: 'shoecase',
          role: 'character',
          text: '지금은 40분으로 돌리고 있어요.',
          kind: 'normal',
          at: '2026-08-20T09:01:00Z',
        },
        deviceState: null,
      },
    });

    // The prose claims 40. Nothing structured said so, so nothing changed.
    expect(statsFor(state, 'shoecase')!.attributes[0]!.value).toBe(25);
  });
});

// ---------------------------------------------------------------------------
// FE-R-4: the in-flight marker always clears.
// ---------------------------------------------------------------------------

describe('FE-R-4: pending always clears', () => {
  it('is set on send and cleared on response', () => {
    let state = reducer(loaded(), {
      type: 'message/sent',
      characterId: 'shoecase',
      text: '건조해줘',
      at: '2026-08-20T09:00:00Z',
    });
    expect(state.pending['shoecase']).toBe(true);

    state = reducer(state, {
      type: 'action/response',
      characterId: 'shoecase',
      response: {
        message: {
          id: 'm_3',
          characterId: 'shoecase',
          role: 'character',
          text: '네.',
          kind: 'normal',
          at: '2026-08-20T09:00:01Z',
        },
      },
    });
    expect(state.pending['shoecase']).toBe(false);
  });

  it('is cleared on failure, and the failure reads as the character speaking', () => {
    let state = reducer(loaded(), {
      type: 'message/sent',
      characterId: 'shoecase',
      text: '건조해줘',
      at: '2026-08-20T09:00:00Z',
    });
    state = reducer(state, {
      type: 'action/failed',
      characterId: 'shoecase',
      text: '지금은 대답을 못 하겠어요.',
      at: '2026-08-20T09:00:05Z',
    });

    expect(state.pending['shoecase']).toBe(false);
    const last = state.messages['shoecase']!.at(-1)!;
    expect(last.role).toBe('character');
    expect(last.kind).toBe('failure');
  });
});

// ---------------------------------------------------------------------------
// FE-R-16 and FE-R-15: revise in place, retire out of the list.
// ---------------------------------------------------------------------------

describe('skill lifecycle', () => {
  const first: Skill = {
    id: 'sk_1',
    characterId: 'shoecase',
    name: '화목 저녁 운동화 관리',
    tier: 'basic',
    kind: 'action',
    reason: '14일 관찰.',
    status: 'active',
    discoveredAt: '2026-08-19T11:00:00Z',
    revisedAt: null,
  };
  const second: Skill = { ...first, id: 'sk_2', name: '주말 러닝 준비', tier: 'advanced' };

  function withSkills(): State {
    return reducer(loaded(), {
      type: 'character/detailLoaded',
      characterId: 'shoecase',
      deviceStats: null,
      skills: [first, second],
    });
  }

  it('replaces a revised skill in place, keeping its position and id', () => {
    const state = reducer(withSkills(), {
      type: 'action/response',
      characterId: 'shoecase',
      response: {
        message: {
          id: 'm_4',
          characterId: 'shoecase',
          role: 'character',
          text: '조건을 바꿨어요.',
          kind: 'normal',
          at: '2026-08-20T09:02:00Z',
        },
        skill: { ...first, revisedAt: '2026-08-20T09:02:00Z' },
      },
    });

    const list = activeSkills(state, 'shoecase');
    expect(list).toHaveLength(2);
    // Position preserved: a card that jumps to the end of the list reads as a
    // replacement, which is what FE-R-16 exists to prevent.
    expect(list[0]!.id).toBe('sk_1');
    expect(list[0]!.revisedAt).toBe('2026-08-20T09:02:00Z');
  });

  it('removes a retired skill from the active list', () => {
    const state = reducer(withSkills(), {
      type: 'action/response',
      characterId: 'shoecase',
      response: {
        message: {
          id: 'm_5',
          characterId: 'shoecase',
          role: 'character',
          text: '더 이상 제안하지 않을게요.',
          kind: 'normal',
          at: '2026-08-20T09:03:00Z',
        },
        skill: { ...first, status: 'retired' },
      },
    });

    expect(activeSkills(state, 'shoecase').map((s) => s.id)).toEqual(['sk_2']);
  });
});

// ---------------------------------------------------------------------------
// FE-R-28 and FE-R-29: the badge.
// ---------------------------------------------------------------------------

describe('announcements', () => {
  function announcement(characterId: string): SkillDiscoveredEvent {
    return {
      characterId,
      message: {
        id: `sse_${characterId}`,
        characterId,
        role: 'character',
        text: '스킬을 하나 만들었어요.',
        kind: 'announcement',
        skillId: `sk_${characterId}`,
        at: '2026-08-20T09:05:00Z',
      },
      skill: {
        id: `sk_${characterId}`,
        characterId,
        name: '새 스킬',
        tier: 'basic',
        kind: 'action',
        reason: '패턴을 봤어요.',
        status: 'active',
        discoveredAt: '2026-08-20T09:05:00Z',
        revisedAt: null,
      },
      progression: { level: 4, exp: 0, expToNext: 300, leveledUp: true },
    };
  }

  it('raises no badge and plays the effect when the character is on screen', () => {
    const state = reducer(loaded(), { type: 'sse/announcement', event: announcement('shoecase') });

    expect(state.unseen['shoecase']).toBeUndefined();
    expect(state.levelUp['shoecase']).toBe(true);
    expect(activeSkills(state, 'shoecase')).toHaveLength(1);
  });

  it('raises a badge and does not queue the effect when the character is elsewhere', () => {
    const state = reducer(loaded(), { type: 'sse/announcement', event: announcement('pral') });

    expect(state.unseen['pral']).toBe(1);
    // Deliberately not queued: it happened while the user was elsewhere, and
    // replaying it on arrival would assert a timing that did not occur.
    expect(state.levelUp['pral']).toBeUndefined();
    // The skill and progression are applied anyway, so they are correct on arrival.
    expect(activeSkills(state, 'pral')).toHaveLength(1);
    expect(state.characters.find((c) => c.id === 'pral')!.level).toBe(4);
    expect(unseenTotalExcept(state, 'shoecase')).toBe(1);
  });

  it('clears the badge only when that character is opened', () => {
    let state = reducer(loaded(), { type: 'sse/announcement', event: announcement('pral') });
    state = reducer(state, { type: 'view/back' });
    expect(state.unseen['pral']).toBe(1);

    state = reducer(state, { type: 'character/select', characterId: 'pral' });
    expect(state.unseen['pral']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// FE-R-21 and FE-R-23: input handling.
// ---------------------------------------------------------------------------

describe('input', () => {
  it('rejects empty and whitespace-only input', () => {
    expect(isSendable('')).toBe(false);
    expect(isSendable('   ')).toBe(false);
    expect(isSendable('\n\t ')).toBe(false);
    expect(isSendable(' 건조 ')).toBe(true);
  });

  it('collapses whitespace runs', () => {
    expect(normalizeInput('  운동화   30분만\n\n건조해줘  ')).toBe('운동화 30분만 건조해줘');
  });

  it('places a transcript in the draft rather than dispatching it', () => {
    const state = reducer(loaded(), { type: 'transcript/ready', text: '운동화 30분만 건조해줘' });
    expect(state.draft).toBe('운동화 30분만 건조해줘');
    expect(state.micStatus).toBe('idle');
    // Nothing was sent: no message appended, no pending set.
    expect(state.messages['shoecase']).toBeUndefined();
    expect(state.pending['shoecase']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Generic stat rendering: an unknown key stays visible.
// ---------------------------------------------------------------------------

describe('generic attribute rendering', () => {
  it('humanises a key BE added that FE has no label for', () => {
    expect(attributeLabel('reclineAngle', 'ko')).toBe('Recline Angle');
    expect(attributeLabel('uv_cycle_count', 'en')).toBe('Uv cycle count');
    expect(attributeLabel('power', 'ko')).toBe('전원');
  });

  it('falls back to the key itself when humanising yields nothing', () => {
    expect(resolveLabel('_', {})).toBe('_');
  });

  it('renders booleans as words rather than as true and false', () => {
    expect(attributeValue(true, 'ko')).toBe('켜짐');
    expect(attributeValue(false, 'en')).toBe('Off');
    expect(attributeValue(25, 'ko')).toBe('25');
    expect(attributeValue('dry', 'ko')).toBe('건조');
    // An unknown value passes through, for the same reason unknown keys do.
    expect(attributeValue('turbo', 'ko')).toBe('turbo');
  });
});

// ---------------------------------------------------------------------------
// Today's context: the reason behind a recommendation, shown to the user.
// ---------------------------------------------------------------------------

describe("today's context", () => {
  const rainyDay: DailyContextStats = {
    weather: 'rain',
    steps: 3_280,
    distanceKm: 2.394,
    screenTimeMinutes: 194,
    observedAt: '2026-08-21T09:00:00Z',
  };

  it('formats each reading so it reads as the figure it is', () => {
    const chips = contextChips({ ...rainyDay, steps: 14_260 }, 'ko');
    const by = (key: string) => chips.find((c) => c.key === key)!;

    expect(by('weather').value).toBe('비');
    // Grouped, because "14260 걸음" is a number and "14,260 걸음" is a day's walking.
    expect(by('steps').value).toBe('14,260');
    expect(by('steps').unit).toBe('걸음');
    expect(by('distance').value).toBe('2.4');
    expect(by('distance').unit).toBe('km');
    // 194 minutes is three and a bit hours, and that is how phone time is felt.
    expect(by('screenTime').value).toBe('3시간 14분');
    // No unit: "3시간 14분" already carries its own.
    expect(by('screenTime').unit).toBeUndefined();
  });

  it('drops the hours part below an hour, in both languages', () => {
    const brief = { ...rainyDay, screenTimeMinutes: 48 };
    expect(contextChips(brief, 'ko').find((c) => c.key === 'screenTime')!.value).toBe('48분');
    expect(contextChips(brief, 'en').find((c) => c.key === 'screenTime')!.value).toBe('48m');
  });

  it('is held once, not per character', () => {
    let state = loaded();
    state = reducer(state, { type: 'context/loaded', context: rainyDay });

    // Switching character does not touch it: one user, one phone, one reading.
    state = reducer(state, { type: 'character/select', characterId: 'pral' });
    expect(state.dailyContext).toEqual(rainyDay);
    expect(state.contextFailed).toBe(false);
  });

  it('keeps the last good reading when a refetch fails', () => {
    let state = reducer(loaded(), { type: 'context/loaded', context: rainyDay });
    state = reducer(state, { type: 'context/failed' });

    // Blanking it would read as "you didn't move today", which is a claim the
    // failure never made.
    expect(state.dailyContext).toEqual(rainyDay);
    expect(state.contextFailed).toBe(true);
  });

  it('reports a first-load failure as a failure, not as still loading', () => {
    const state = reducer(loaded(), { type: 'context/failed' });
    expect(state.dailyContext).toBeNull();
    expect(state.contextFailed).toBe(true);
  });

  it('never lands in the device panel', () => {
    // FE-R-1's neighbour: a phone reading and a device reading have separate
    // destinations, and there is no action that can put one in the other's slot.
    const state = reducer(loaded(), { type: 'context/loaded', context: rainyDay });
    expect(statsFor(state, 'shoecase')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// FE-R-25: switching language rewrites nothing that already exists.
// ---------------------------------------------------------------------------

describe('language switch', () => {
  it('leaves skill names and past messages alone', () => {
    let state = reducer(loaded(), {
      type: 'character/detailLoaded',
      characterId: 'shoecase',
      deviceStats: null,
      skills: [
        {
          id: 'sk_1',
          characterId: 'shoecase',
          name: '화목 저녁 운동화 관리',
          tier: 'basic',
          kind: 'action',
          reason: '14일 관찰.',
          status: 'active',
          discoveredAt: '2026-08-19T11:00:00Z',
          revisedAt: null,
        },
      ],
    });
    state = reducer(state, {
      type: 'message/sent',
      characterId: 'shoecase',
      text: '건조해줘',
      at: '2026-08-20T09:00:00Z',
    });

    const before = { skill: activeSkills(state, 'shoecase')[0]!.name, message: state.messages['shoecase']![0]!.text };
    state = reducer(state, { type: 'lang/toggle' });

    expect(state.lang).toBe('en');
    expect(activeSkills(state, 'shoecase')[0]!.name).toBe(before.skill);
    expect(state.messages['shoecase']![0]!.text).toBe(before.message);
  });
});

// ---------------------------------------------------------------------------
// Q6 D: feedback started from a card.
// ---------------------------------------------------------------------------

describe('feedback context', () => {
  it('closes the compendium and binds the skill', () => {
    let state = reducer(loaded(), { type: 'compendium/toggle', open: true });
    state = reducer(state, { type: 'feedback/start', skillId: 'sk_1' });

    expect(state.compendiumOpen).toBe(false);
    expect(state.feedbackSkillId).toBe('sk_1');
  });

  it('clears after the response lands', () => {
    let state = reducer(loaded(), { type: 'feedback/start', skillId: 'sk_1' });
    state = reducer(state, {
      type: 'action/response',
      characterId: 'shoecase',
      response: {
        message: {
          id: 'm_6',
          characterId: 'shoecase',
          role: 'character',
          text: '바꿨어요.',
          kind: 'normal',
          at: '2026-08-20T09:06:00Z',
        },
      },
    });
    expect(state.feedbackSkillId).toBeNull();
  });
});
