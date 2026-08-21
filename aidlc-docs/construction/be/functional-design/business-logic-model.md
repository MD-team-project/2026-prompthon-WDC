# BE Business Logic Model

**Stage**: CONSTRUCTION - Functional Design, unit BE
**Created**: 2026-08-20T09:38:00Z
**Status**: COMPLETE. Stage approved 2026-08-20T09:41:52Z
**Companion documents**: `domain-entities.md`, `business-rules.md`

Four flows. The first two are the design; the last two are thin by decision.

---

## 1. The separation everything else follows from

**Agentic Control is interactive and on the request path. Skill Discovery is background and off it entirely.**

```
   REQUEST PATH (synchronous, interactive)          BACKGROUND (asynchronous)
   -----------------------------------------        -------------------------
   FE -> control agent -> device                    accumulated usage events
        Bedrock                                              |
        open data only                                       v
        never touches usage history               discovery graph, EXAONE
                                                  sensitive data only
                                                             |
                                                             v
                                                        Skill written
```

Two consequences worth stating because they are the reason for the split:

- **Discovery never blocks an interaction.** A discovery run can take as long as it takes.
- **No model calls a model on the request path.** The sensitive/open split is enforced by which module imports what, not by routing a Bedrock request through EXAONE.

---

## 2. Agentic Control flow

Depth: **BASELINE**. This flow is plumbing that must work, not a pillar.

```
1. FE posts a message with a language tag
2. Control agent for that product receives it
      model: Bedrock, streamed
      tools: getDeviceState, listCapabilities, applyCommand, listSkills, getSkill
      memory: in-memory checkpointer, per product
3. Agent selects zero or more tools
      applyCommand -> device -> device returns COMMITTED state
      listSkills / getSkill -> the skill documents, as prose
4. Response returns as TWO separate fields
      prose        <- the agent authored this
      deviceState  <- the device authored this, agent only forwarded it
```

**Step 4 is the whole of FR-5.5.** The agent may cause state to change and may read state. It is simply not the source of truth for what gets displayed. A model can write a sentence; it cannot fabricate a structured device response.

**Why skills are reached through tools rather than pasted into the system prompt** (decision S7): three products, an unbounded and growing skill list, and a prompt that would have to be rebuilt on every discovery. The cost is that tool selection is probabilistic - the agent might not call `listSkills` when it should. Mitigated by tool descriptions written to make selection likely, and by the system prompt stating that discovered skills exist and are reachable **without listing them**.

**Language** travels on the request and is passed to the model. Replies are text only; no speech synthesis.

---

## 3. Skill Discovery flow

Depth: **DEEP, autonomous, and the primary pillar.**

### 3.1 What starts a run

Nothing user-initiated. The trigger is **accumulated data volume crossing a threshold**:

```
device-stub buffers usage events in memory
        |
        | flush, batched
        v
BE appends events, increments "since last run" per product
        |
        | count >= 3 ?
        v
fire and forget a discovery run
```

- **Fire and forget.** The flush request returns immediately with an accepted count. It does not wait for the run.
- **Per product.** Each product has its own counter and its own in-flight guard.
- The threshold is 3, which is deliberately low enough that a few demo interactions cross it. Rationale and edge cases in `business-rules.md` section 2.

### 3.2 The run itself

A graph with phase nodes rather than one prompt, running on EXAONE with thinking enabled.

```
  gather ----> analyse ----> synthesise ----> validate ----> persist
    |            |               |               |              |
 read the     find a         write the       check it        write the
 usage        recurring      Markdown        is not a        Skill record
 window       pattern        document        restatement     and log it
                             + a title       of an
                                             existing skill
```

Each node transition is written to the **server log**, one line per phase.

**Progress is not streamed to the client.** *(Corrected 2026-08-20T09:52:38Z. An earlier version had discovery pushing per-phase progress over SSE, which over-read the requirement.)* SSE carries Agentic Control output only, with no exception carved out for discovery.

**An empty run is a normal outcome**, not a failure. `analyse` may find nothing, in which case the run ends without a skill and the counter resets.

### 3.3 How the user finds out

**FE polls the skill list.** Decided 2026-08-20T09:58:44Z.

This was the one place where three options each gave something up, so the reasoning is recorded:

| Option | Why not |
|---|---|
| Push over SSE | Would carve a discovery exception into a channel deliberately scoped to Agentic Control |
| Ride on the next chat turn | Breaks FR-3.6 - the announcement would no longer be unprompted |
| **FE polls the list** | **Chosen.** Announcement stays unprompted, SSE stays clean |

**BE's obligation is the list route and nothing more.** No push, no notification endpoint, no long-poll. Polling cadence is FE's decision.

**The cost is poll latency** - a gap between the skill existing and the screen showing it, bounded by the interval. Visible on stage, and the reason to keep the interval short.

**One implementation note that makes the cadence affordable**: the list response returns `id`, `title`, `status`, `createdAt` and **not** `content`. A few-second interval is then harmless, and fetching one document happens only when the user opens it.

---

## 4. Revision flow

```
user says the skill is wrong, from the skill card
        |
        v
control agent rewrites content in place
        |
        v
same id, same title, content replaced
```

**Identity is preserved deliberately** - the entity is corrected, not replaced. That is what makes US-3.4 read as the character learning rather than the character starting over.

**Rewrite semantics are parked** (Q5): whether the model regenerates the whole document, patches a section, or appends a correction. All three keep identity, so the decision can wait for the code. Retirement is unaffected either way - `status` moves to `retired` and the document is left as-is.

---

## 5. Progression flow

**There isn't one in BE.** Recorded as a flow anyway, because its absence is a decision that another unit depends on.

```
BE           writes a Skill, serves the skill list
FE           counts the list, derives level, plays the level-up
```

- No level, no exp, no thresholds, no `Character` record, no progression endpoint.
- Level does **not** gate skills. A skill is usable the moment it exists. The user reads the level-up as having earned it, which is the intended illusion and is presentation, not logic.
- FE owns the whole of it, which is consistent with the pillar depth: Character Progression is THIN and presentation-led.

---

## 6. Story traceability

| Story | Flow | State at end of scaffolding |
|---|---|---|
| US-1.1 control by speaking | 2 | Wired. Command reaches the device, structured state returns |
| US-3.1 discover unasked | 3 | Wired. Graph runs on threshold, produces a document |
| US-3.2 announce what and why | 3.2, 3.3 | Wired. Reasoning lives in `content`; FE polls the list to notice it |
| US-3.3 use a discovered skill | 2 | Wired through `listSkills` / `getSkill` and the invoke route |
| US-3.4 correct a skill | 4 | Route exists, identity preserved. Rewrite semantics parked |
| US-2.1 progression | 5 | BE contributes the skill list only. FE owns the rest |
| US-4.1 voice | - | Not in scope for BE Functional Design. Transcribe deferred until INFRA grants access |
| US-4.2 language | 2 | Language accepted on requests, passed to the model |
| US-5.1 demo path | all | Emerges from the above |

**Wired, not done.** Scaffolding makes each flow run end to end; it does not make the behaviour good.

---

## 7. The one risk this model cannot design away

**Discovery firing on cue for the demo.** The trigger is accumulated volume, so the timing is outside the presenter's control. If discovery stays silent during the show there is no lever to pull.

Raised by FE as an unresolved cross-unit risk and it belongs here too, because the trigger design is what creates it. Options exist - a low threshold, a pre-seeded fixture that fires on first boot, a manual escape hatch - but none of them is chosen at this stage. **Settle it early, not at rehearsal.**
