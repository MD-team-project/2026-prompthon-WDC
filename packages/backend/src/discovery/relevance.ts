import { HumanMessage } from "@langchain/core/messages";
import type { ProductId } from "@prompthon/shared";
import { exaoneReasoning } from "../models/exaone.js";
import { deviceAdapter } from "../device/adapter.js";
import { listSkills } from "../data/skills.js";

export interface RelevantSkill {
  skillId: string;
  suggestion: string;
}

/**
 * Matches today against skills the character has ALREADY discovered, and
 * returns nothing but a finished natural-language sentence - the control agent
 * never sees which stored routine matched or how confident the match was.
 *
 * Today's raw figures are no longer secret from the control agent (see
 * tools/context.ts), so this is not the FR-5.11 boundary it once was. What it
 * still keeps on this side of the line is the DERIVED routine: EXAONE decides
 * whether today looks like a learned pattern, and the control agent only
 * receives the offer, not the reasoning that produced it.
 *
 * Today's reading comes from the device over HTTP rather than from stored
 * history, so it is always genuinely today's.
 */
export async function checkTodayRelevance(productId: ProductId): Promise<RelevantSkill | null> {
  const skills = await listSkills(productId);
  if (skills.length === 0) return null;

  let today;
  try {
    today = await deviceAdapter.getDailyContext();
  } catch (err) {
    // Loud, not silent: with no context there is nothing to match, and a
    // character that stops greeting proactively for an unlogged reason is the
    // hardest kind of demo failure to diagnose on stage.
    console.log(`[relevance:${productId}] no context available: ${(err as Error).message}`);
    return null;
  }

  const prompt = `Today's context: ${JSON.stringify(today)}.

This character has learned these skills:
${skills.map((s) => `- id: ${s.id}\n  title: ${s.title.en}\n  content: ${s.content}`).join("\n\n")}

Does today's context clearly match the condition described in exactly ONE of these skills? Only say yes if the match is genuinely clear from the skill's own stated condition, not a guess.

If yes, respond with exactly this, nothing else:
SKILL_ID: <the matching skill's id>
Then one warm, natural sentence in the character's own voice, mentioning today's specific relevant facts (whichever of weather, steps, distance travelled, or screen time the skill's condition actually depends on - not all of them unless all of them matter), and offering to apply that skill, phrased as a question.

If no skill clearly matches, respond with exactly: NO_MATCH`;

  const response = await exaoneReasoning.invoke([new HumanMessage(prompt)]);
  const text = String(response.content).trim();
  if (!text.startsWith("SKILL_ID:")) return null;

  const newlineIdx = text.indexOf("\n");
  if (newlineIdx === -1) return null;
  const skillId = text.slice("SKILL_ID:".length, newlineIdx).trim();
  const suggestion = text.slice(newlineIdx + 1).trim();
  const skill = skills.find((s) => s.id === skillId);
  if (!skill || !suggestion) return null;

  return { skillId, suggestion };
}
