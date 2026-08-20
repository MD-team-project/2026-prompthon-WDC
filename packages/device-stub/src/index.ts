/**
 * device-stub: a canned-response server standing in for three LG appliances,
 * plus the phone-side integrations the demo pretends to have (weather, health
 * app, screen time - see `dailyContext.ts`).
 *
 * A separate process on its own port, deliberately. The agent must ask over
 * HTTP because the state object is not in its memory - which is what makes
 * "displayed stats come from the device, not from the model" structural
 * rather than a matter of discipline. Today's context is served from here for
 * the same reason.
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import express from "express";
import { isProductId } from "@prompthon/shared";
import { applyCommand, capabilitiesFor, getState, makeEvent, resetState } from "./canned.js";
import {
  applyScenario,
  bootScenario,
  CONTEXT_SCENARIOS,
  getDailyContext,
  patchDailyContext,
  resetDailyContext,
} from "./dailyContext.js";
import { enqueue, pending, startFlushLoop } from "./buffer.js";

const PORT = Number(process.env.DEVICE_STUB_PORT ?? 4000);
const FLUSH_URL = process.env.FLUSH_URL ?? "http://localhost:3000/internal/usage/flush";
const FLUSH_INTERVAL_MS = Number(process.env.FLUSH_INTERVAL_MS ?? 3000);
const SEED_URL = process.env.SEED_URL ?? FLUSH_URL.replace("/usage/flush", "/usage/seed");
const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), "../fixtures");
// One file per product+scenario (e.g. shoecase-simple.jsonl,
// massagechair-rain.jsonl), loaded independently rather than one combined
// file - keeps each scenario's signal clean instead of mixing several
// patterns into one blob discovery has to pick just one of (Q6: max 1 skill
// per run). Set SEED_FIXTURES to a comma-separated subset of filenames
// (no .jsonl) to load only specific scenarios; unset loads everything found.
const SEED_FIXTURES = process.env.SEED_FIXTURES?.split(",").map((s) => s.trim());

const log = (msg: string) => console.log(`[device-stub] ${msg}`);

const app = express();
app.use(express.json());

app.use("/devices/:productId", (req, res, next) => {
  if (!isProductId(req.params.productId)) {
    res.status(404).json({ failure: { code: "NOT_FOUND", message: "unknown product" } });
    return;
  }
  next();
});

app.get("/devices/:productId/capabilities", (req, res) => {
  res.json(capabilitiesFor(req.params.productId as never));
});

app.get("/devices/:productId/state", (req, res) => {
  res.json(getState(req.params.productId as never));
});

app.post("/devices/:productId/command", (req, res) => {
  const productId = req.params.productId as never;
  const { capability, params } = (req.body ?? {}) as {
    capability?: string;
    params?: Record<string, unknown>;
  };

  if (!capability) {
    res.status(400).json({ failure: { code: "INVALID_REQUEST", message: "capability required" } });
    return;
  }

  const result = applyCommand(productId, capability, params ?? {});
  if ("error" in result) {
    res.status(400).json({ failure: { code: "INVALID_REQUEST", message: result.error } });
    return;
  }

  enqueue(makeEvent(productId, capability, params ?? {}));
  if (result.clamped) {
    const { param, requested, applied } = result.clamped;
    log(`clamped ${param}: requested ${requested}, applied ${applied}`);
  }
  res.json(result.state);
});

/**
 * Resets in-memory device state only: power, mode, attributes.
 * Does NOT touch the usage buffer, stored history, skills or progression.
 * For wiping the device screen between rehearsals while keeping what the
 * character has learned.
 */
app.post("/devices/:productId/reset", (req, res) => {
  res.json(resetState(req.params.productId as never));
});

/**
 * Today's app-level context. NOT under /devices - it isn't an appliance and
 * isn't product-scoped: one demo user, one reading, read by all three
 * characters.
 */
app.get("/context/today", (_req, res) => {
  res.json(getDailyContext());
});

/**
 * Demo lever. `{ scenario: "walk" }` swaps the whole preset; any subset of
 * `weather` / `steps` / `distanceKm` / `screenTimeMinutes` nudges individual
 * readings. Both in one route because from the caller's side it is the same
 * act - "make today look like this".
 */
