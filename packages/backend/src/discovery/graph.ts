import { StateGraph, StateSchema, START, END } from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { AppContextEvent, ProductId, UsageEvent } from "@prompthon/shared";
import { exaoneReasoning, extractReasoning } from "../models/exaone.js";
import { readWindow } from "../data/usage.js";
import { readContextWindow, withToday } from "../data/appContext.js";
import { deviceAdapter } from "../device/adapter.js";
import { putSkill } from "../data/skills.js";
import { publish } from "../routes/sse.js";

// Loosely typed on purpose - business logic (found one skill or none) matters
// more here than precise UsageEvent validation via zod.
//
// ponytail: `as any` because @langchain/langgraph@1.4.12's StateSchemaField
// type requires zod's newer standard-schema JSON-schema extension
// (peer range "zod ^3.25.32 || ^4.2.0"), which this project's pinned zod
// v3.25.x doesn't implement - runtime works fine (verified: StateSchema's
// actual field-type check only needs `~standard.validate`), it's a
// types-only mismatch. Upgrade path: drop the cast once zod is bumped to a
// release that implements the JSON-schema standard-schema extension.
const DiscoveryState = new StateSchema({
  productId: z.string(),
  events: z.array(z.any()).default(() => []),
  context: z.array(z.any()).default(() => []),
  title: z.string().optional(),
  content: z.string().optional(),
  found: z.boolean().default(false),
} as any);

/** One calendar day's device events plus that day's app context, if any. */
interface JoinedDay {
  date: string;
  context: AppContextEvent | null;
  deviceEvents: UsageEvent[];
}

function joinByDate(events: UsageEvent[], context: AppContextEvent[]): JoinedDay[] {
  const byDate = new Map<string, UsageEvent[]>();
  for (const e of events) {
    const date = e.at.slice(0, 10);
    const list = byDate.get(date) ?? [];
    list.push(e);
    byDate.set(date, list);
  }
  const contextByDate = new Map(context.map((c) => [c.date, c]));
  const dates = new Set([...byDate.keys(), ...contextByDate.keys()]);
  return [...dates].sort().map((date) => ({
    date,
    context: contextByDate.get(date) ?? null,
    deviceEvents: byDate.get(date) ?? [],
  }));
}

function buildPrompt(days: JoinedDay[]): string {
  return `You are looking at up to 60 days of data for an LG product, to spot a genuine recurring pattern worth turning into a described "skill" for the product's character to remember.

Each entry below is one calendar day: that day's app-level context if known (weather, step count, distance travelled, phone screen time) and the device settings the user chose that day, if any.

Days (JSON):
${JSON.stringify(days)}

Look for ONE clear, recurring pattern. Two kinds count:
1. A context-correlated pattern - the user consistently chooses different device settings depending on that day's context (e.g. a different massage zone or intensity on rainy days versus clear days, or different settings on days they walked a lot versus days they spent hours on their phone).
2. A plain recurring pattern - the user chooses the same device settings on most days regardless of context (context may be missing or irrelevant).

Prefer a context-correlated pattern if the data genuinely supports one - it is the more specific, more interesting finding. Only report a plain recurring pattern if no context correlation holds up under the data.

If you find one, respond with:
- A first line exactly: TITLE: <short title>
- Followed by the full skill as Markdown: a title heading, a description of the pattern (state the context condition explicitly if the pattern is context-correlated), what it suggests about the user's needs, and what the character could do about it in the future.

If nothing stands out as a genuine recurring pattern, respond with exactly this and nothing else:
NO_PATTERN_FOUND`;
}

function parseResponse(text: string): { title: string; content: string } | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("TITLE:")) return null;
  const newlineIdx = trimmed.indexOf("\n");
  if (newlineIdx === -1) return null;
  const title = trimmed.slice("TITLE:".length, newlineIdx).trim();
  const content = trimmed.slice(newlineIdx + 1).trim();
  if (!title || !content) return null;
  return { title, content };
}

