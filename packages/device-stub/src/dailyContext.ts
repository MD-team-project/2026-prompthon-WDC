/**
 * Canned daily context: weather, the health app's movement figures, and screen
 * time. Same nature as `canned.ts` - no simulation, no clock model, no drift.
 *
 * This lives in device-stub even though none of it comes from an appliance,
 * for the reason that put device state here in the first place: the backend
 * must ASK for it over HTTP, because then a recommendation the character makes
 * ("it rained today, your neck will be stiff") is grounded in a reading that
 * exists outside the model's memory rather than in something it inferred and
 * then asserted. The stub is the mock boundary for every integration the demo
 * pretends to have, not only the three appliances - so `/context/*` sits
 * beside `/devices/*` rather than under it, since none of this is
 * product-scoped (one demo user, one reading per day, all three characters
 * read the same one).
 */
import type { DailyContext, WeatherCondition } from "@prompthon/shared";
import { isWeatherCondition } from "@prompthon/shared";

/** One day's reading, without the date/timestamp the getter stamps on. */
interface Reading {
  weather: WeatherCondition;
  steps: number;
  distanceKm: number;
  screenTimeMinutes: number;
}

/**
 * Only used to author the presets below so `steps` and `distanceKm` never
 * contradict each other. Nothing derives one from the other at runtime - they
 * are two separate readings the health app reports, and a patch that sets just
 * one leaves the other alone (see `patchDailyContext`).
 */
const STEPS_PER_KM = 1370;

const km = (steps: number) => Math.round((steps / STEPS_PER_KM) * 10) / 10;

/**
 * The demo levers. Each preset makes exactly ONE recommendation obviously
 * correct, so a rehearsal can pick which of the three stories to tell without
 * editing code:
 *
 *   rain    wet, barely moved, on the phone a lot  -> neck / upper back
 *   walk    clear, walked a long way               -> legs and feet
 *   screen  indoors, very high phone time          -> neck / upper back
 *   clear   an unremarkable day                    -> nothing stands out
 *
 * `clear` is deliberately included: a character that finds a reason to
 * recommend something every single day is not reading context, it is just
 * talking, and there needs to be a setting that shows the difference.
 */
export const CONTEXT_SCENARIOS = ["rain", "walk", "screen", "clear"] as const;
export type ContextScenario = (typeof CONTEXT_SCENARIOS)[number];

const SCENARIOS: Record<ContextScenario, Reading> = {
  rain: { weather: "rain", steps: 3_280, distanceKm: km(3_280), screenTimeMinutes: 194 },
  walk: { weather: "clear", steps: 14_260, distanceKm: km(14_260), screenTimeMinutes: 62 },
  screen: { weather: "cloudy", steps: 4_150, distanceKm: km(4_150), screenTimeMinutes: 268 },
  clear: { weather: "clear", steps: 6_900, distanceKm: km(6_900), screenTimeMinutes: 88 },
};

function isScenario(value: string): value is ContextScenario {
  return (CONTEXT_SCENARIOS as readonly string[]).includes(value);
}

/**
 * Which preset boots. Defaults to `rain`, matching the seeded fixture story
 * (`app-context-rain.jsonl` + `massagechair-rain.jsonl`), so a fresh start has
 * today's reading agreeing with the pattern discovery finds in the history
 * rather than arguing with it.
 */
const DEFAULT_SCENARIO: ContextScenario = "rain";

function resolveBootScenario(): ContextScenario {
  const requested = process.env.CONTEXT_SCENARIO?.trim();
  if (!requested) return DEFAULT_SCENARIO;
  if (isScenario(requested)) return requested;
  // Loudly, not silently: a typo'd scenario that quietly falls back is a
  // rehearsal telling the wrong story with no visible cause.
  console.log(
    `[device-stub] unknown CONTEXT_SCENARIO "${requested}", using ${DEFAULT_SCENARIO}. Known: ${CONTEXT_SCENARIOS.join(", ")}`,
  );
  return DEFAULT_SCENARIO;
}

export const bootScenario: ContextScenario = resolveBootScenario();

let reading: Reading = { ...SCENARIOS[bootScenario] };

/** Local date, not `toISOString().slice(0, 10)` - see `DailyContext`. */
function localDate(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Stamped at read time rather than held with the reading, so `date` is always
 * genuinely today. A stored date goes stale the moment the process outlives
 * midnight, and a stale one silently breaks both the join-by-date in discovery
 * and "today's" relevance check - the kind of quiet failure that shows up as
 * the character having nothing to say.
 */
export function getDailyContext(): DailyContext {
  const now = new Date();
  return { date: localDate(now), observedAt: now.toISOString(), ...reading };
}

export function listScenarios(): Record<ContextScenario, Reading> {
  return SCENARIOS;
}

/** Switch to a named preset. Returns null for an unknown name. */
export function applyScenario(name: string): DailyContext | null {
  if (!isScenario(name)) return null;
  reading = { ...SCENARIOS[name] };
  return getDailyContext();
}

export function resetDailyContext(): DailyContext {
  reading = { ...SCENARIOS[bootScenario] };
  return getDailyContext();
}

/**
 * Merge individual field overrides, for the demo that needs one number nudged
 * rather than a whole preset.
 *
 * Out-of-range values are REJECTED here, unlike device commands, which clamp.
 * A clamp tells a story ("you asked for 30 minutes, the device gave you 25")
 * because the user requested the value. Nobody requests a step count; a
 * negative one is a caller bug, and silently turning it into 0 would hide it.
 */
export function patchDailyContext(
  patch: Record<string, unknown>,
): { context: DailyContext } | { error: string } {
  const next: Reading = { ...reading };

  for (const [key, value] of Object.entries(patch)) {
    if (key === "weather") {
      if (typeof value !== "string" || !isWeatherCondition(value)) {
        return { error: `weather must be one of clear, rain, cloudy, snow` };
      }
      next.weather = value;
      continue;
    }
    if (key === "steps" || key === "screenTimeMinutes" || key === "distanceKm") {
      const numeric = Number(value);
      if (!Number.isFinite(numeric) || numeric < 0) {
        return { error: `${key} must be a number of 0 or more` };
      }
      next[key] = numeric;
      continue;
    }
    return { error: `unknown field: ${key}` };
  }

  reading = next;
  return { context: getDailyContext() };
}
