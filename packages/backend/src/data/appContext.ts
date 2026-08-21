// FR-5.11: SENSITIVE data class, same as usage.ts - only src/discovery/ may import this.
//
// That restriction is about the ACCUMULATED WINDOW, which is what reveals a
// routine. Today's single live reading is not held here at all - it is fetched
// from device-stub through `deviceAdapter.getDailyContext()` and is deliberately
// user-facing (see `DailyContext` in @prompthon/shared). So there is no
// "today" getter in this file: what used to be here read today out of the
// seeded history, which meant it returned null on every day the fixture didn't
// happen to cover - i.e. every day after the fixture was authored, silently
// disabling the proactive suggestion it fed.

// ponytail: in-memory store, not DynamoDB - same deferral as usage.ts/skills.ts.

import type { AppContextEvent, DailyContext } from "@prompthon/shared";

const context: AppContextEvent[] = [];

/** Not device data, so this never goes through device-stub or the discovery threshold. */
export function seedContext(incoming: AppContextEvent[]): number {
  context.push(...incoming);
  return incoming.length;
}

export function readContextWindow(days: number): AppContextEvent[] {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return context.filter((c) => new Date(c.date).getTime() >= cutoff);
}

/**
 * Swaps the ENTIRE context history for a scenario switch, same reasoning as
 * `replaceEvents` in usage.ts: the old scenario's weather/steps/screen-time
 * story must not still be sitting in the window next to the new one, or
 * discovery correlates the wrong device settings with the wrong context.
 */
export function replaceContext(incoming: AppContextEvent[]): number {
  context.length = 0;
  context.push(...incoming);
  return incoming.length;
}

/**
 * The stored window with today's live reading folded in, replacing any stored
 * row for the same date.
 *
 * Discovery joins device events to context by date, and today's live device
 * events are exactly the ones a demo generates on stage - without this they
 * would join against nothing and the run would reason about today as a day
 * with no known weather.
 */
export function withToday(window: AppContextEvent[], today: DailyContext | null): AppContextEvent[] {
  if (!today) return window;
  const { observedAt, ...day } = today;
  return [...window.filter((c) => c.date !== day.date), day];
}
