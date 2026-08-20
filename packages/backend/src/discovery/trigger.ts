import type { Bilingual, ProductId } from "@prompthon/shared";
import { runDiscoveryGraph } from "./graph.js";
import { countSinceLastRun, resetSinceLastRun } from "../data/usage.js";

const THRESHOLD = 3;

const inFlight = new Set<ProductId>();

export function maybeRunDiscovery(productId: ProductId): void {
  if (inFlight.has(productId)) return;
  if (countSinceLastRun(productId) < THRESHOLD) return;

  inFlight.add(productId);

  runDiscoveryGraph(productId)
    .then(({ found, title }) => {
      console.log(
        `[discovery-trigger] ${productId}: ${found ? `found: ${title?.en}` : "no pattern found"}`,
      );
    })
    .catch((err: unknown) => {
      console.error(`[discovery-trigger] ${productId}: run failed`, err);
    })
    .finally(() => {
      resetSinceLastRun(productId);
      inFlight.delete(productId);
    });
}

/**
 * Dev-only escape hatch for demos: run discovery right now regardless of
 * the threshold, so it doesn't depend on live usage happening to cross 3
 * events at the right moment. Shares the same inFlight guard and counter
 * reset as the threshold-triggered path - `null` means a run for this
 * product is already in progress, not a failure.
 */
export function forceRunDiscovery(productId: ProductId): Promise<{ found: boolean; title?: Bilingual }> | null {
  if (inFlight.has(productId)) return null;
  inFlight.add(productId);

  return runDiscoveryGraph(productId).finally(() => {
    resetSinceLastRun(productId);
    inFlight.delete(productId);
  });
}
