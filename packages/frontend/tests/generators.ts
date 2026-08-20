/**
 * Domain generators.
 *
 * PBT-07: no bare primitive generator stands in for a domain-typed parameter.
 * `fc.string()` alone as "a user's chat message" produces mostly noise and finds
 * mostly nothing - the inputs that break `normalizeInput` are the ones that look
 * like real messages with real whitespace, not random bytes.
 *
 * Centralised here rather than duplicated per test file, per PBT-07.
 */

import fc from 'fast-check';
import type { DailyContextStats } from '@prompthon/shared';
import { INPUT_MAX_LENGTH } from '../src/pure';

const koWords = ['운동화', '건조', '30분만', '해줘', '지금', '너무', '일러', '평일', '저녁으로', '바꿔줘'];
const enWords = ['dry', 'my', 'shoes', 'for', 'thirty', 'minutes', 'too', 'early', 'weekday', 'evening'];

/** Whitespace that actually shows up in typed and pasted input. */
const whitespace = fc.constantFrom(' ', '  ', '\t', '\n', '\r\n', '\u00a0', '   \n  ');

/**
 * Chat text as a user would produce it: words joined by varied whitespace, with
 * leading and trailing whitespace, sometimes empty, sometimes far over the cap.
 */
export const chatText = (): fc.Arbitrary<string> =>
  fc.oneof(
    { weight: 6, arbitrary: buildSentence() },
    // Boundary cases worth including explicitly rather than hoping for.
    { weight: 1, arbitrary: fc.constantFrom('', ' ', '\n', '\t\t', '   \r\n   ') },
    { weight: 1, arbitrary: fc.string({ minLength: 0, maxLength: 40 }) },
    { weight: 1, arbitrary: overLongText() },
    // Astral-plane characters, so the code-point cap is actually exercised.
    { weight: 1, arbitrary: fc.array(fc.constantFrom('😀', '🧦', '🇰🇷'), { minLength: 1, maxLength: 30 }).map((a) => a.join(' ')) },
  );

function buildSentence(): fc.Arbitrary<string> {
  return fc
    .array(fc.constantFrom(...koWords, ...enWords), { minLength: 1, maxLength: 12 })
    .chain((words) =>
      fc.array(whitespace, { minLength: words.length + 1, maxLength: words.length + 1 }).map((gaps) => {
        let out = gaps[0]!;
        words.forEach((word, i) => {
          out += word + gaps[i + 1]!;
        });
        return out;
      }),
    );
}

function overLongText(): fc.Arbitrary<string> {
  return fc
    .integer({ min: INPUT_MAX_LENGTH, max: INPUT_MAX_LENGTH + 200 })
    .chain((length) => fc.array(fc.constantFrom('가', 'a', ' ', '😀'), { minLength: length, maxLength: length }))
    .map((chars) => chars.join(''));
}

/**
 * Exp values, constrained to the range progression actually produces, plus the
 * boundaries that matter: zero, equal, over, and a max-level character whose
 * `expToNext` is 0.
 */
export const expPair = (): fc.Arbitrary<[number, number]> =>
  fc.oneof(
    { weight: 6, arbitrary: fc.tuple(fc.integer({ min: 0, max: 500 }), fc.integer({ min: 1, max: 500 })) },
    { weight: 2, arbitrary: fc.tuple(fc.integer({ min: 0, max: 500 }), fc.constant(0)) },
    { weight: 1, arbitrary: fc.tuple(fc.integer({ min: -100, max: -1 }), fc.integer({ min: 1, max: 500 })) },
    { weight: 1, arbitrary: fc.tuple(fc.constantFrom(Number.NaN, Number.POSITIVE_INFINITY), fc.integer({ min: 1, max: 500 })) },
  );

/**
 * Device attribute keys. BE owns this vocabulary and it will change, so the
 * generator covers the shapes FE can meet rather than a fixed list: camelCase,
 * snake_case, kebab-case, single words, and the degenerate keys that break a
 * naive humaniser.
 */
export const attributeKey = (): fc.Arbitrary<string> =>
  fc.oneof(
    fc.constantFrom('power', 'mode', 'remainingMinutes', 'temperature', 'intensity', 'program'),
    fc.constantFrom('reclineAngle', 'uv_cycle_count', 'filter-life', 'waterLevelPct'),
    // Degenerate but non-empty: these are what make the fallback rule load-bearing.
    fc.constantFrom('_', '-', '__', '---', ' ', 'X'),
    fc
      .array(fc.constantFrom('a', 'B', 'c', '_', '-', '9'), { minLength: 1, maxLength: 12 })
      .map((chars) => chars.join('')),
  );

/**
 * Numbers the daily-context formatters have to survive.
 *
 * PBT-07 again: a bare `fc.double()` here would spend most of its runs on
 * values no health app produces. What matters is the plausible range, the
 * boundaries around a comma group and an hour, and the non-finite values that
 * arrive when a field is missing from a response - the formatters have explicit
 * fallbacks for those, and an untested fallback is how "NaN" reaches a screen.
 */
export const readingNumber = (): fc.Arbitrary<number> =>
  fc.oneof(
    { weight: 6, arbitrary: fc.integer({ min: 0, max: 40_000 }) },
    { weight: 2, arbitrary: fc.double({ min: 0, max: 40, noNaN: true }) },
    // Comma-group and hour boundaries, plus the values a rounding bug lands on.
    { weight: 2, arbitrary: fc.constantFrom(0, 1, 9, 10, 59, 60, 61, 99, 100, 999, 1_000, 1_001, 9_999, 10_000, 999_999, 1_000_000) },
    { weight: 1, arbitrary: fc.constantFrom(0.04, 0.05, 0.949, 0.95, 59.5, 1_000.5) },
    { weight: 1, arbitrary: fc.integer({ min: -5_000, max: -1 }) },
    { weight: 1, arbitrary: fc.constantFrom(Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY) },
  );

/** Well-formed readings, as `/api/context/today` actually returns them. */
export const dailyContext = (): fc.Arbitrary<DailyContextStats> =>
  fc.record({
    weather: fc.constantFrom('clear' as const, 'rain' as const, 'cloudy' as const, 'snow' as const),
    steps: fc.integer({ min: 0, max: 40_000 }),
    distanceKm: fc.double({ min: 0, max: 40, noNaN: true }),
    // 0 to a full day. 1440 is the only real cap on screen time.
    screenTimeMinutes: fc.integer({ min: 0, max: 1_440 }),
    observedAt: fc.constantFrom('2026-08-21T09:00:00Z', '2026-08-21T23:59:59+09:00'),
  });
