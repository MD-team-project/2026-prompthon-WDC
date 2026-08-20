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
 * The id `step` places away from `currentId`, wrapping at both ends.
 *
 * Drives the stage swipe. Pure so the wrap-around is a unit test rather than a
 * thing discovered by swiping past the last character on stage.
 *
 * Returns null when there is nowhere to go - an unknown id, or a list too short
 * to have a neighbour - so the caller has one case to ignore rather than a
 * same-id "move" to detect.
 */
export function neighbourId(ids: string[], currentId: string, step: number): string | null {
  if (ids.length < 2 || !Number.isInteger(step) || step === 0) {
    return null;
  }
  const index = ids.indexOf(currentId);
  if (index === -1) {
    return null;
  }
  const size = ids.length;
  const next = (((index + step) % size) + size) % size;
  return next === index ? null : ids[next];
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
