/**
 * What the device panel's markup has to get right, since the styling hangs
 * entirely off two data attributes:
 *
 *   `data-power`   green/red border. Belongs to the power chip and nothing else -
 *                  a second chip carrying it would paint an unrelated reading as
 *                  a power state.
 *   `data-inactive` the dashed recessed treatment. Every chip EXCEPT power, and
 *                  only while the power is off. The power chip keeps its lift
 *                  because it is the chip explaining why the others lost theirs.
 *
 * Rendered with `react-dom/server`, already a dependency and needing no DOM - so
 * this adds neither jsdom nor a component-testing library, and the suite stays on
 * `environment: 'node'`. Assertions read each chip's opening tag rather than
 * matching on attribute order or on Korean labels, so reordering the JSX props or
 * relabelling a key does not break them.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { DeviceStats } from '@prompthon/shared';
import { DeviceStatStrip } from '../src/components/DeviceStatStrip';
import { translator } from '../src/strings';

/** `power` first, matching what `toDeviceStats` builds. */
function stats(power: boolean): DeviceStats {
  return {
    characterId: 'massagechair',
    attributes: [
      { key: 'power', value: power },
      { key: 'rollerZone', value: 'neck' },
      { key: 'intensity', value: 3 },
      { key: 'heat', value: true },
    ],
    observedAt: '2026-08-21T01:00:00Z',
  };
}

function render(deviceStats: DeviceStats | null): string {
  return renderToStaticMarkup(
    createElement(DeviceStatStrip, { deviceStats, pending: false, lang: 'ko', t: translator('ko') }),
  );
}

/** Each chip's opening tag, in DOM order. */
function chipTags(deviceStats: DeviceStats | null): string[] {
  return [...render(deviceStats).matchAll(/<div class="stat-chip"[^>]*>/g)].map((m) => m[0]);
}

function inactiveFlags(deviceStats: DeviceStats | null): boolean[] {
  return chipTags(deviceStats).map((tag) => tag.includes('data-inactive="true"'));
}

describe('DeviceStatStrip, power off', () => {
  it('recedes every chip but power', () => {
    expect(inactiveFlags(stats(false))).toEqual([false, true, true, true]);
  });

  it('leaves every chip active when the power is on', () => {
    expect(inactiveFlags(stats(true))).toEqual([false, false, false, false]);
  });

  it('renders no chips at all with nothing to report', () => {
    expect(chipTags(null)).toEqual([]);
  });
});

describe('DeviceStatStrip, power chip colour state', () => {
  it.each([
    [true, 'on'],
    [false, 'off'],
  ])('marks exactly one chip, the power one, as %s', (power, expected) => {
    const tagged = chipTags(stats(power)).filter((tag) => tag.includes('data-power='));
    expect(tagged).toHaveLength(1);
    expect(tagged[0]).toContain(`data-power="${expected}"`);
    // Never dimmed by the rule it is the cause of.
    expect(tagged[0]).toContain('data-inactive="false"');
  });

  it('states the power in words too, so colour is never the only signal', () => {
    expect(render(stats(false))).toContain('꺼짐');
    expect(render(stats(true))).toContain('켜짐');
  });
});
