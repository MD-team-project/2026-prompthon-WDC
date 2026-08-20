import { tool } from "langchain";
import * as z from "zod";
import type { ProductId } from "@prompthon/shared";
import { deleteSkill, getSkill, listSkills, updateSkillContent } from "../data/skills.js";
import { checkTodayRelevance } from "../discovery/relevance.js";

/**
 * Skills reach the control agent ONLY through these tools - never listed in
 * the system prompt (S7: token efficiency, stable prompt size as skills
 * accumulate). Read/update/delete is plain DynamoDB-style CRUD, just like
 * typical skills: the model has to *decide* to call listSkills first, then
 * getSkill to read one before acting, and updateSkill/deleteSkill when the
 * user gives revision feedback in conversation. Skill creation itself stays
 * automated - only the discovery workflow calls `putSkill`, never these
 * tools, so the model can revise or remove but never invent a skill.
 */
export function skillTools(productId: string) {
  const id = productId as ProductId;

  const list = tool(
    async () => JSON.stringify((await listSkills(id)).map(({ id, title }) => ({ id, title }))),
    {
      name: "listSkills",
      description:
        "Find out what this character has learned so far. Call this whenever the user references a skill, routine, or something the character previously discovered, or whenever you are unsure if a relevant skill exists.",
      schema: z.object({}),
    },
  );

  const get = tool(
    async ({ skillId }: { skillId: string }) => {
      const skill = await getSkill(skillId);
      return skill ? skill.content : "no skill found with id " + skillId;
    },
    {
      name: "getSkill",
      description:
        "Read a discovered skill's full description by id, once listSkills has told you which one is relevant.",
      schema: z.object({ skillId: z.string() }),
    },
  );

  const update = tool(
    async ({ skillId, content }: { skillId: string; content: string }) => {
      const updated = await updateSkillContent(skillId, content);
      return updated ? "updated" : "no skill found with id " + skillId;
    },
    {
      name: "updateSkill",
      description:
        "Rewrite a skill's full description when the user gives feedback on it (e.g. wrong time, wrong condition). Compose the complete revised Markdown yourself from the current content plus the feedback, and pass the whole thing - this replaces the description entirely, it does not patch it.",
      schema: z.object({ skillId: z.string(), content: z.string() }),
    },
  );

  const remove = tool(
    async ({ skillId }: { skillId: string }) => {
      const removed = await deleteSkill(skillId);
      return removed ? "deleted" : "no skill found with id " + skillId;
    },
    {
      name: "deleteSkill",
      description: "Remove a skill entirely when the user says they don't want it anymore. This cannot be undone.",
      schema: z.object({ skillId: z.string() }),
    },
  );

  const checkRelevance = tool(
    async () => {
      const match = await checkTodayRelevance(id);
      return match ? match.suggestion : "nothing relevant today";
    },
    {
      name: "checkTodayForRelevantSkill",
      description:
        "Check whether today's circumstances match a skill you've already learned, worth proactively bringing up before the user asks. Always call this when the user's message is empty (they just opened the chat) - if it returns a suggestion, lead with it in your own words; if it says nothing relevant, just greet warmly instead.",
      schema: z.object({}),
    },
  );

  return [list, get, update, remove, checkRelevance];
}
