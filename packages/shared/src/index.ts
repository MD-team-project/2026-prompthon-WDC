/**
 * Types FE and BE have actually agreed on.
 *
 * Deliberately thin. Per the interface evolution policy, only the transport is
 * fixed at design time; payload shapes are settled between FE and BE while
 * building. This file grows as they agree things, not before.
 */

export const PRODUCT_IDS = ["pral", "shoecase", "massagechair"] as const;
export type ProductId = (typeof PRODUCT_IDS)[number];

export type Language = "ko" | "en";

/**
 * Device state envelope. Only the fields common to all three products are
 * fixed here. Everything device-specific lives in `attributes`, which
 * device-stub defines and this contract does not constrain.
 */
export interface DeviceState {
  productId: ProductId;
  power: "on" | "off";
  attributes: Record<string, unknown>;
  updatedAt: string;
}

/** A capability the device exposes. The vocabulary skills are described against. */
export interface Capability {
  name: string;
  params: Record<string, ParamSpec>;
}

export interface ParamSpec {
  type: "number" | "string" | "boolean";
  min?: number;
  max?: number;
  enum?: string[];
}

/** Raw usage event. Sensitive class: never leaves the backend. */
export interface UsageEvent {
  eventId: string;
  productId: ProductId;
  event: string;
  at: string;
  params: Record<string, unknown>;
}

export const WEATHER_CONDITIONS = ["clear", "rain", "cloudy", "snow"] as const;
export type WeatherCondition = (typeof WEATHER_CONDITIONS)[number];

/**
 * One past day's app-level context - not device data, and not product-scoped
 * (one hardcoded demo user, so one record per day covers every product).
 * Mocked: no real weather / health-app / screen-time integration exists.
 *
 * ACCUMULATED HISTORY of these is the sensitive class, same as UsageEvent -
 * `data/appContext.ts`'s 60-day window is discovery-only and never leaves the
 * backend. `DailyContext` below is the deliberate exception and explains why.
 */
export interface AppContextEvent {
  date: string; // "YYYY-MM-DD", local date - see DailyContext
  distanceKm: number;
  /** Health-app step count for the day. Coherent with `distanceKm`. */
  steps: number;
  weather: WeatherCondition;
  screenTimeMinutes: number;
}

/** The same short text in both languages this project supports. */
export interface Bilingual {
  ko: string;
  en: string;
}

/**
 * Game-skill-style classification, decided at discovery time from which kind
 * of pattern was found: `buff` for a context-correlated pattern (a passive
 * trait that activates under a condition, e.g. weather), `action` for a plain
 * recurring pattern (a fixed routine the character can run on command).
 */
export type SkillKind = "buff" | "action";

/**
 * TODAY's single live reading of the same three mocked integrations, served by
 * device-stub (`GET /context/today`) rather than read out of stored history.
 *
 * Unlike the 60-day window this one IS user-facing: it is exposed to the
 * frontend (`GET /api/context/today`) and to the control agent. That is not a
 * loosening of FR-5.11 - what FR-5.11 protects is accumulated usage history
 * and the routines derived from it. Today's weather, today's step count and
 * today's phone time are the user's own current readings, shown back to the
 * person they belong to, which is what makes "it's raining, your neck will be
 * stiff" legible as a reason instead of arriving as an unexplained suggestion.
 * The history stays where it was.
 *
 * `date` is the LOCAL date, not the UTC slice of `observedAt` - "today's
 * steps" has to mean the user's today, and a KST early-morning reading would
 * land on yesterday under UTC.
 *
 * `temperatureC` is here and NOT on `AppContextEvent`, which is the one field
 * that differs between today and a stored day. It is a display concern: the
 * weather widget reads as a weather widget because it leads with a
 * temperature, where `weather: "rain"` alone is a category. Discovery never
 * needs it - it correlates on the CONDITION, and a degree value would only
 * add a near-continuous dimension for it to find spurious patterns in. Adding
 * it to `AppContextEvent` would also have made every seeded fixture row
 * (`fixtures/app-context-*.jsonl`) missing a required field.
 */
export interface DailyContext extends AppContextEvent {
  observedAt: string;
  /** Degrees Celsius. Signed - winter readings are legitimately negative. */
  temperatureC: number;
}

export function isWeatherCondition(value: string): value is WeatherCondition {
  return (WEATHER_CONDITIONS as readonly string[]).includes(value);
}

/**
 * A discovered skill is a Markdown document describing a new feature or mode,
 * derived from usage data. Steps and triggers are described in prose inside
 * `content` rather than held as structured fields.
 *
 * `title`/`kind`/`summary` are the front-matter-like metadata generated
 * alongside `content` at discovery time - the only part ever shown to FE.
 * `content` is the full analysis, agent-facing only (the control agent's
 * `getSkill` tool), never returned over the REST API.
 *
 * No status/retired flag: the control agent deletes the row outright via a
 * tool when the user wants a skill gone, rather than soft-deleting it.
 */
export interface SkillRecord {
  id: string;
  productId: ProductId;
  title: Bilingual;
  kind: SkillKind;
  /** ~3 short sentences, one language-appropriate line each - what FE shows. */
  summary: Bilingual;
  content: string;
  createdAt: string;
}

/** FE-facing view. Omits `content` - FE never sees the full analysis. */
export type SkillSummary = Omit<SkillRecord, "content">;

/**
 * Chat reply. `prose` is model-authored. `deviceState` is a structured device
 * response passed through, never composed by the model - this split is what
 * keeps displayed stats trustworthy.
 */
export interface AgentReply {
  prose: string;
  deviceState?: DeviceState;
  invokedSkillId?: string;
  failure?: Failure;
}

export interface Failure {
  code:
    | "MODEL_UNAVAILABLE"
    | "DEVICE_UNREACHABLE"
    | "SKILL_STEP_FAILED"
    | "NOT_FOUND"
    | "INVALID_REQUEST"
    | "INTERNAL";
  message: string;
}

export type DiscoveryPhase = "started" | "analysing" | "found" | "noPattern";

/** The discovery graph's actual nodes (discovery/graph.ts), in run order. */
export type DiscoveryNode = "loadWindow" | "findPattern" | "save";

/**
 * SSE carries Agentic Control output (per-chat-turn stream) plus Skill
 * Discovery progress and results (persistent per-product subscription,
 * since discovery runs in the background, not inside a chat turn).
 */
export type ControlEvent =
  | { type: "token"; text: string }
  | { type: "deviceState"; state: DeviceState }
  | { type: "done"; reply: AgentReply }
  | {
      type: "discoveryProgress";
      productId: ProductId;
      phase: DiscoveryPhase;
      node: DiscoveryNode;
      /** Only present on the loadWindow node - what it actually loaded, not a placeholder. */
      window?: { eventCount: number; contextDayCount: number };
    }
  | { type: "discoveryReasoning"; productId: ProductId; attempt: number; reasoning: string; response: string }
  | { type: "skillDiscovered"; productId: ProductId; skill: SkillSummary };

export function isProductId(value: string): value is ProductId {
  return (PRODUCT_IDS as readonly string[]).includes(value);
}
