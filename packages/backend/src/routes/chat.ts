import { Router } from "express";
import { HumanMessage } from "@langchain/core/messages";
import { isProductId, type AgentReply, type DeviceState } from "@prompthon/shared";
import { getAgent } from "../agents/index.js";
import { startSseStream } from "./sse.js";

// Only these two tools return a structured device state - FR-5.5's forwarding point.
const DEVICE_STATE_TOOLS = new Set(["getDeviceState", "applyCommand"]);

// `output` on an on_tool_end event may be the raw string a tool returned, or
// a ToolMessage wrapping it - handle both rather than assume one.
function parseDeviceState(output: unknown): DeviceState | undefined {
  const raw = typeof output === "string" ? output : (output as { content?: unknown } | undefined)?.content;
  if (typeof raw !== "string") return undefined;
  try {
    return JSON.parse(raw) as DeviceState;
  } catch {
    return undefined;
  }
}

export const chatRouter = Router();

/**
 * The POST itself is the stream - no separate persistent /events
 * subscription needed for chat, since discovery never uses SSE anyway
 * (server logs only). Client POSTs the message and reads the response as
 * an SSE stream of ControlEvents, ending in one "done" event.
 *
 * Uses `.streamEvents()`, whose `StreamEvent` shape (`event`, `name`, `data`)
 * is confirmed from the installed `@langchain/core` type declarations
 * (event names follow `on_[runnable_type]_(start|stream|end)`).
 *
 * Verified against a live Bedrock call (2026-08-20): token deltas arrive via
 * `on_chat_model_stream`/`data.chunk.text`, and multi-step tool sequences
 * (getDeviceState, applyCommand) interleave correctly with `on_tool_end`,
 * with the final `deviceState` matching what was actually applied.
 */
chatRouter.post("/api/characters/:productId/chat", async (req, res) => {
  const { productId } = req.params;
  if (!productId || !isProductId(productId)) {
    res.status(404).json({ failure: { code: "NOT_FOUND", message: `unknown product ${productId}` } });
    return;
  }

  const { message } = (req.body ?? {}) as { message?: string };
  if (typeof message !== "string" || !message.trim()) {
    res.status(400).json({ failure: { code: "INVALID_REQUEST", message: "message is required" } });
    return;
  }

  const emit = startSseStream(req, res);
  let prose = "";
  let deviceState: DeviceState | undefined;

  try {
    const agent = getAgent(productId);
    const stream = agent.streamEvents({ messages: [new HumanMessage(message)] });

    for await (const ev of stream) {
      if (ev.event === "on_chat_model_stream") {
        const chunk = ev.data.chunk;
        const text =
          typeof chunk?.text === "string" ? chunk.text : typeof chunk?.content === "string" ? chunk.content : "";
        if (text) {
          prose += text;
          emit({ type: "token", text });
        }
      } else if (ev.event === "on_tool_start") {
        console.log(`[bedrock:${productId}] tool_call ${ev.name} <- ${JSON.stringify(ev.data.input)}`);
      } else if (ev.event === "on_tool_end") {
        console.log(`[bedrock:${productId}] tool_result ${ev.name} -> ${JSON.stringify(ev.data.output)}`);
        if (DEVICE_STATE_TOOLS.has(ev.name)) {
          const state = parseDeviceState(ev.data.output);
          if (state) {
            deviceState = state;
            emit({ type: "deviceState", state });
          }
        }
      }
    }

    const reply: AgentReply = { prose, deviceState };
    emit({ type: "done", reply });
  } catch (err) {
    // NFR-2.2: visible fallback, deviceState omitted so FE keeps the stats
    // already on screen rather than clearing them.
    const reply: AgentReply = {
      prose: prose || "Sorry, I couldn't reach the model just now. Please try again.",
      failure: { code: "MODEL_UNAVAILABLE", message: (err as Error).message },
    };
    emit({ type: "done", reply });
  } finally {
    res.end();
  }
});
