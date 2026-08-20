import { Router } from "express";
import { HumanMessage } from "@langchain/core/messages";
import type { createAgent } from "langchain";
import type { AgentReply, DeviceState, ProductId, SkillSummary } from "@prompthon/shared";
import { getSkill, listSkills } from "../data/skills.js";
import { startSseStream, subscribe } from "./sse.js";

type Agent = ReturnType<typeof createAgent>;

// `output` on an on_tool_end event may be the raw string a tool returned, or
// a ToolMessage wrapping it - handle both rather than assume one. Checked
// structurally (power + attributes present) instead of by tool name, so a
// newly added device tool doesn't need to be added to an allowlist here too.
function parseDeviceState(output: unknown): DeviceState | undefined {
  const raw = typeof output === "string" ? output : (output as { content?: unknown } | undefined)?.content;
  if (typeof raw !== "string") return undefined;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return typeof parsed?.power === "string" && typeof parsed?.attributes === "object"
      ? (parsed as unknown as DeviceState)
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * One router per product, mounted at /api/characters/<productId> by the
 * caller - the product is fixed by which router this is, not a runtime
 * :productId param, so there's no per-request product validation to get
 * wrong or repeat.
 */
export function characterRouter(productId: ProductId, agent: Agent): Router {
  const router = Router();

  /**
   * The POST itself is the stream. Uses `.streamEvents()` - see chat
   * history for the confirmed StreamEvent shape and live Bedrock
   * verification notes.
   */
  router.post("/chat", async (req, res) => {
    const { message } = (req.body ?? {}) as { message?: unknown };
    if (message !== undefined && typeof message !== "string") {
      res.status(400).json({ failure: { code: "INVALID_REQUEST", message: "message must be a string" } });
      return;
    }

    // An empty/missing message means the user just opened this chat, not
    // that they asked something - FE's hook for "left and came back" (see
    // checkTodayForRelevantSkill's proactive-suggestion behavior).
    const isOpening = !message || !message.trim();
    const humanText = isOpening
      ? "[The user just opened this chat - they haven't said anything yet.]"
      : message;

    const emit = startSseStream(req, res);
    let prose = "";
    let deviceState: DeviceState | undefined;

    try {
      const stream = agent.streamEvents({ messages: [new HumanMessage(humanText)] });

      for await (const ev of stream) {
        if (ev.event === "on_chat_model_stream" && ev.name === "ChatBedrockConverse") {
          // Some tools (checkTodayForRelevantSkill) invoke EXAONE internally
          // for FR-5.11 reasons - that nested chat-model call also emits
          // on_chat_model_stream through the same trace, named "ChatOpenAI".
          // Only the control model's own stream is ever user-visible.
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
          const state = parseDeviceState(ev.data.output);
          if (state) {
            deviceState = state;
            emit({ type: "deviceState", state });
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

  // The route FE polls to notice new skills - omit `content` so polling stays cheap.
  router.get("/skills", async (_req, res) => {
    const summaries: SkillSummary[] = (await listSkills(productId)).map(({ content, ...rest }) => rest);
    res.json(summaries);
  });

  router.get("/skills/:skillId", async (req, res) => {
    const skill = await getSkill(req.params.skillId);
    if (!skill) {
      res.status(404).json({ failure: { code: "NOT_FOUND", message: "skill not found" } });
      return;
    }
    res.json(skill);
  });

  router.post("/skills/:skillId/invoke", async (req, res) => {
    const skill = await getSkill(req.params.skillId);
    if (!skill) {
      res.status(404).json({ failure: { code: "NOT_FOUND", message: "skill not found" } });
      return;
    }

    try {
      const instruction = `Follow this skill you previously discovered, and carry it out now:\n\n${skill.content}`;
      const result = await agent.invoke({ messages: [new HumanMessage(instruction)] });
      const last = result.messages[result.messages.length - 1];
      res.json({ prose: String(last?.content ?? ""), invokedSkillId: skill.id });
    } catch (err) {
      res.json({
        prose: "I couldn't run that skill just now.",
        failure: { code: "SKILL_STEP_FAILED", message: (err as Error).message },
      });
    }
  });

  // No separate feedback endpoint: revision and deletion happen through the
  // chat turn itself, via the control agent's updateSkill/deleteSkill tools.

  // Persistent per-product subscription for background events (Skill
  // Discovery progress and results) that don't arrive inside a chat turn.
  router.get("/events", (req, res) => {
    const emit = startSseStream(req, res);
    const unsubscribe = subscribe(productId, emit);
    req.on("close", unsubscribe);
  });

  return router;
}
