import { Router } from "express";
import { HumanMessage } from "@langchain/core/messages";
import { isProductId, type SkillSummary } from "@prompthon/shared";
import { getSkill, listSkills } from "../data/skills.js";
import { getAgent } from "../agents/index.js";

export const skillsRouter = Router();

// The route FE polls to notice new skills - omit `content` so polling stays cheap.
skillsRouter.get("/api/characters/:productId/skills", async (req, res) => {
  const { productId } = req.params;
  if (!productId || !isProductId(productId)) {
    res.status(404).json({ failure: { code: "NOT_FOUND", message: `unknown product ${productId}` } });
    return;
  }
  const summaries: SkillSummary[] = (await listSkills(productId)).map(({ content, ...rest }) => rest);
  res.json(summaries);
});

skillsRouter.get("/api/characters/:productId/skills/:skillId", async (req, res) => {
  const skill = await getSkill(req.params.skillId);
  if (!skill) {
    res.status(404).json({ failure: { code: "NOT_FOUND", message: "skill not found" } });
    return;
  }
  res.json(skill);
});

skillsRouter.post("/api/characters/:productId/skills/:skillId/invoke", async (req, res) => {
  const { productId, skillId } = req.params;
  if (!productId || !isProductId(productId)) {
    res.status(404).json({ failure: { code: "NOT_FOUND", message: `unknown product ${productId}` } });
    return;
  }
  const skill = await getSkill(skillId);
  if (!skill) {
    res.status(404).json({ failure: { code: "NOT_FOUND", message: "skill not found" } });
    return;
  }

  try {
    const agent = getAgent(productId);
    const instruction = `Follow this skill you previously discovered, and carry it out now:\n\n${skill.content}`;
    const result = await agent.invoke({ messages: [new HumanMessage(instruction)] });
    const last = result.messages[result.messages.length - 1];
    res.json({ prose: String(last?.content ?? ""), invokedSkillId: skill.id });
  } catch (err) {
    res.json({
      prose: "I couldn't run that skill just now.",
      failure: { code: "SKILL_STEP_FAILED", message: (err as Error).message },
    });
  }
});

// No separate feedback endpoint: revision and deletion happen through the
// chat turn itself, via the control agent's updateSkill/deleteSkill tools
// (see tools/skills.ts). A user just says what's wrong in conversation.
