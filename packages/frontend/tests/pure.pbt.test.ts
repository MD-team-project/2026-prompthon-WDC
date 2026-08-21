/**
 * Property-based tests.
 *
 * NFR-3.1 scopes PBT to pure functions and serialization round-trips. FE has no
 * serialization - it decodes responses and never encodes domain objects - so
 * round-trip properties are N/A here (PBT-02), recorded in
 * `business-rules.md` rather than left as an unexplained absence.
 *
 * What remains is four pure functions with genuine invariants (PBT-03).
 */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  INPUT_MAX_LENGTH,
  groupThousands,
  humanizeKey,
  normalizeInput,
  progressRatio,
  resolveLabel,
  ringRatio,
  splitDuration,
  toTenth,
  toWholeDegrees,
} from '../src/pure';
import { contextWidgets, screenTimeText, strings, weatherGlyph } from '../src/strings';
import { attributeKey, chatText, dailyContext, expPair, readingNumber } from './generators';

describe('normalizeInput', () => {
  // Idempotence. The property that caught the real bug: without the trailing
  // trim, slicing at the cap can land on a space and a second pass removes it.
  it('is idempotent', () => {
    fc.assert(
      fc.property(chatText(), (raw) => {
        const once = normalizeInput(raw);
        expect(normalizeInput(once)).toBe(once);
      }),
    );
  });

  it('never exceeds the cap, counted in code points', () => {
    fc.assert(
      fc.property(chatText(), (raw) => {
        expect([...normalizeInput(raw)].length).toBeLessThanOrEqual(INPUT_MAX_LENGTH);
      }),
    );
  });

  it('never leaves leading or trailing whitespace', () => {
    fc.assert(
      fc.property(chatText(), (raw) => {
        const out = normalizeInput(raw);
        expect(out).toBe(out.trim());
      }),
    );
  });
});

describe('progressRatio', () => {
  // Range invariant. A bar width outside [0, 1] is a visible glitch on the most
  // looked-at element on screen, and expToNext arriving as 0 for a max-level
  // character is ordinary rather than exceptional.
  it('always lands within [0, 1]', () => {
    fc.assert(
      fc.property(expPair(), ([exp, expToNext]) => {
        const ratio = progressRatio(exp, expToNext);
        expect(Number.isFinite(ratio)).toBe(true);
        expect(ratio).toBeGreaterThanOrEqual(0);
        expect(ratio).toBeLessThanOrEqual(1);
      }),
    );
  });
});

