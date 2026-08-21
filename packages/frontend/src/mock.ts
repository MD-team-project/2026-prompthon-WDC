/**
 * The mock backend.
 *
 * The dependency document names this - including the fake SSE stream - as the
 * single most consequential item in the whole build plan. Without it FE waits on
 * BE and roughly a third of team capacity idles.
 *
 * Q2 A: in-process, behind the same `ApiClient` interface, selected by an env
 * flag. Zero extra processes, zero extra dependencies.
 *
 * Canned responses, matching `device-stub`'s stated nature. No state machine, no
 * clock model, no lifecycle events. Enough behaviour to prove the seams.
 *
 * Three things it deliberately does:
 *   1. Emits announcements for ALL THREE characters, not just the visible one.
 *      A mock that only fires for the character on screen would make the badge
 *      flow untestable, and that flow is why Q14 was asked.
 *   2. Clamps, so FE-R-1 has something to be checked against by hand as well as
 *      in the unit test.
 *   3. Exposes failure and connection-drop triggers rather than firing them on a
 *      schedule - see the note on `__mock`.
 */

import type {
  Character,
  ChatMessage,
  DailyContextStats,
  DeviceStats,
  Lang,
  Skill,
  SkillDiscoveredEvent,
} from "@prompthon/shared";
import type { ApiClient, EventHandlers, GetLang } from "./api";
import { CHARACTER_DEFAULTS } from "./characters";

/** The device's own limit. The clamp the demo puts in front of judges. */
const DEVICE_MINUTE_LIMIT = 25;

// Own mutable clone: this module writes through `character.exp` etc as its
// in-memory store, and that must not reach back into the shared config.
const characters: Character[] = structuredClone(CHARACTER_DEFAULTS);

/**
 * Per-product attribute shapes, on purpose.
 *
 * FR-1.5: beyond power, each product exposes whatever attributes it actually
 * has. Three different shapes here is what exercises the generic renderer, and a
 * mock with one uniform shape would let a hardcoded layout pass unnoticed.
 */
const deviceState: Record<string, DeviceStats> = {
  pral: {
    characterId: "pral",
    attributes: [
      { key: "power", value: false },
      { key: "mode", value: "care" },
      { key: "intensity", value: 2 },
    ],
    observedAt: "2026-08-20T09:00:00Z",
  },
  shoecase: {
    characterId: "shoecase",
    attributes: [
      { key: "power", value: true },
      { key: "mode", value: "idle" },
      { key: "remainingMinutes", value: 0, unit: "min" },
    ],
    observedAt: "2026-08-20T09:00:00Z",
  },
  massagechair: {
    characterId: "massagechair",
    attributes: [
      { key: "power", value: false },
      { key: "program", value: "idle" },
      { key: "intensity", value: 1 },
      // A key with no label in the dictionary, so the humanising fallback is
      // visible during development rather than only in a test.
      { key: "reclineAngle", value: 15, unit: "deg" },
    ],
    observedAt: "2026-08-20T09:00:00Z",
  },
};

/**
 * Today's context, mirroring device-stub's presets so the mock and the real
 * backend tell the same stories (see `dailyContext.ts` there). `rain` is the
 * default in both, for the same reason: it agrees with the seeded history
 * rather than arguing with it.
 *
 * Switchable at runtime through `__mock.context(...)` below, which is what
 * makes the three recommendation stories rehearsable without a backend.
 */
const CONTEXT_SCENARIOS = {
  rain: { weather: "rain", temperatureC: 24, steps: 3_280, distanceKm: 2.4, screenTimeMinutes: 194 },
  walk: { weather: "clear", temperatureC: 27, steps: 14_260, distanceKm: 10.4, screenTimeMinutes: 62 },
  screen: { weather: "cloudy", temperatureC: 22, steps: 4_150, distanceKm: 3.0, screenTimeMinutes: 268 },
  clear: { weather: "clear", temperatureC: 26, steps: 6_900, distanceKm: 5.0, screenTimeMinutes: 88 },
} as const satisfies Record<string, Omit<DailyContextStats, "observedAt">>;

