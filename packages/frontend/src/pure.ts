/**
 * The unit's pure functions.
 *
 * NFR-3.1 scopes property-based testing to pure functions and serialization
 * round-trips. FE has no serialization, so this file is the whole of FE's PBT
 * surface. Properties are listed in
 * `aidlc-docs/construction/fe/functional-design/business-rules.md`.
 *
 * No imports on purpose: everything here is input-in, value-out.
 */

/** FE-R-23. Counted in code points, not UTF-16 units. */
export const INPUT_MAX_LENGTH = 500;

/** Show the counter once the user is this close to the cap. */
export const INPUT_WARN_AT = INPUT_MAX_LENGTH - 50;

/**
 * FE-R-23: trim, collapse runs of whitespace, cap length.
 *
 * Idempotent: `normalizeInput(normalizeInput(x)) === normalizeInput(x)`.
 *
 * The trailing `.trim()` is what makes that true. Slicing at the cap can land
 * on a space, and without the second trim a second pass would remove it and
 * produce a different result.
 *
 * Slicing over code points rather than UTF-16 units keeps the cap meaningful
 * for Korean and for anything outside the BMP, and avoids cutting a surrogate
 * pair in half. Same amount of code either way, so it may as well be the one
 * that is correct on the edges.
 */
export function normalizeInput(raw: string): string {
  const collapsed = raw.replace(/\s+/g, ' ').trim();
  return [...collapsed].slice(0, INPUT_MAX_LENGTH).join('').trim();
}

/** FE-R-23. Empty and whitespace-only input is not sent. */
export function isSendable(raw: string): boolean {
  return normalizeInput(raw).length > 0;
}

/** Code-point length, so it agrees with how `normalizeInput` counts. */
export function inputLength(raw: string): number {
  return [...raw].length;
}

/**
 * Exp bar fill, always within [0, 1].
 *
 * FE does not derive `level` from `exp` - BE owns the curve (FE-R-2 rationale).
 * This only turns two numbers BE returned into a bar width.
 *
 * Guards exist because a bar width outside [0, 1] renders as a visual glitch on
 * the most-looked-at element on screen, and `expToNext` arriving as 0 for a
 * max-level character is an ordinary case rather than an error.
 */
export function progressRatio(exp: number, expToNext: number): number {
  if (!Number.isFinite(exp) || !Number.isFinite(expToNext) || expToNext <= 0) {
    return 0;
  }
  return Math.min(1, Math.max(0, exp / expToNext));
}

/** Cosmetic exp gain for an ordinary successful message. See `applyExpBump`. */
export const MESSAGE_EXP_GAIN = 15;

/** Cosmetic exp gain for a skill discovery. Bigger, since it is the rarer event. */
export const DISCOVERY_EXP_GAIN = 40;

/**
 * Local, cosmetic-only progression bump for a successful interaction.
 *
 * BE (construction/be, PR #7) sends no progression data at all - no level, no
 * exp, no curve - so a response's `progression` field is never populated by a
 * real reply. `state.ts` falls back to this so the level/exp UI keeps moving
 * instead of sitting dead, rather than because BE reported anything. Nothing
 * produced here is ever presented as data BE stated as fact.
 *
 * Growth factor and gain amounts are arbitrary demo pacing, not a curve BE
 * owns - contrast with `progressRatio`, which only ever renders numbers
 * supplied to it.
 */
export function applyExpBump(
  character: { level: number; exp: number; expToNext: number },
  amount: number,
): { level: number; exp: number; expToNext: number; leveledUp: boolean } {
  const { level, exp, expToNext } = character;
  if (!Number.isFinite(expToNext) || expToNext <= 0) {
    // Nothing to fill toward - leave it exactly as it was rather than growing
    // a curve BE never described.
    return { level, exp, expToNext, leveledUp: false };
  }
  const nextExp = exp + amount;
  if (nextExp < expToNext) {
    return { level, exp: nextExp, expToNext, leveledUp: false };
  }
  return {
    level: level + 1,
    exp: nextExp - expToNext,
    expToNext: Math.round(expToNext * 1.4),
    leveledUp: true,
  };
}