describe('resolveLabel', () => {
  it('never returns an empty string for a non-empty key', () => {
    fc.assert(
      fc.property(attributeKey(), (key) => {
        fc.pre(key.length > 0);
        expect(resolveLabel(key, {}).length).toBeGreaterThan(0);
        expect(humanizeKey(key).length).toBeGreaterThan(0);
      }),
    );
  });

  it('prefers the table over humanising when the key is known', () => {
    fc.assert(
      fc.property(attributeKey(), (key) => {
        fc.pre(key.length > 0);
        expect(resolveLabel(key, { [key]: 'Known' })).toBe('Known');
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// Daily-context formatting. Today's figures are the REASON the character gives
// for a recommendation, so a formatter that emits "NaN" or "-2시간" does not
// merely look wrong - it undermines the one claim the panel is there to make.
// ---------------------------------------------------------------------------

describe('groupThousands', () => {
  it('preserves the digits it was given, and only inserts commas', () => {
    fc.assert(
      fc.property(readingNumber(), (value) => {
        const out = groupThousands(value);
        if (!Number.isFinite(value)) {
          expect(out).toBe('-');
          return;
        }
        // Stripping the separators must give back the rounded magnitude - a
        // grouping bug that drops or duplicates a digit changes the number.
        expect(out.replace(/,/g, '').replace(/^-/, '')).toBe(String(Math.round(Math.abs(value))));
      }),
    );
  });

  it('groups in threes from the right, with no leading or doubled comma', () => {
    fc.assert(
      fc.property(readingNumber(), (value) => {
        fc.pre(Number.isFinite(value));
        const digits = groupThousands(value).replace(/^-/, '');
        expect(digits.startsWith(',')).toBe(false);
        expect(digits.endsWith(',')).toBe(false);
        expect(digits).not.toContain(',,');
        for (const group of digits.split(',').slice(1)) {
          expect(group).toHaveLength(3);
        }
      }),
    );
  });
});

describe('toTenth', () => {
  it('keeps exactly one decimal place and stays within rounding distance', () => {
    fc.assert(
      fc.property(readingNumber(), (value) => {
        const out = toTenth(value);
        if (!Number.isFinite(value)) {
          expect(out).toBe('-');
          return;
        }
        // "5.0" rather than "5": a distance that drops its decimal reads as a
        // different precision than the one beside it.
        expect(out).toMatch(/^-?\d+\.\d$/);
        // Half a tenth is the most rounding can move a value. The epsilon is
        // for the exact-half case: 0.95 rounds to 1.0 and the difference
        // measures as 0.050000000000000044 in binary floating point, which is
        // the representation talking, not the function being wrong.
        expect(Math.abs(Number(out) - value)).toBeLessThanOrEqual(0.05 + Number.EPSILON * 16);
      }),
    );
  });
});

describe('splitDuration', () => {
  it('never produces a negative or overflowing minute count', () => {
    fc.assert(
      fc.property(readingNumber(), (value) => {
        const { hours, minutes } = splitDuration(value);
        expect(Number.isInteger(hours)).toBe(true);
        expect(Number.isInteger(minutes)).toBe(true);
        expect(hours).toBeGreaterThanOrEqual(0);
        // 90 minutes must be "1시간 30분", never "0시간 90분".
        expect(minutes).toBeGreaterThanOrEqual(0);
        expect(minutes).toBeLessThan(60);
      }),
    );
  });

  it('conserves the total for any real reading', () => {
    fc.assert(
      fc.property(readingNumber(), (value) => {
        fc.pre(Number.isFinite(value) && value > 0);
        const { hours, minutes } = splitDuration(value);
        expect(hours * 60 + minutes).toBe(Math.round(value));
      }),
    );
  });
});

describe('ringRatio', () => {
  it('stays inside 0..1 for anything a reading can be', () => {
    fc.assert(
      fc.property(readingNumber(), readingNumber(), (value, goal) => {
        const ratio = ringRatio(value, goal);
        // A ratio outside this range is not a smaller or larger ring, it is a
        // `stroke-dasharray` that draws a second lap over the first or vanishes.
        expect(ratio).toBeGreaterThanOrEqual(0);
        expect(ratio).toBeLessThanOrEqual(1);
        expect(Number.isNaN(ratio)).toBe(false);
      }),
    );
  });

  it('fills exactly at the goal and stays full past it', () => {
    fc.assert(
      fc.property(fc.double({ min: 1, max: 100_000, noNaN: true }), (goal) => {
        expect(ringRatio(goal, goal)).toBe(1);
        expect(ringRatio(goal * 2, goal)).toBe(1);
        expect(ringRatio(0, goal)).toBe(0);
      }),
    );
  });
});

describe('toWholeDegrees', () => {
  it('keeps the sign of a below-zero reading', () => {
    fc.assert(
      // Bounded at -1, not at -0.5: `Math.round(-0.5)` is `-0` in JS and
      // `String(-0)` is "0", so anything in (-0.5, 0) legitimately renders
      // without a sign. Below -1 the sign always has to survive.
      fc.property(fc.double({ min: -40, max: -1, noNaN: true }), (below) => {
        expect(toWholeDegrees(below).startsWith('-')).toBe(true);
      }),
    );
  });

  it('never renders a placeholder as a number, or a number as a placeholder', () => {
    fc.assert(
      fc.property(readingNumber(), (value) => {
        const text = toWholeDegrees(value);
        expect(text).not.toContain('NaN');
        expect(text).toBe(Number.isFinite(value) ? String(Math.round(value)) : '-');
      }),
    );
  });
});

describe('contextWidgets', () => {
  it('always yields the three widgets, in a stable order, none blank', () => {
    fc.assert(
      fc.property(dailyContext(), fc.constantFrom('ko' as const, 'en' as const), (context, lang) => {
        const widgets = contextWidgets(context, lang);
        // Three fixed groupings over four integrations - a reading that silently
        // went missing would leave the character citing a figure nothing shows.
        expect(widgets.map((w) => w.key)).toEqual(['weather', 'movement', 'screen']);

        for (const widget of widgets) {
          expect(widget.label.length).toBeGreaterThan(0);

          // Every rendered string, whatever shape the widget is. Checked through
          // the union rather than over a common `value` field, because there
          // isn't one - that is the point of the union.
          const texts =
            widget.kind === 'weather'
              ? [widget.degrees, widget.condition]
              : widget.kind === 'duration'
                ? [widget.value]
                : widget.rings.flatMap((r) => [r.label, r.value, r.unit, r.goal]);

          for (const text of texts) {
            expect(text.length).toBeGreaterThan(0);
            expect(text).not.toContain('NaN');
            expect(text).not.toContain('undefined');
          }

          if (widget.kind === 'rings') {
            expect(widget.rings.map((r) => r.key)).toEqual(['steps', 'distance']);
            for (const ring of widget.rings) {
              expect(ring.ratio).toBeGreaterThanOrEqual(0);
              expect(ring.ratio).toBeLessThanOrEqual(1);
            }
          }
        }
      }),
    );
  });

  it('has a glyph for every weather condition', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('clear' as const, 'rain' as const, 'cloudy' as const, 'snow' as const),
        (weather) => {
          // The HUD button renders this as its only visible content, so a missing
          // entry would leave the control looking empty rather than mislabelled.
          expect(weatherGlyph(weather).length).toBeGreaterThan(0);
        },
      ),
    );
  });

  it('states the screen time in whichever language is active', () => {
    fc.assert(
      fc.property(dailyContext(), (context) => {
        const { hours, minutes } = splitDuration(context.screenTimeMinutes);
        expect(screenTimeText(context.screenTimeMinutes, 'ko')).toBe(
          hours > 0 ? `${hours}시간 ${minutes}분` : `${minutes}분`,
        );
        expect(screenTimeText(context.screenTimeMinutes, 'en')).toBe(
          hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`,
        );
      }),
    );
  });
});

describe('string dictionary', () => {
  // Structural invariant over the key space. A missing key renders as blank
  // interface text, and blank text on a demo screen reads as a broken build.
  it('has identical key sets in ko and en', () => {
    const koKeys = Object.keys(strings.ko);
    const enKeys = Object.keys(strings.en);
    expect(koKeys.length).toBe(enKeys.length);

    fc.assert(
      fc.property(fc.constantFrom(...koKeys), (key) => {
        expect(strings.en).toHaveProperty(key);
        expect(strings.ko).toHaveProperty(key);
      }),
    );
  });

  it('has no empty string in either language', () => {
    const koKeys = Object.keys(strings.ko) as Array<keyof typeof strings.ko>;
    fc.assert(
      fc.property(fc.constantFrom(...koKeys), fc.constantFrom('ko' as const, 'en' as const), (key, lang) => {
        expect(strings[lang][key].length).toBeGreaterThan(0);
      }),
    );
  });
});