type ContextScenario = keyof typeof CONTEXT_SCENARIOS;

let contextScenario: ContextScenario = "rain";

/** Triggered, not scheduled - same reasoning as the failure triggers below. */
let contextShouldFail = false;

/** `observedAt` is stamped at read time, so it is never a timestamp from last week. */
function currentContext(): DailyContextStats {
  return { ...CONTEXT_SCENARIOS[contextScenario], observedAt: new Date().toISOString() };
}

const skills: Record<string, Skill[]> = {
  pral: [],
  shoecase: [
    {
      id: "sk_pre_1",
      characterId: "shoecase",
      name: "화목 저녁 운동화 관리",
      tier: "basic",
      kind: "action",
      reason:
        "지난 14일 동안 화요일과 목요일 저녁에 운동화를 넣으시는 걸 봤어요.",
      status: "active",
      discoveredAt: "2026-08-19T11:00:00Z",
      revisedAt: null,
    },
  ],
  massagechair: [],
};

/** Announcements the fake stream delivers, one per character, once each. */
const scriptedDiscoveries: Array<{
  delayMs: number;
  event: SkillDiscoveredEvent;
}> = [
  {
    delayMs: 8_000,
    event: {
      characterId: "pral",
      message: {
        id: "sse_1",
        characterId: "pral",
        role: "character",
        text: "주중 밤 11시 전후로 케어를 하시는 패턴이 보여서, 그 시간에 맞춘 스킬을 하나 만들었어요.",
        kind: "announcement",
        skillId: "sk_pral_1",
        at: "2026-08-20T09:00:08Z",
      },
      skill: {
        id: "sk_pral_1",
        characterId: "pral",
        name: "평일 밤 케어 루틴",
        tier: "basic",
        kind: "action",
        reason:
          "14일 중 9일, 밤 10시 50분에서 11시 20분 사이에 케어를 시작하셨어요.",
        status: "active",
        discoveredAt: "2026-08-20T09:00:08Z",
        revisedAt: null,
      },
    },
  },
  {
    delayMs: 20_000,
    event: {
      characterId: "massagechair",
      message: {
        id: "sse_2",
        characterId: "massagechair",
        role: "character",
        text: "두 달치 기록을 보니 비 오는 날마다 목 프로그램을 더 오래 쓰셨더라고요. 그걸 스킬로 묶어봤어요.",
        kind: "announcement",
        skillId: "sk_chair_1",
        at: "2026-08-20T09:00:20Z",
      },
      skill: {
        id: "sk_chair_1",
        characterId: "massagechair",
        name: "흐린 날 목 집중 케어",
        tier: "advanced",
        kind: "buff",
        reason:
          "60일 기록에서 기압이 낮은 날 목 프로그램 사용 시간이 평균의 1.8배였어요.",
        status: "active",
        discoveredAt: "2026-08-20T09:00:20Z",
        revisedAt: null,
      },
    },
  },
  {
    delayMs: 34_000,
    event: {
      characterId: "shoecase",
      message: {
        id: "sse_3",
        characterId: "shoecase",
        role: "character",
        text: "주말 아침에 러닝화를 자주 꺼내시는 걸 보고, 금요일 밤에 미리 준비해두는 스킬을 만들었어요.",
        kind: "announcement",
        skillId: "sk_shoe_2",
        at: "2026-08-20T09:00:34Z",
      },
      skill: {
        id: "sk_shoe_2",
        characterId: "shoecase",
        name: "주말 러닝 준비",
        tier: "advanced",
        kind: "action",
        reason:
          "60일 동안 토요일 아침 러닝화 사용이 12번, 그 전날 밤 관리는 2번뿐이었어요.",
        status: "active",
        discoveredAt: "2026-08-20T09:00:34Z",
        revisedAt: null,
      },
    },
  },
];

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Enough latency for the in-flight marker to be visible while developing. */
const LATENCY_MS = 450;

function firstNumber(text: string): number | null {
  const match = text.match(/\d+/);
  return match ? Number(match[0]) : null;
}

let messageSeq = 0;