/**
 * Turn an unknown device attribute key into something readable.
 *
 * FR-1.5 makes device state per-product, and BE owns the key vocabulary, so FE
 * will meet keys it has no label for. Hiding them would make a BE-side addition
 * invisible; humanising them makes it merely unpolished.
 *
 * Falls back to the key itself when humanising would produce nothing, which is
 * what keeps the "never empty for a non-empty key" property true for input like
 * `"_"`.
 */
export function humanizeKey(key: string): string {
  const humanized = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (humanized.length === 0) {
    return key;
  }
  return humanized.charAt(0).toUpperCase() + humanized.slice(1);
}

/**
 * Look a key up in a label table, humanising it when absent.
 *
 * Takes the table as an argument rather than importing one, so this stays pure
 * and testable without pulling the string dictionary in.
 */
export function resolveLabel(key: string, labels: Record<string, string>): string {
  return labels[key] ?? humanizeKey(key);
}

// ---------------------------------------------------------------------------
// Daily-context formatting. The numeric half only - the language-dependent
// half lives in `strings.ts`, same split as `resolveLabel`/`attributeLabel`.
//
// These matter more than their size suggests: today's figures are the REASON
// the character gives for a recommendation, and a reason the user has to squint
// at is not doing its job. `14260` and `14,260 걸음` are the same datum and
// only one of them reads as a day's walking.
// ---------------------------------------------------------------------------

/**
 * Thousands separators, written out rather than delegated to
 * `toLocaleString()`.
 *
 * The locale version would put the browser's locale in charge of a value FE
 * formats itself for a chosen `lang`, so ko/en could disagree with each other
 * on the same machine for reasons neither the code nor a test can see.
 *
 * Non-finite input returns "-": a step count that failed to arrive should read
 * as absent, not as "NaN".
 */
export function groupThousands(value: number): string {
  if (!Number.isFinite(value)) return '-';
  const rounded = Math.round(Math.abs(value));
  const sign = value < 0 ? '-' : '';
  const digits = String(rounded);
  let grouped = '';
  for (let i = 0; i < digits.length; i++) {
    // Comma before every digit whose distance from the end is a multiple of 3.
    if (i > 0 && (digits.length - i) % 3 === 0) grouped += ',';
    grouped += digits[i];
  }
  return sign + grouped;
}

/** One decimal place, as a string, so "5.0" keeps its zero instead of becoming "5". */
export function toTenth(value: number): string {
  if (!Number.isFinite(value)) return '-';
  return (Math.round(value * 10) / 10).toFixed(1);
}

/**
 * Minutes into hours and minutes, for screen time.
 *
 * Kept separate from the wording so the arithmetic is testable without a
 * language: 194 -> { hours: 3, minutes: 14 } is true in both.
 *
 * Negative or non-finite input collapses to zero rather than producing a
 * negative hour count - there is no reading this display could give for "minus
 * two hours of phone use" that is better than "0분".
 */
export function splitDuration(totalMinutes: number): { hours: number; minutes: number } {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) {
    return { hours: 0, minutes: 0 };
  }
  const whole = Math.round(totalMinutes);
  return { hours: Math.floor(whole / 60), minutes: whole % 60 };
}

/**
 * A reading's progress toward a goal, as 0..1, for a ring gauge.
 *
 * Clamped at 1 rather than allowed to overflow: past the goal the ring is full
 * and the exact figure is already printed beside it, so a 1.4 would either draw
 * a second lap nobody can read or silently overwrite the first. The goal being
 * MET is the thing the ring communicates.
 *
 * Returns 0 for non-finite input and for a goal of zero or less. That is the
 * same "absent reads as absent" choice `groupThousands` makes with "-": an
 * empty ring is honest about having nothing to show, where NaN in a
 * `stroke-dasharray` silently drops the stroke and leaves no ring at all.
 */
export function ringRatio(value: number, goal: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(goal) || goal <= 0) return 0;
  if (value <= 0) return 0;
  return Math.min(value / goal, 1);
}

/**
 * A whole-degree temperature, for the weather widget's headline.
 *
 * Rounded rather than given a decimal, because that is how a temperature is
 * read at a glance, and signed input has to survive: `-8` is a real reading.
 * `Math.round` is deliberate over `Math.trunc` - truncating would report -7.6°C
 * as -7°, which is warmer than the truth.
 */
export function toWholeDegrees(value: number): string {
  if (!Number.isFinite(value)) return '-';
  return String(Math.round(value));
}
