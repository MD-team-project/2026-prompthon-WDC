import { ChatBedrockConverse } from "@langchain/aws";
import { config } from "../config.js";

// Single construction site for the control-path model (S1: createAgent + Bedrock for control; EXAONE/Friendli is discovery-only, not here).
export const bedrockChat = new ChatBedrockConverse({
  model: config.bedrockModelId,
  region: config.awsRegion,
});
