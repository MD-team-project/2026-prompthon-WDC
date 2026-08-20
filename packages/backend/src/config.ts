/** Loud failure on missing required vars - fail at boot, not at first use. */
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`missing required env var ${name}`);
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  deviceApiUrl: process.env.DEVICE_API_URL ?? "http://localhost:4000",
  ddbTableName: process.env.DDB_TABLE_NAME ?? "prompthon-local",
  awsRegion: process.env.AWS_REGION ?? "us-east-1",
  // us./global. prefix is mandatory for this account's Anthropic models (INFERENCE_PROFILE,
  // not on-demand) - see infra/README.md. Fallbacks if this model isn't entitled:
  // us.anthropic.claude-haiku-4-5-20251001-v1:0, amazon.nova-lite-v1:0.
  bedrockModelId: process.env.BEDROCK_MODEL_ID ?? "us.anthropic.claude-opus-4-6-v1",
  friendliApiKey: required("FRIENDLI_API_KEY"),
  friendliEndpointId: required("FRIENDLI_ENDPOINT_ID"),
  friendliBaseUrl: process.env.FRIENDLI_BASE_URL ?? "https://api.friendli.ai/dedicated/v1",
};
