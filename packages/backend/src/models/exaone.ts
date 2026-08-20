import { ChatOpenAI } from "@langchain/openai";
import type { AIMessage } from "@langchain/core/messages";
import { config } from "../config.js";

/**
 * EXAONE via Friendli's OpenAI-compatible API. Used ONLY by the background
 * Skill Discovery pipeline (never on the interactive/control path), so
 * thinking mode is unconditionally on - it's async and off the request path,
 * so there's no latency cost to worry about.
 */
export const exaoneReasoning = new ChatOpenAI({
  model: config.friendliEndpointId, // Friendli endpoint id, not a real model name
  apiKey: config.friendliApiKey,
  configuration: { baseURL: config.friendliBaseUrl },
  // Binding constraint is the range 0.1-0.3 for reproducibility; 0.2 is this
  // project's own choice within that range, not externally mandated.
  temperature: 0.2,
  // Externally-mandated NFR (not a preference): retries capped at 1.
  maxRetries: 1,
  timeout: 30_000,
  modelKwargs: {
    // chat_template_kwargs is not a standard OpenAI param, so it has to
    // travel through modelKwargs to reach Friendli. Empirically verified
    // reachable this way in a prior Step 0 check.
    chat_template_kwargs: { enable_thinking: true, preserve_thinking: true },
  },
});

/**
 * Friendli returns the thinking trace as `reasoning_content` alongside the
 * final answer in `content` - empirically confirmed live (not documented in
 * LangChain's types, hence the cast), rather than nested/interleaved in
 * `content` itself.
 */
export function extractReasoning(response: AIMessage): string | null {
  const kwargs = response.additional_kwargs as { reasoning_content?: string };
  return kwargs.reasoning_content ?? null;
}
