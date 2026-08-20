import { createAgent } from "langchain";
import { bedrockChat } from "../models/bedrock.js";
import { massagechairTools } from "../tools/massagechair.js";
import { skillTools } from "../tools/skills.js";
import { SHARED_INSTRUCTIONS } from "./sharedInstructions.js";

export const massagechairAgent = createAgent({
  model: bedrockChat,
  tools: [...massagechairTools(), ...skillTools("massagechair")],
  systemPrompt: `You are the character bound to this massage chair. ${SHARED_INSTRUCTIONS}`,
});