/** Simulated token pacing, for the same "typed out live" look the real BE stream gets. */
const STREAM_CHUNK_MS = 60;

/**
 * Streams `text` out in word-sized chunks via `onToken` (mirroring BE's real
 * `token` events) before resolving with the finished message, so mock mode
 * exercises the same streaming UI real BE does instead of only real BE.
 */
async function characterMessage(
  characterId: string,
  text: string,
  onToken?: (text: string) => void,
): Promise<ChatMessage> {
  messageSeq += 1;
  if (onToken) {
    const words = text.split(/(\s+)/).filter(Boolean);
    for (const word of words) {
      await wait(STREAM_CHUNK_MS);
      onToken(word);
    }
  }
  return {
    id: `mock_${messageSeq}`,
    characterId,
    role: "character",
    text,
    kind: "normal",
    at: new Date().toISOString(),
  };
}

/** Bump exp a little so the bar visibly moves on every interaction. */
function bumpExp(characterId: string) {
  const character = characters.find((c) => c.id === characterId);
  if (!character) return null;
  character.exp = Math.min(character.exp + 15, character.expToNext);
  return {
    level: character.level,
    exp: character.exp,
    expToNext: character.expToNext,
    leveledUp: false,
  };
}

function setAttribute(
  characterId: string,
  key: string,
  value: string | number | boolean,
) {
  const state = deviceState[characterId];
  if (!state) return;
  const existing = state.attributes.find((a) => a.key === key);
  if (existing) {
    existing.value = value;
  } else {
    state.attributes.push({ key, value });
  }
  state.observedAt = new Date().toISOString();
}

