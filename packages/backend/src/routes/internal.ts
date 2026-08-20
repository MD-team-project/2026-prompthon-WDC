import { Router } from "express";
import type { UsageEvent } from "@prompthon/shared";
import { appendEvents, seedEvents } from "../data/usage.js";
import { maybeRunDiscovery } from "../discovery/trigger.js";

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
