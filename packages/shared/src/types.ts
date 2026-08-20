/**
 * Shapes FE and BE have agreed on, as they agree them.
 *
 * SEEDED BY FE, 2026-08-20. These are FE's proposal from
 * `aidlc-docs/construction/fe/functional-design/backend-mock-contract.md`.
 * BE should change anything that is wrong or inconvenient - Application Design
 * deliberately left payload shapes unfixed, to be settled by FE and BE directly
 * during Construction.
 *
 * Two things here are NOT negotiable, because they come from requirements
 * rather than from convenience:
 *
 *  1. `deviceState` is a field of its own, never state values embedded in prose.
 *     FR-5.5. FE enforces it by having no function that turns a string into
 *     stats, and that only holds if the response separates them.
 *
 *  2. Nothing in this file carries the sensitive data class - accumulated usage
 *     history, derived routines, raw skill provenance. FR-5.11. `Skill.reason`
 *     is an agent-authored summary, not the observations behind it.
 */

export type Lang = 'ko' | 'en';

export type ProductId = 'pral' | 'shoecase' | 'massagechair';

export interface Character {
  id: string;
  productId: ProductId;
  name: string;
  level: number;
  exp: number;
  expToNext: number;
  /** Asset reference resolved by config, not a URL. Placeholder art for now. */
  artRef: string;
}

/**
 * One device attribute. `key` vocabulary is BE's to choose and is expected to
 * change in the per-product phase, which is why FE renders generically.
 */
export interface StatAttribute {
  key: string;
  value: string | number | boolean;
  unit?: string;
}

/**
 * Current device state, rendered as the character's stats.
 *
 * `attributes` is an ARRAY, not an object: its order is display order and BE
 * owns it. An object would lose the ordering and force FE to invent one.
 */
export interface DeviceStats {
  characterId: string;
  attributes: StatAttribute[];
  observedAt: string;
}

export type WeatherCondition = 'clear' | 'rain' | 'cloudy' | 'snow';

/**
 * Today's readings from the mocked phone-side integrations - weather, the
 * health app's movement figures, screen time. Not device state, and not
 * per-character: one user, one reading, the same one behind every character.
 *
 * TYPED, where `DeviceStats` above is a generic `StatAttribute[]`, and the
 * difference is not an inconsistency. Device attributes are per-product and BE
 * owns the vocabulary, so FE renders whatever arrives in whatever order. These
 * four fields are fixed by which integrations exist, and each needs its own
 * formatting to read as anything - `14260` is not a step count until it is
 * "14,260 걸음", and `194` is not phone time until it is "3시간 14분". A
 * generic renderer would show four bare numbers, so there is nothing for it to
 * buy here.
 *
 * These are displayed to the user because they are the REASON the character
 * gives for a suggestion. "It rained and you were on your phone for three
 * hours, so let's do the neck course" is only checkable if the user can see
 * the same three hours the character read.
 */
export interface DailyContextStats {
  weather: WeatherCondition;
  /** Degrees Celsius. Signed - winter readings are legitimately negative. */
  temperatureC: number;
  steps: number;
  distanceKm: number;
  screenTimeMinutes: number;
  observedAt: string;
}

export type SkillTier = 'basic' | 'advanced';

export type SkillStatus = 'active' | 'retired';

/**
 * Game-skill-style classification: `buff` activates automatically under a
 * condition (context-correlated - e.g. weather), `action` is a fixed routine
 * run on command (plain recurring, no condition).
 */
export type SkillKind = 'buff' | 'action';

export interface Skill {
  id: string;
  characterId: string;
  /** Stays in the language it was generated in. US-4.2 scenario 3. */
  name: string;
  tier: SkillTier;
  kind: SkillKind;
  /** Agent-authored summary of what motivated the skill. Not raw provenance. */
  reason: string;
  status: SkillStatus;
  discoveredAt: string;
  /** Set after feedback. Evidence the skill kept its identity. */
  revisedAt?: string | null;
}

export type MessageRole = 'user' | 'character' | 'system';

export type MessageKind = 'normal' | 'announcement' | 'failure';

export interface ChatMessage {
  id: string;
  characterId: string;
  role: MessageRole;
  /** The only textual field. Nothing parses it. */
  text: string;
  kind: MessageKind;
  /** Present on `announcement`. One announcement per skill. */
  skillId?: string | null;
  at: string;
}

export interface Progression {
  level: number;
  exp: number;
  expToNext: number;
  leveledUp: boolean;
}

/**
 * Response to anything the user initiates that can change device state.
 *
 * `message.text` and `deviceState` are separate fields and are never crossed.
 * That separation is the whole of FR-5.5.
 */
export interface ActionResponse {
  message: ChatMessage;
  /** Omitted when nothing changed. */
  deviceState?: DeviceStats | null;
  progression?: Progression | null;
  /** Present when the action revised or retired a skill. */
  skill?: Skill | null;
}

export interface SendMessageRequest {
  text: string;
  lang: Lang;
  /** Present when the message is feedback started from a skill card. */
  skillId?: string | null;
}

export interface TranscribeResponse {
  text: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}

/** The only SSE event FE needs today. Unknown event names are ignored. */
export interface SkillDiscoveredEvent {
  characterId: string;
  message: ChatMessage;
  skill: Skill;
  progression?: Progression | null;
}
