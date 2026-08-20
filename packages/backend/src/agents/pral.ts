import { createAgent } from "langchain";
import { bedrockChat } from "../models/bedrock.js";
import { deviceTools } from "../tools/device.js";
import { skillTools } from "../tools/skills.js";
import { SHARED_INSTRUCTIONS } from "./sharedInstructions.js";

// Deferred product: capability set isn't settled yet, so this stays on the
// generic listCapabilities/applyCommand tools rather than named ones.
export const pralAgent = createAgent({
  model: bedrockChat,
  tools: [...deviceTools("pral"), ...skillTools("pral")],
  systemPrompt: `You are the character bound to this product. ${SHARED_INSTRUCTIONS}`,
});
