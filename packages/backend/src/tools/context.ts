import { tool } from "langchain";
import * as z from "zod";
import { deviceAdapter } from "../device/adapter.js";

/**
 * Today's app-level context, as a tool the control agent can call directly.
 *
 * This is the one place raw context reaches the control model, and it is
 * deliberate rather than a hole in FR-5.11. The boundary that matters is the
 * accumulated window in `data/appContext.ts`, which is what exposes a routine
 * and stays EXAONE-only (see `discovery/graph.ts`). Today's single reading is
 * the user's own current state, is shown to them on their own screen
 * (`GET /api/context/today`), and is what lets a suggestion carry its reason:
 * "it rained and you were on your phone for three hours" is a recommendation
 * the user can agree or disagree with, where a bare "try the neck course" is
 * just the appliance guessing.
 *
 * Contrast `checkTodayForRelevantSkill` (tools/skills.ts), which matches today
 * against ALREADY-DISCOVERED skills and returns nothing but a finished
 * sentence. That path needs a skill to exist first. This one does not, which
 * is the whole point: a character with an empty compendium can still notice
 * the weather.
 */
export function contextTools() {
  const getToday = tool(
    async () => JSON.stringify(await deviceAdapter.getDailyContext()),
    {
      name: "getTodayContext",
      description:
        "Read today's real conditions for this user: weather, step count, distance travelled, and phone screen time. Call this before recommending anything unprompted, and whenever the user asks what you would suggest, how they should feel, or mentions being tired, sore or stiff. Report only the figures this returns - never invent or estimate them.",
      schema: z.object({}),
    },
  );

  return [getToday];
}
