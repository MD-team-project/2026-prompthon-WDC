import { Router } from "express";
import { isProductId, type UsageEvent } from "@prompthon/shared";
import { appendEvents, seedEvents } from "../data/usage.js";
import { forceRunDiscovery, maybeRunDiscovery } from "../discovery/trigger.js";

export const internalRouter = Router();

internalRouter.post("/internal/usage/flush", (req, res) => {
  const { events } = (req.body ?? {}) as { events?: UsageEvent[] };
  if (!Array.isArray(events)) {
    res.status(400).json({ failure: { code: "INVALID_REQUEST", message: "events array is required" } });
    return;
  }

  const accepted = appendEvents(events);

  const productIds = new Set(events.map((e) => e.productId));
  for (const productId of productIds) {
    maybeRunDiscovery(productId);
  }

  res.json({ accepted });
});

/**
 * Pre-authored fixture history, loaded once at boot (device-stub reads a
 * local .jsonl and POSTs it here). Deliberately separate from /flush: this
 * must NOT count toward the discovery threshold and must NOT trigger a run
 * - the point is a live demo interaction fires discovery over the combined
 * seed + live window, not that discovery fires the moment the app boots.
 */
internalRouter.post("/internal/usage/seed", (req, res) => {
  const { events } = (req.body ?? {}) as { events?: UsageEvent[] };
  if (!Array.isArray(events)) {
    res.status(400).json({ failure: { code: "INVALID_REQUEST", message: "events array is required" } });
    return;
  }

  const accepted = seedEvents(events);
  res.json({ accepted });
});

/**
 * Dev-only: force a discovery run right now, bypassing the usage threshold.
 * For demos, so this doesn't depend on live usage happening to cross the
 * threshold at the right moment on stage.
 */
internalRouter.post("/internal/discovery/:productId/run", async (req, res) => {
  const { productId } = req.params;
  if (!productId || !isProductId(productId)) {
    res.status(404).json({ failure: { code: "NOT_FOUND", message: `unknown product ${productId}` } });
    return;
  }

  const run = forceRunDiscovery(productId);
  if (!run) {
    res.status(409).json({ failure: { code: "INVALID_REQUEST", message: "a discovery run is already in progress for this product" } });
    return;
  }

  try {
    res.json(await run);
  } catch (err) {
    res.status(500).json({ failure: { code: "INTERNAL", message: (err as Error).message } });
  }
});
