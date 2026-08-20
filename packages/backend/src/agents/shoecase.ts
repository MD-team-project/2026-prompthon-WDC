import { createAgent } from "langchain";
import { bedrockChat } from "../models/bedrock.js";
import { shoecaseTools } from "../tools/shoecase.js";
import { skillTools } from "../tools/skills.js";
import { SHARED_INSTRUCTIONS } from "./sharedInstructions.js";

export const shoecaseAgent = createAgent({
  model: bedrockChat,
  tools: [...shoecaseTools(), ...skillTools("shoecase")],
  systemPrompt: `You are the character bound to this shoe care case. ${SHARED_INSTRUCTIONS}`,
});
