import type { ProductId } from "@prompthon/shared";
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
        `[discovery-trigger] ${productId}: ${found ? `found: ${title}` : "no pattern found"}`,
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
