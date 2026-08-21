import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Router } from "express";
import { isProductId, type AppContextEvent, type UsageEvent } from "@prompthon/shared";
import { appendEvents, replaceEvents, seedEvents } from "../data/usage.js";
import { replaceContext } from "../data/appContext.js";
import { forceRunDiscovery, maybeRunDiscovery } from "../discovery/trigger.js";

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), "../../fixtures");

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
 * Demo-scenario switch: swaps a product's ENTIRE history to one scenario's
 * fixture (device-stub calls this right after applying a new scenario).
 * Not counted toward the threshold, same reasoning as /seed - and this is
 * a REPLACE, not an append, so the previous scenario's story can't still be
 * sitting in the window alongside the new one.
 */
internalRouter.post("/internal/usage/reseed", (req, res) => {
  const { productId, events } = (req.body ?? {}) as { productId?: string; events?: UsageEvent[] };
  if (!productId || !isProductId(productId) || !Array.isArray(events)) {
    res.status(400).json({ failure: { code: "INVALID_REQUEST", message: "productId and events array are required" } });
    return;
  }

  const accepted = replaceEvents(productId, events);
  res.json({ accepted });
});

/**
 * Companion to /internal/usage/reseed for the OTHER half of a scenario
 * switch: swaps the weather/steps/screen-time history to that scenario's
 * `app-context-<scenario>.jsonl`. Backend reads its own fixture (device-stub
 * only has to say which scenario) since "backend owns this fixture" already
 * held before this route existed - see the loader in index.ts.
 */
internalRouter.post("/internal/context/reseed", (req, res) => {
  const { scenario } = (req.body ?? {}) as { scenario?: string };
  if (!scenario) {
    res.status(400).json({ failure: { code: "INVALID_REQUEST", message: "scenario is required" } });
    return;
  }

  let events: AppContextEvent[];
  try {
    const raw = readFileSync(join(FIXTURES_DIR, `app-context-${scenario}.jsonl`), "utf-8");
    events = raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch {
    res.json({ accepted: 0 });
    return;
  }

  const accepted = replaceContext(events);
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
