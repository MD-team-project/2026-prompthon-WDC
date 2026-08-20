import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import express from "express";
import type { AppContextEvent } from "@prompthon/shared";
import { config } from "./config.js";
import { chatRouter } from "./routes/chat.js";
import { skillsRouter } from "./routes/skills.js";
import { eventsRouter } from "./routes/events.js";
import { internalRouter } from "./routes/internal.js";
import { healthRouter } from "./routes/health.js";
import { seedContext } from "./data/appContext.js";
// Constructs the three control agents at boot (module-level Map), per S6:
// strict 1:1:1 binding, held for the process lifetime.
import "./agents/index.js";

const app = express();
app.use(express.json());

app.use(chatRouter);
app.use(skillsRouter);
app.use(eventsRouter);
app.use(internalRouter);
app.use(healthRouter);

/**
 * App-level context (GPS distance, weather, screen time) isn't device data
 * and doesn't go through device-stub - backend owns the fixture directly
 * and loads it straight into `data/appContext.ts` at boot, no HTTP hop, no
 * seed endpoint needed (there's no live path that ever generates this data,
 * mocked entirely). One file per scenario, same reasoning as device-stub's
 * fixtures: keep signals clean rather than mixed.
 */
function loadAppContextFixturesOnBoot(): void {
  const dir = join(dirname(fileURLToPath(import.meta.url)), "../fixtures");
  const only = process.env.CONTEXT_FIXTURES?.split(",").map((s) => s.trim());

  let filenames: string[];
  try {
    filenames = readdirSync(dir).filter((f) => f.endsWith(".jsonl"));
  } catch (err) {
    console.log(`[app-context] SEED SKIPPED: could not read fixtures dir ${dir}: ${(err as Error).message}`);
    return;
  }
  if (only) filenames = filenames.filter((f) => only.includes(f.replace(/\.jsonl$/, "")));

  for (const name of filenames) {
    const raw = readFileSync(join(dir, name), "utf-8");
    const events: AppContextEvent[] = raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    seedContext(events);
    console.log(`[app-context] seeded ${events.length} days from ${name}`);
  }
}

loadAppContextFixturesOnBoot();

app.listen(config.port, () => {
  console.log(`backend listening on :${config.port}, device-stub at ${config.deviceApiUrl}`);
});
