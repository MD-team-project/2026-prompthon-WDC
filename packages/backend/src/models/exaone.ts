import { ChatOpenAI } from "@langchain/openai";
import type { AIMessage, BaseMessage } from "@langchain/core/messages";
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
  // Externally-mandated NFR (not a preference): retries capped at 1 for a
  // model call on the INTERACTIVE path (NFR-2.1 - doubling retries there
  // doubles the worst case a user is actively waiting on). Left untouched
  // here for the same reason it's tagged - but see `invokeExaoneWithRetry`
  // below for why that reasoning doesn't extend to this model.
  maxRetries: 1,
  timeout: 60_000,
  modelKwargs: {
    // chat_template_kwargs is not a standard OpenAI param, so it has to
    // travel through modelKwargs to reach Friendli. Empirically verified
    // reachable this way in a prior Step 0 check.
    chat_template_kwargs: { enable_thinking: true, preserve_thinking: true },
  },
});

const RETRY_BASE_MS = 1_000;
const RETRY_MAX_DELAY_MS = 60_000;
const RETRY_MAX_ATTEMPTS = 5;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Exponential backoff (1s, 2s, 4s, 8s, capped at 60s) around the raw call,
 * for transient failures (timeouts, network errors) - a separate layer from
 * both `maxRetries: 1` above and from `findPattern`'s own attempt-1/2 loop
 * (a business-logic retry for a NO_PATTERN_FOUND false negative, not a
 * network-failure retry; that loop doesn't catch a thrown error at all).
 *
 * NFR-2.1's "single retry" is about not doubling the worst case a user is
 * actively waiting on - it governs the INTERACTIVE control model, and
 * `exaoneReasoning` is explicitly never on that path (see the class doc
 * above). Retrying harder here costs a live demo nothing but time nobody is
 * watching a spinner for, so this exists on top of `maxRetries: 1` rather
 * than raising it.
 *
 * ponytail: 5 attempts is a chosen bound, not a derived one - discovery
 * still eventually gives up rather than holding `inFlight` forever against a
 * genuinely dead endpoint.
 */
export async function invokeExaoneWithRetry(messages: BaseMessage[]): Promise<AIMessage> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await exaoneReasoning.invoke(messages);
    } catch (err) {
      if (attempt >= RETRY_MAX_ATTEMPTS) throw err;
      const delay = Math.min(RETRY_BASE_MS * 2 ** (attempt - 1), RETRY_MAX_DELAY_MS);
      console.log(
        `[exaone] invoke failed (attempt ${attempt}/${RETRY_MAX_ATTEMPTS}), retrying in ${delay}ms: ${(err as Error).message}`,
      );
      await sleep(delay);
    }
  }
}

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
