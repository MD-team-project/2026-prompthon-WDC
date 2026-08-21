import { createAgent } from "langchain";
import { MemorySaver } from "@langchain/langgraph";
import { bedrockChat } from "../models/bedrock.js";
import { contextTools } from "../tools/context.js";
import { deviceTools } from "../tools/device.js";
import { skillTools } from "../tools/skills.js";
import { SHARED_INSTRUCTIONS } from "./sharedInstructions.js";

// Deferred product: capability set isn't settled yet, so this stays on the
// generic listCapabilities/applyCommand tools rather than named ones - and
// gets no course table for the same reason, since a course is a combination of
// settings this product hasn't fixed yet. It still reads today's context, so
// the behaviour is uniform across all three characters; it just has to ask
// listCapabilities what it can actually offer before suggesting anything.
export const pralAgent = createAgent({
  model: bedrockChat,
  tools: [...deviceTools("pral"), ...skillTools("pral"), ...contextTools()],
  systemPrompt: `You are the character bound to this product. ${SHARED_INSTRUCTIONS}

This product's capability set is not finalised. Before offering anything based on today's conditions, call listCapabilities and only suggest what it actually reports - never a course or setting you have not confirmed exists.`,
  // See massagechair.ts's checkpointer note - same in-memory, per-product thread.
  checkpointer: new MemorySaver(),
});