// State typing rides on the same `as any` above, so node params are typed
// explicitly here rather than via (broken) inference.
type DiscoveryStateValue = {
  productId: ProductId;
  events: UsageEvent[];
  context: AppContextEvent[];
  title?: string;
  content?: string;
  found: boolean;
};

const graph = new StateGraph(DiscoveryState)
  .addNode("loadWindow", async (state: DiscoveryStateValue) => {
    console.log(`[discovery:${state.productId}] loadWindow`);
    publish(state.productId, { type: "discoveryProgress", productId: state.productId, phase: "started" });
    const events = readWindow(state.productId, 60);

    // Today's live reading is folded in so on-stage device events have a
    // context row to join against. A failed fetch loses today only, not the
    // whole run - but it is logged, because "discovery ran without today" is
    // otherwise indistinguishable from "today matched nothing".
    let today = null;
    try {
      today = await deviceAdapter.getDailyContext();
    } catch (err) {
      console.log(`[discovery:${state.productId}] today's context unavailable: ${(err as Error).message}`);
    }
    const context = withToday(readContextWindow(60), today);

    return { events, context };
  })
  .addNode("findPattern", async (state: DiscoveryStateValue) => {
    console.log(`[discovery:${state.productId}] findPattern`);
    publish(state.productId, { type: "discoveryProgress", productId: state.productId, phase: "analysing" });

    if (state.events.length === 0) {
      publish(state.productId, { type: "discoveryProgress", productId: state.productId, phase: "noPattern" });
      return { found: false };
    }

    const days = joinByDate(state.events, state.context);

    // Demo-reliability safeguard: a NO_PATTERN_FOUND on genuinely patterned
    // seed data is more likely one unlucky sample than a real absence, and a
    // live retriggered demo-mid-run is a bad failure mode. Retry once, same
    // run, before accepting "no pattern" as final.
    let parsed: { title: string; content: string } | null = null;
    for (let attempt = 1; attempt <= 2 && !parsed; attempt++) {
      console.log(
        `[exaone:${state.productId}] invoke (attempt ${attempt}) <- ${days.length} days (${state.context.length} with context)`,
      );
      const response = await exaoneReasoning.invoke([new HumanMessage(buildPrompt(days))]);
      const responseText = String(response.content);
      const reasoning = extractReasoning(response) ?? "";
      console.log(`[exaone:${state.productId}] reasoning (attempt ${attempt}) ->\n${reasoning}`);
      console.log(`[exaone:${state.productId}] response (attempt ${attempt}) ->\n${responseText}`);
      publish(state.productId, {
        type: "discoveryReasoning",
        productId: state.productId,
        attempt,
        reasoning,
        response: responseText,
      });
      parsed = parseResponse(responseText);
    }
    if (!parsed) {
      publish(state.productId, { type: "discoveryProgress", productId: state.productId, phase: "noPattern" });
      return { found: false };
    }
    publish(state.productId, { type: "discoveryProgress", productId: state.productId, phase: "found" });
    return { found: true, title: parsed.title, content: parsed.content };
  })
  .addNode("save", async (state: DiscoveryStateValue) => {
    console.log(`[discovery:${state.productId}] save`);
    if (state.found && state.title && state.content) {
      const skill = await putSkill({ productId: state.productId, title: state.title, content: state.content });
      const { content, ...summary } = skill;
      publish(state.productId, { type: "skillDiscovered", productId: state.productId, skill: summary });
    }
    return {};
  })
  .addEdge(START, "loadWindow")
  .addEdge("loadWindow", "findPattern")
  .addEdge("findPattern", "save")
  .addEdge("save", END)
  .compile();

export async function runDiscoveryGraph(productId: ProductId): Promise<{ found: boolean; title?: string }> {
  const result = (await graph.invoke({ productId })) as DiscoveryStateValue;
  return { found: result.found, title: result.title };
}