app.post("/context/today", (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const { scenario, ...overrides } = body;

  if (scenario !== undefined) {
    if (typeof scenario !== "string") {
      res.status(400).json({ failure: { code: "INVALID_REQUEST", message: "scenario must be a string" } });
      return;
    }
    const applied = applyScenario(scenario);
    if (!applied) {
      res.status(400).json({
        failure: {
          code: "INVALID_REQUEST",
          message: `unknown scenario "${scenario}". Known: ${CONTEXT_SCENARIOS.join(", ")}`,
        },
      });
      return;
    }
    // A scenario plus overrides is honoured in that order, so `{ scenario:
    // "walk", screenTimeMinutes: 240 }` means what it reads like.
    if (Object.keys(overrides).length === 0) {
      log(`context scenario -> ${scenario}`);
      res.json(applied);
      return;
    }
  }

  const result = patchDailyContext(overrides);
  if ("error" in result) {
    res.status(400).json({ failure: { code: "INVALID_REQUEST", message: result.error } });
    return;
  }
  log(`context updated -> ${JSON.stringify(result.context)}`);
  res.json(result.context);
});

/** Back to the preset this process booted with. Device state untouched. */
app.post("/context/reset", (_req, res) => {
  res.json(resetDailyContext());
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, pendingEvents: pending(), contextScenario: bootScenario });
});

/**
 * Loads the pre-authored fixture once at boot, via the dedicated /seed
 * endpoint (never /flush - seeding must not count toward the discovery
 * threshold or trigger a run itself; a live demo interaction has to be
 * what fires discovery, not the boot sequence).
 *
 * Backend may not be listening yet when this process starts, so this
 * retries a few times rather than failing silently - a fixture that never
 * loads is the same "quiet failure" risk already flagged for discovery
 * generally, so this logs loudly on final failure instead of swallowing it.
 */
function loadFixtureFiles(): { name: string; events: unknown[] }[] {
  let filenames: string[];
  try {
    filenames = readdirSync(FIXTURES_DIR).filter((f) => f.endsWith(".jsonl"));
  } catch (err) {
    log(`SEED SKIPPED: could not read fixtures dir ${FIXTURES_DIR}: ${(err as Error).message}`);
    return [];
  }

  if (SEED_FIXTURES) {
    filenames = filenames.filter((f) => SEED_FIXTURES.includes(f.replace(/\.jsonl$/, "")));
  }

  return filenames.map((name) => {
    const raw = readFileSync(join(FIXTURES_DIR, name), "utf-8");
    const events = raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    return { name, events };
  });
}

async function seedOnce(events: unknown[]): Promise<boolean> {
  try {
    const res = await fetch(SEED_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Loads every fixture file's events once at boot, via the dedicated /seed
 * endpoint (never /flush - seeding must not count toward the discovery
 * threshold or trigger a run itself; a live demo interaction has to be
 * what fires discovery, not the boot sequence).
 *
 * Backend may not be listening yet when this process starts, so this
 * retries a few times rather than failing silently - a fixture that never
 * loads is the same "quiet failure" risk already flagged for discovery
 * generally, so this logs loudly on final failure instead of swallowing it.
 */
async function seedFixturesOnBoot(): Promise<void> {
  const files = loadFixtureFiles();
  if (files.length === 0) {
    log("no fixture files to seed");
    return;
  }

  const attempts = 5;
  for (const file of files) {
    let ok = false;
    for (let attempt = 1; attempt <= attempts && !ok; attempt++) {
      ok = await seedOnce(file.events);
      if (!ok) await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    if (ok) {
      log(`seeded ${file.events.length} events from ${file.name}`);
    } else {
      log(`SEED FAILED for ${file.name} after ${attempts} attempts`);
    }
  }
}

app.listen(PORT, () => {
  log(`listening on ${PORT}`);
  log(`flushing to ${FLUSH_URL} every ${FLUSH_INTERVAL_MS}ms`);
  log(`today's context: ${JSON.stringify(getDailyContext())}`);
  startFlushLoop({ url: FLUSH_URL, intervalMs: FLUSH_INTERVAL_MS, log });
  void seedFixturesOnBoot();
});
