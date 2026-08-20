# Step 0 Verification Results

**Run**: 2026-08-20T10:14:07Z
**Endpoint**: `api.friendli.ai/dedicated/v1`, model `depe675tjc2rcpo`

## Summary

| Check | Result |
|---|---|
| 1. Tool calling on the dedicated endpoint | ✅ **PASS** - blocking check cleared |
| 2. `chat_template_kwargs` passthrough | ✅ PASS |
| 3. Thinking output shape | ✅ Determined - **separate fields**, not inline |
| 4. `seed` support | ⏭️ Skipped, non-blocking |

**No rework required.** S1, S7 and the device-control design all stand.

## Check 1 - tool calling (blocking)

The endpoint returned a structured tool call with `finish_reason: "tool_calls"`:

```json
"tool_calls": [{
  "id": "call_sGJnJR400czGIZII1PL7IDwf",
  "type": "function",
  "function": { "name": "getDeviceState", "arguments": "{\"deviceId\": \"shoecase-01\"}" }
}]
```

This was the check that could have invalidated the architecture. The concern was legitimate - the tool-calling documentation found during Inception covered Friendli's *serverless* endpoints while this is a *dedicated* one - and it is now settled empirically rather than by assumption. `createAgent` with bound tools will work.

## Check 2 - `chat_template_kwargs` passthrough

Accepted at the top level of the request body, and thinking output appeared in the response, so it reached the model rather than being silently dropped.

Note for implementation: in the raw HTTP API this is a **top-level field**, not nested. Through LangChain's `ChatOpenAI` it has to travel via `modelKwargs` to end up in the same place.

## Check 3 - thinking output shape

**Separate fields, and `content` is already clean.** No `<think>` markers, no delimiters to strip.

```
message = {
  role, content,              // clean prose, safe to display
  reasoning,                  // the reasoning trace
  reasoning_content,          // same text as `reasoning` in observed responses
  tool_calls                  // when tools are used
}
```

### This reverses one planned task

Step 5 was going to build a `stripThinking` sanitiser. **It is not needed.** `content` requires no cleaning.

The work inverts: instead of removing reasoning from output, reasoning must be **read out** of a non-standard field if the progress log is to include it.

### The risk that replaces it

`reasoning` is not an OpenAI-standard field, so **LangChain's `ChatOpenAI` may discard it.** If it survives, it will likely appear in `additional_kwargs` or `response_metadata`, but which of those cannot be assumed and has to be observed.

Handling: check for it while writing Step 5. If LangChain drops it, the discovery log records node transitions only. That loses little now that progress goes to server logs rather than the UI - the reasoning trace would have been a nice extra, not the substance.

## Check 4 - `seed`, skipped

Deliberately not run. It was non-blocking from the outset, and verifying it means several slow calls at temperature 1.0 comparing outputs for equality. NFR-4.1 is already satisfied without it: temperature 0.1-0.3 for shape reproducibility, plus replay of a stored run as the stage reserve. `seed` would make that easier, not possible.

Revisit only if discovery reproducibility turns out to be a real problem during tuning.

## Credential note

The Friendli token was pasted into a chat transcript during setup. **It should be rotated in the Friendli console before the demo.** It currently lives only in `.env`, which is gitignored and untracked - verified before writing.