export function createMockClient(getLang: GetLang): ApiClient {
  return {
    async listCharacters() {
      await wait(LATENCY_MS);
      return structuredClone(characters);
    },

    async getDeviceState(characterId) {
      await wait(LATENCY_MS);
      const state = deviceState[characterId];
      if (!state) throw new Error(`no such character: ${characterId}`);
      return structuredClone(state);
    },

    async getTodayContext() {
      await wait(LATENCY_MS);
      if (contextShouldFail) throw new Error("mock context failure trigger");
      return currentContext();
    },

    async setContextScenario(scenario) {
      await wait(LATENCY_MS);
      contextScenario = scenario in CONTEXT_SCENARIOS ? scenario : "rain";
      return currentContext();
    },

    async listSkills(characterId) {
      await wait(LATENCY_MS);
      return structuredClone(skills[characterId] ?? []);
    },

    async sendMessage(characterId, text, skillId, onToken) {
      await wait(LATENCY_MS);
      const lang: Lang = getLang();

      // Deterministic failure trigger. See the note on scheduling below.
      if (/실패|fail/i.test(text)) {
        throw new Error("mock failure trigger");
      }

      // Feedback on a skill: revise it, keeping its id. FE-R-16.
      if (skillId) {
        const list = skills[characterId] ?? [];
        const target = list.find((s) => s.id === skillId);
        if (!target) throw new Error(`no such skill: ${skillId}`);

        const retiring = /그만|하지 ?마|stop|remove/i.test(text);
        const revised: Skill = {
          ...target,
          status: retiring ? "retired" : "active",
          reason: retiring
            ? target.reason
            : `${target.reason} 말씀해주신 대로 조건을 바꿨어요: "${text}"`,
          revisedAt: new Date().toISOString(),
        };
        skills[characterId] = list.map((s) => (s.id === skillId ? revised : s));

        return {
          message: await characterMessage(
            characterId,
            retiring
              ? lang === "ko"
                ? "알겠어요. 그 스킬은 이제 제안하지 않을게요."
                : "Understood. I won't suggest that one any more."
              : lang === "ko"
                ? "조건을 바꿨어요. 스킬은 그대로 두고 트리거만 손봤습니다."
                : "Adjusted the trigger. The skill itself is unchanged.",
            onToken,
          ),
          deviceState: null,
          progression: bumpExp(characterId),
          skill: structuredClone(revised),
        };
      }

      // The clamp. A number above the device's limit comes back clamped, while
      // the prose mentions both - which is exactly the shape FE-R-1 has to
      // survive.
      const requested = firstNumber(text);
      if (requested !== null) {
        const committed = Math.min(requested, DEVICE_MINUTE_LIMIT);
        setAttribute(characterId, "power", true);
        setAttribute(characterId, "mode", "dry");
        setAttribute(characterId, "remainingMinutes", committed);
        return {
          message: await characterMessage(
            characterId,
            lang === "ko"
              ? `${requested}분 말씀하셨는데 이 제품은 ${committed}분까지만 돼서 ${committed}분으로 맞췄어요.`
              : `You said ${requested} minutes, but this product caps at ${committed}, so I set ${committed}.`,
            onToken,
          ),
          deviceState: structuredClone(deviceState[characterId]!),
          progression: bumpExp(characterId),
          skill: null,
        };
      }

      setAttribute(characterId, "power", true);
      return {
        message: await characterMessage(
          characterId,
          lang === "ko" ? "네, 그렇게 해뒀어요." : "Done, that is set.",
          onToken,
        ),
        deviceState: structuredClone(deviceState[characterId]!),
        progression: bumpExp(characterId),
        skill: null,
      };
    },

    async invokeSkill(characterId, skillId) {
      await wait(LATENCY_MS);
      const target = (skills[characterId] ?? []).find((s) => s.id === skillId);
      if (!target) throw new Error(`no such skill: ${skillId}`);

      setAttribute(characterId, "power", true);
      setAttribute(characterId, "mode", "dry");
      setAttribute(characterId, "remainingMinutes", DEVICE_MINUTE_LIMIT);

      return {
        message: await characterMessage(
          characterId,
          getLang() === "ko"
            ? `"${target.name}" 실행했어요.`
            : `Ran "${target.name}".`,
        ),
        deviceState: structuredClone(deviceState[characterId]!),
        progression: bumpExp(characterId),
        skill: null,
      };
    },

    async transcribe(audio) {
      await wait(900);
      if (audio.size === 0) {
        throw new Error("empty audio");
      }
      // A fixed transcript, and deliberately a numeric one so the clamp path is
      // reachable by voice as well as by typing.
      return "운동화 30분만 건조해줘";
    },

    connectEvents(handlers: EventHandlers) {
      let disconnected = false;
      const timers: Array<ReturnType<typeof setTimeout>> = [];

      timers.push(setTimeout(() => !disconnected && handlers.onOpen(), 200));

      for (const { delayMs, event } of scriptedDiscoveries) {
        timers.push(
          setTimeout(() => {
            if (!disconnected) handlers.onAnnouncement(structuredClone(event));
          }, delayMs),
        );
      }

      // Dev-only handles. Failure and the connection drop are TRIGGERABLE rather
      // than scheduled, which is a deliberate departure from "the mock emits one
      // failure and one drop".
      //
      // Scheduling them means a rehearsal or a live demo can be sabotaged by a
      // timer nobody remembers setting. Triggering them exercises both failure
      // presentations on demand, which is the actual purpose.
      (window as unknown as { __mock?: unknown }).__mock = {
        announce: (index = 0) =>
          handlers.onAnnouncement(
            structuredClone(scriptedDiscoveries[index]!.event),
          ),
        // Today's context has no push channel, so switching the scenario only
        // shows up on the next fetch - go back to the roster and re-enter a
        // character (`App.tsx` refetches on select). Deliberately not wired to
        // an SSE event: BE has no such event either, and inventing one here
        // would make the mock the more capable of the two.
        context: (scenario: ContextScenario = "rain") => {
          contextScenario = scenario in CONTEXT_SCENARIOS ? scenario : "rain";
          contextShouldFail = false;
          return currentContext();
        },
        contextFail: (on = true) => {
          contextShouldFail = on;
        },
        drop: () => {
          handlers.onDrop();
          // Recovers on its own, so the banner clearing itself is observable too.
          timers.push(
            setTimeout(() => !disconnected && handlers.onOpen(), 4_000),
          );
        },
      };

      return () => {
        disconnected = true;
        for (const timer of timers) clearTimeout(timer);
      };
    },
  };
}
