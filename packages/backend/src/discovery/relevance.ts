import { HumanMessage } from "@langchain/core/messages";
import type { ProductId } from "@prompthon/shared";
import { exaoneReasoning } from "../models/exaone.js";
import { getTodayContext } from "../data/appContext.js";
import { listSkills } from "../data/skills.js";

export interface RelevantSkill {
  skillId: string;
  suggestion: string;
}

/**
 * FR-5.11 boundary, same as discovery/graph.ts: only EXAONE ever sees raw
 * app context. The control agent reaches this only through
 * tools/skills.ts's checkTodayForRelevantSkill, which gets back nothing but
 * the finished natural-language `suggestion` string below - never today's
 * actual weather/distance/screen-time numbers.
 */
export async function checkTodayRelevance(productId: ProductId): Promise<RelevantSkill | null> {
  const today = getTodayContext();
  if (!today) return null;

  const skills = await listSkills(productId);
  if (skills.length === 0) return null;

  const prompt = `Today's context: ${JSON.stringify(today)}.

This character has learned these skills:
${skills.map((s) => `- id: ${s.id}\n  title: ${s.title.en}\n  content: ${s.content}`).join("\n\n")}

Does today's context clearly match the condition described in exactly ONE of these skills? Only say yes if the match is genuinely clear from the skill's own stated condition, not a guess.

If yes, respond with exactly this, nothing else:
SKILL_ID: <the matching skill's id>
Then one warm, natural sentence in the character's own voice, mentioning today's specific relevant facts (whichever of weather, distance travelled, or screen time the skill's condition actually depends on - not all three unless all three matter), and offering to apply that skill, phrased as a question.

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
