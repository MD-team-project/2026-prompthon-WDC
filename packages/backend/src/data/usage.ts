// FR-5.11: SENSITIVE data class. Nothing in src/tools/ may import this module - only src/discovery/ may. Enforced by import discipline, verifiable by inspection.

// ponytail: in-memory store, not DynamoDB - same deferral as data/skills.ts. Swap internals once INFRA's table exists.

import type { ProductId, UsageEvent } from "@prompthon/shared";

const events: UsageEvent[] = [];
const sinceLastRun = new Map<ProductId, number>();

export function appendEvents(incoming: UsageEvent[]): number {
  for (const event of incoming) {
    events.push(event);
    sinceLastRun.set(event.productId, (sinceLastRun.get(event.productId) ?? 0) + 1);
  }
  return incoming.length;
}

/**
 * Adds to history WITHOUT counting toward the discovery threshold. For
 * loading a pre-authored fixture at boot: it should be there for discovery
 * to read once triggered, but the trigger itself must come from a live
 * demo interaction, not from the seed load - otherwise discovery fires
 * before anyone's watching.
 */
export function seedEvents(incoming: UsageEvent[]): number {
  events.push(...incoming);
  return incoming.length;
}

export function readWindow(productId: ProductId, days: number): UsageEvent[] {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return events.filter((e) => e.productId === productId && new Date(e.at).getTime() >= cutoff);
}

export function countSinceLastRun(productId: ProductId): number {
  return sinceLastRun.get(productId) ?? 0;
}

export function resetSinceLastRun(productId: ProductId): void {
  sinceLastRun.set(productId, 0);
}
