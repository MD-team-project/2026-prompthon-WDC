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
import { INPUT_MAX_LENGTH, humanizeKey, normalizeInput, progressRatio, resolveLabel } from '../src/pure';
import { strings } from '../src/strings';
import { attributeKey, chatText, expPair } from './generators';

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
