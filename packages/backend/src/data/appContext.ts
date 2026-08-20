// FR-5.11: SENSITIVE data class, same as usage.ts - only src/discovery/ may import this.

// ponytail: in-memory store, not DynamoDB - same deferral as usage.ts/skills.ts.

import type { AppContextEvent } from "@prompthon/shared";

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

export function getTodayContext(): AppContextEvent | null {
  const today = new Date().toISOString().slice(0, 10);
  return context.find((c) => c.date === today) ?? null;
}
