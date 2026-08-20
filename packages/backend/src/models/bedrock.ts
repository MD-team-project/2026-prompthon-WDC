import { ChatBedrockConverse } from "@langchain/aws";
import { config } from "../config.js";

// Single construction site for the control-path model (S1: createAgent + Bedrock for control; EXAONE/Friendli is discovery-only, not here).
export const bedrockChat = new ChatBedrockConverse({
  model: config.bedrockModelId,
  region: config.awsRegion,
  // Backstop for the "at most 3 lines" instruction in sharedInstructions.ts -
  // a prompt alone can drift, this caps the worst case. INFRA's own advisory
  // (aidlc-state.md) suggested the same ~300 figure independently.
  maxTokens: 300,
});
