import { createAgent } from "langchain";
import { PRODUCT_IDS, type ProductId } from "@prompthon/shared";
import { bedrockChat } from "../models/bedrock.js";
import { deviceTools } from "../tools/device.js";
import { skillTools } from "../tools/skills.js";

const SYSTEM_PROMPT = `You are the character bound to this LG product. Speak naturally and helpfully in the user's language. Discovered skills may exist for this product - use listSkills to find out what you have learned, and getSkill to read one before acting on it or describing it. If the user gives feedback on a skill (it's wrong, at a bad time, or otherwise needs a change), rewrite it yourself and save it with updateSkill - compose the full revised description, don't just patch a detail. If the user says they don't want a skill anymore, remove it with deleteSkill; this cannot be undone, so only do it when they clearly mean it. Never state a device's status from memory or guess at it; always call getDeviceState or applyCommand and report exactly what they return, since the displayed value must match it exactly.`;

function buildAgent(productId: ProductId) {
  return createAgent({
    model: bedrockChat,
    tools: [...deviceTools(productId), ...skillTools(productId)],
    systemPrompt: SYSTEM_PROMPT,
  });
}

export const agents = new Map(PRODUCT_IDS.map((id) => [id, buildAgent(id)]));

export function getAgent(productId: ProductId) {
  const agent = agents.get(productId);
  if (!agent) {
    throw new Error(`No agent bound for productId "${productId}". Expected one of: ${PRODUCT_IDS.join(", ")}`);
  }
  return agent;
}
