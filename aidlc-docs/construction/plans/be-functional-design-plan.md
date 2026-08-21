# BE Functional Design Plan

**Stage**: CONSTRUCTION - Functional Design, unit BE
**Created**: 2026-08-20T07:52:18Z
**Branch**: `construction/be`
**Status**: **COMPLETE and APPROVED 2026-08-20T09:41:52Z.** Section 2A redirected the stage from domain questions to structural ones; S1-S7 in section 4A are the decisions that closed it. Q5, Q6 and Q7 are **parked, not withdrawn** - they get decided against real code. Section 4 checklist fully executed; artifacts at `aidlc-docs/construction/be/functional-design/`.

---

## 1. Unit scope

From `unit-of-work.md` and the story map.

**BE owns**: three agents in a strict 1:1:1 binding, Skill Discovery, the skill lifecycle, the REST plus SSE API that FE calls, and `device-stub`.

**Stories where BE is primary**: US-1.1, US-3.1, US-3.2, US-3.3, US-3.4
**Stories where BE contributes**: US-2.1, US-4.1, US-4.2, US-5.1

**US-3.1 is the only story BE delivers alone**, and it is the deep pillar. It is also the one piece that can be finished and verified without waiting on FE or INFRA.

## 2A. Redirected 2026-08-20T08:41:19Z: structural questions, not domain questions

The questions in section 3 were aimed at domain modelling - what a skill is, how revision works, how progression is calculated. That is Functional Design's usual territory and it was the wrong thing to ask first.

**What is actually wanted: build the code structure first, then fill in state, tools and middleware one question at a time as construction proceeds.**

So the questions from here are structural - which library, which class, what goes where. Behaviour is decided later, against real code, rather than guessed now.

Questions Q5, Q6 and Q7 as originally written are **parked**, not withdrawn. Q5 (how feedback revises a document), Q6 (how many skills per run) and Q7 (placeholder capability vocabulary) are all real decisions, but they belong to the moment the corresponding code is being written. Q1 through Q4 stay answered, since those shaped what the structure has to hold.

## 2. What this stage decides, and what it does not

Functional Design is business logic, domain model and business rules. Technology-agnostic.

**In scope**: the skill domain model, discovery rules, validation rules, revision semantics, progression arithmetic, and the placeholder device vocabulary the scaffolding needs.

**Not in scope**, carried over from Inception's deferrals:
- Real product capability vocabularies, real attribute keys, authentic usage rhythms, device time model. Those belong to the per-product phase.
- Route paths, payload shapes, SSE event names, storage keys. Those are settled with FE directly during Construction, per the interface evolution policy.

The distinction that matters for the questions below: **placeholder vocabulary is in scope, authentic vocabulary is not.** The scaffolding needs *something* to compose skills over; it does not need the real thing.

---

## 3. Questions

**Convention changed 2026-08-20T08:12:49Z, at user request: one question at a time.** Ask, get the answer, then move to the next. No more batched lists.

Letter after each `[Answer]:` tag, or answer in chat.

### Question 1 - What is a skill, concretely?

Inception settled that a skill is "a composition over the capability vocabulary plus a trigger". This asks how literally to take that.

A) **Ordered list of steps plus one trigger.** `steps: [{capability, params}]`, `trigger: {kind, detail}`. No conditionals, no branching **(recommended: matches what discovery can realistically generate and what a demo can show)**

B) Steps plus trigger, plus an optional guard condition per step

C) A small expression tree - allows conditionals and sequencing operators

X) Other

[Answer]: X - a skill is a **Markdown document**, not an executable structure. Verbatim: "스킬 구조, md 파일로 사용자의 현재 제품 사용 데이터를 분석한 결과를 토대로 새로운 기능이나 모드를 describe. 어떠한 순서 있는 Step 목록이나 트리거는 설명 필요" and "다만 md file로 local 저장 대신, dynamo DB에 그냥 심플하게 저장 및 관리". Recorded 2026-08-20T08:04:36Z.

All three options above were wrong - each assumed a machine-executable composition.

**Definition**: a discovered skill is a Markdown document in which the agent **describes a new feature or mode**, derived from analysing that product's usage data. Any sequence of steps and any trigger condition are **described in prose inside the document**, not held as structured fields.

**Storage**: DynamoDB, held simply as a string field on the skill record. Not local `.md` files. Nothing about the document being Markdown implies a filesystem.

### Three consequences

**1. FR-3.4's mechanism relocates, and the guarantee survives.**

FR-3.4 required that a generated skill only reference capabilities that exist, so nothing hallucinated could reach a device call. That was enforced by validating a composition against the enumerated vocabulary. **A prose document cannot be validated that way** - it can describe anything, including things the device cannot do.

The guarantee does not disappear, it moves. Execution now happens by the **Bedrock control agent reading the document and acting on it**, and that agent can only call tools it actually has. So a description mentioning something impossible produces an agent that says it cannot do that, rather than a broken device call. **Bounded by the tool set at execution time instead of by validation at generation time.**

This is worth stating in `business-rules.md` explicitly, because the requirement text still describes the old mechanism.

**2. US-3.3 "use a skill" becomes: feed the document to the control agent.**

Invoking a skill means handing its Markdown to the Bedrock agent as instruction, and letting it resolve that into tool calls. Clean, and it reuses the control path that already exists rather than adding an execution engine.

**3. Nothing fires automatically.**

With the trigger described in prose rather than structured, there is nothing for a scheduler to read. Skills are proposals the user reads and invokes. This is consistent with the scaffolding scope, and US-3.4's revise-and-retire loop is unaffected. Flagging it because "trigger" in the requirements implied automatic firing.

### Question 2 - WITHDRAWN, replaced by Q2b

*Withdrawn 2026-08-20T08:04:36Z.* This asked which structured trigger kinds a skill could have. With skills being prose documents, there is no structured trigger field to enumerate. The trigger is described inside the document.

### Question 2b - What structure does the skill record keep outside the Markdown?

The document is prose, but the record it lives on needs some fields for the API and the UI to work with. How much?

A) **Minimal**: `id`, `productId`, `title`, `content` (the Markdown), `status`, `createdAt`. Everything else - what it does, when it applies, why it was created - lives inside `content` **(recommended: keeps one source of truth, and the UI can render a title plus a document)**

B) Minimal plus `summary` - a one-line description held separately, so the skill list does not have to parse Markdown to show something useful

C) Minimal plus `summary` plus `tier` (basic or advanced, from the analysis window)

D) Richer - also lift the trigger description and step count out into fields, duplicating what the document already says

X) Other

[Answer]: A - minimal. Verbatim: "Q2b A." Recorded 2026-08-20T08:12:49Z. Skill record fields: `id`, `productId`, `title`, `content` (the Markdown), `status`, `createdAt`. Everything about what the skill does, when it applies, and why it was created lives inside `content`. One source of truth; the UI renders a title plus a document.

Note that D was declined, which avoids reintroducing two representations of the same fact drifting apart.

**Consequence for the skill list**: with no `summary` field, FE either renders `title` alone or reads the opening of `content`. `title` alone is the simpler path and is sufficient for a list view.

**Consequence for provenance**: FR-5.11 forbids raw provenance crossing to the client, and there is no longer a separate `provenance` field to strip. The reasoning now lives inside `content`, which *does* cross to the client. So the rule becomes a **generation-time** constraint: EXAONE must write the document at a level of detail safe to show the user - describing the pattern it noticed, not dumping the underlying event log. Worth an explicit rule in `business-rules.md`.

### Question 3 - Discovery trigger threshold (FR-5.10)

A run fires when accumulated events cross a threshold. What threshold?

A) **A fixed count of new events since the last run, in the 3 to 5 range** **(recommended: crossable within a few demo interactions, which is the point of the mechanic)**

B) A count in the 10 to 20 range - more plausible as a product, too slow to demonstrate

C) Time-based instead: at most one run per N minutes, regardless of volume

D) Fixed count **and** a cooldown, so rapid interactions cannot fire several runs back to back

X) Other

[Answer]: A, with the threshold pinned by a demo requirement. Verbatim: "N값 A" and "데모르 위해서라면 2~3번의 interaction 이후 skill discovery 동작을 뒤에서 log로 보여주고 UI/UX에서 발견이 가능해야함". Recorded 2026-08-20T08:21:07Z.

**Threshold: 3 new events since the last run.** Chosen so that 2 to 3 interactions cross it, since one interaction produces roughly one event. This is now a **demo requirement rather than a tuning preference** - it must reliably fire within 2-3 interactions.

**Sub-decisions applied as defaults**, since these are BE internals and were not worth blocking on:
- **Concurrency**: if the threshold is crossed again while a run is in flight, **ignore it**. No queue, no parallel runs.
- **Empty run**: if a run finds nothing worth creating, **reset the counter**. The alternative burns an EXAONE call on every subsequent event.
- **Fixture on first boot**: the seeded history has no prior run, so every seeded event counts as new and any threshold is crossed immediately. **Allowed to fire.** The character has already studied your history when you first open the app, which is a free demo opening rather than a problem.

Say so if any of these three should be different.

### New requirement from this answer: discovery must be observable

The second half of the answer adds something the design did not have: **the discovery run must be visible as a log while it happens, and the resulting discovery must be findable in the UI.**

This is a genuine addition, not a restatement, and it crosses the FE/BE boundary - so it goes on the list of things FE and BE agree directly.

**Shape**: discovery emits progress events over the existing SSE channel as it moves through its phases - started, analysing, found or found-nothing, announced. FE renders them as a visible log.

**Why this matters more than it looks.** Discovery is background and asynchronous, which means that until now it was *invisible while running*. A user saw nothing, then a skill appeared. On stage, "nothing visible for eight seconds" is indistinguishable from "broken". A progress log converts dead air into the character visibly working, which is the difference between a pause and a failure.

**Three consequences.**

1. **This is the payoff for thinking mode.** I parked an idea earlier about showing EXAONE's reasoning as the character studying your usage; this request is that idea. The constraint from Inception is that thinking output must never render as *the character's speech* - a diagnostic log is not speech, so surfacing reasoning there is permitted and is the most interesting content the log can carry.

2. **EXAONE failure stops being invisible**, which reverses a property earlier documents listed as a safety benefit. That is the right trade: silence was only safe because nothing was expected to appear, and once a log is running, silence reads as broken. Visible failure beats ambiguous silence on stage.

3. **The log is a diagnostic surface, not chat.** It must be visually distinct from the character's messages, or the two blur and the character appears to be narrating its own internals.

### Question 4 - Progression arithmetic

BE holds the counters; FE presents them. FR-2.4 settled that **discovery causes the level-up**, not the reverse, and that nothing is gated by level.

A) **Level equals the number of skills discovered.** Exp is a separate cosmetic counter incremented per interaction, used only to fill a progress bar **(recommended: makes FR-2.4's causality exact, and no threshold table needs tuning)**

B) Exp accumulates per interaction, level derives from exp thresholds, and discovery additionally forces a level-up

C) Exp per interaction with a threshold table, and discovery is what grants the exp that crosses it

X) Other

[Answer]: **OUT OF BE SCOPE.** Verbatim: "그거는 FE가 알아서 할 거고 우리는 skill 발견 시 그걸 FE에 알려주면 된다". Recorded 2026-08-20T08:31:44Z.

Progression arithmetic belongs to FE. BE's entire obligation is to **tell FE when a skill is discovered**, plus serve the skill list.

### What this removes from BE

**The `Character` entity leaves BE's domain model.** BE stores no level, no exp, no progression state of any kind.

This works out cleanly rather than merely being a handoff. Level is derivable from the skill list, which BE already serves and which is already persisted in DynamoDB. So FE computes level itself, and **NFR-2.3 is satisfied without BE storing anything** - progression survives a refresh because the skills it derives from survive. An exp bar, if FE wants one, is cosmetic and may reset freely.

### BE's remaining progression-related obligations

1. Emit a discovery event to FE over SSE when a skill is created.
2. Serve the skill list on request.

That is all. No level field on any response, no progression endpoint, no exp counter.

### Question 5 - How does feedback revise a skill? (revised for Markdown skills)

*Revised 2026-08-20T08:04:36Z.* The original options assumed structured fields to patch. With prose, the question is how the document changes.

US-3.4 requires the skill to keep its identity and history rather than being replaced.

A) **Rewrite the document, same record.** EXAONE receives the current Markdown plus the user's feedback and returns a revised document. `id` and `createdAt` are untouched, and the previous version plus the feedback that caused the change are appended to a revision list **(recommended: simple, and identity plus history survive because they live outside `content`)**

B) Targeted edit - the model returns only the passage to replace. Less token cost, more fragile when the model's quoted passage does not match exactly

C) Append a revision note to the end of the document, leaving the original text intact. Honest history, but the document accumulates contradictions and the reader has to work out which part is current

X) Other

[Answer]: 

Retirement is unaffected either way: `status` moves to `retired` and the document is left as-is.

### Question 6 - What does one discovery run produce?

A) **At most one skill per run** **(recommended: one announcement is legible on stage, several at once is noise, and it keeps the level-up mapping one-to-one)**

B) Zero to three skills per run, all announced

C) Unbounded, whatever the model finds

X) Other

[Answer]: 

### Question 7 - Placeholder device vocabulary for `device-stub`

The scaffolding needs *some* capabilities and *some* event shape. Real ones are deferred.

*Note, 2026-08-20T08:04:36Z: this question matters less than it did.* With skills as prose, the capability vocabulary is no longer a validation bound on discovery. It is still needed as the control agent's tool set, which is what bounds execution - so the choice still matters, just for a different reason.

A) **Generic and product-neutral**: capabilities like `power`, `start`, `stop`, `setMode`, `setDuration`. Events as `<capability>_invoked` with the same params. Three products expose the same set **(recommended: smallest thing that gives the control agent real tools, and it cannot be mistaken for real product design)**

B) Lightly product-flavoured guesses - `dry` for ShoeCase, `massage` for the chair. More demo-legible, but invents product decisions that were deliberately deferred

C) One capability only, `power`. Discovery would have almost nothing to compose

X) Other

[Answer]: 

---

## 4. Execution checklist

**Executed and closed 2026-08-20T09:41:52Z.**

- [x] Confirm answers and resolve any ambiguity
- [x] Generate `be/functional-design/domain-entities.md` - entities, relationships, lifecycle states
- [x] Generate `be/functional-design/business-logic-model.md` - discovery pipeline, control flow, revision flow, progression flow
- [x] Generate `be/functional-design/business-rules.md` - validation, invariants, thresholds, failure rules
- [x] Verify every BE-primary story maps to rules that make it testable
- [x] Verify the FR-5.5 and FR-5.11 invariants appear as explicit rules, not assumptions
- [x] Record what remains deferred to the per-product phase
- [x] Mark checklist items complete, update `aidlc-state.md`, log in `audit.md`

No frontend-components artifact - BE has no UI.

**What the artifacts came out looking like, given section 2A.** The redirect to structural questions means the three documents are **deliberately thin on domain behaviour**. They record four entities, three of which are almost data-free, and they state each omission with its cost rather than leaving it implied. The two decisions that make them thin are the two most expensive guesses that were available at this point and were declined:

- a skill is a **Markdown document**, not a structured rule - no trigger DSL, no condition tree
- there is **no progression state in BE at all** - FE derives level from the skill list

`business-rules.md` carries 24 numbered rules and a four-item testable-properties section, so the BE-primary stories are testable even though the behaviour behind them is parked. It also carries a **delta section appended at Code Generation close-out** recording where the built code diverged from the design - notably that `status`-based retirement was replaced by hard delete, and that the four property-based tests in scope were never written.

## 5. Note on the first-hour verification

Independent of this plan, and worth doing before writing code: **tool calling on the dedicated Friendli endpoint.** If it fails, the control agent cannot call device tools and this design needs rework rather than adjustment. The other three checks - `modelKwargs` passthrough, thinking output shape, `seed` support - affect implementation detail rather than the design in this document.

---

## 4A. Structural questions

One at a time. Answers here shape the code structure; behaviour is decided later against real code.

### S1 - Agent and discovery construction

**A) Two abstractions, each fitting its job** — `createAgent` for control, `StateGraph` for discovery
**B)** `createAgent` for both
**C)** `StateGraph` for both
**D)** `createAgent` for control, plain async function for discovery, no LangGraph

[Answer]: A. Verbatim: "A로". Recorded 2026-08-20T08:47:52Z.

```
langchain                 -> createAgent            three Bedrock control agents
@langchain/langgraph      -> StateGraph             discovery pipeline
@langchain/aws            -> ChatBedrockConverse    control model
@langchain/openai         -> ChatOpenAI             EXAONE via Friendli baseURL override
@langchain/core           -> tool, messages         peer of the above
```

**Why not D**, which was the YAGNI candidate: a five-step pipeline with no branching genuinely does not need a graph framework, so D was a fair question. What tipped it was the Q3 answer - discovery must emit a per-phase progress log over SSE, and `StateGraph` streams node transitions natively. With a plain function, each phase needs a hand-placed emit. The difference is small, but it exists and it points one way.

`createAgent` also stays consistent with the Inception decision that the agent needs no module of its own - it is one framework call, not a layer.

### S2 - HTTP server

**A) Express 5** · B) Fastify · C) Hono · D) NestJS

[Answer]: A - Express 5. Verbatim: "A". Recorded 2026-08-20T08:55:31Z. Chosen over Hono despite Hono's built-in `streamSSE`, on the ecosystem argument: LangChain examples are overwhelmingly Express-based, and being able to paste reference code unchanged is a real time saving on a short clock.

**Accepted cost: SSE is hand-rolled.** Roughly 20 lines, but there are four things Express will not do for you, and all four fail quietly rather than loudly:

| Item | Why it matters |
|---|---|
| `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive` | Missing these and the browser buffers instead of streaming |
| `X-Accel-Buffering: no` | Only matters behind a proxy, which the conditional EC2 deployment would introduce |
| Client-disconnect handling on `req.on("close")` | Without it, dead streams accumulate and discovery keeps emitting to nobody |
| Keep-alive heartbeat, a comment line every ~15s | Idle connections get dropped, and the drop is silent |

This is worth writing once in a single helper rather than per-route. A silent SSE death means announcements and the Q3 progress log both stop, with no error anywhere - which on stage is indistinguishable from discovery being broken.

### S3 - Directory structure inside `packages/backend/src`

**A) Concern-based, flat** · B) Layered · C) Vertical feature slices · D) No folders

[Answer]: A. Verbatim: "A". Recorded 2026-08-20T09:02:14Z.

```
packages/backend/src/
  index.ts          bootstrap
  routes/           Express routers + the SSE helper
  agents/           createAgent construction, one per product
  tools/            agent tool definitions
  discovery/        StateGraph workflow
  skills/           skill persistence and retrieval
  models/           exaone.ts, bedrock.ts
  data/             DynamoDB access
  device/           device API client
```

**Why this over D**, which was the honest minimal alternative: eight folders for maybe fifteen files is arguable, and at scaffolding scale more so. What decides it is that this project has two boundaries to keep - FR-5.5 and FR-5.11 - and folders make them **checkable by looking**. Specifically, "no Bedrock tool reaches usage history" becomes a question about what `tools/` imports from `data/`. Without folders that boundary lives only in the import graph.

**Why not C**, which will be right later: vertical slices suit adding features, which is exactly what the per-product phase does. Right now there are only three slices and `shared/` would hold most of the code.

### S4 - TypeScript execution and build

**A) `tsx` watch for dev, `tsc` for build** · B) Node native type stripping · C) `tsup`/`esbuild` bundle · D) plain `tsc` watch

[Answer]: A. Verbatim: "A". Recorded 2026-08-20T09:08:47Z.

```
tsx        dev:   tsx watch src/index.ts
tsc        build: tsc
tsc        check: tsc --noEmit          separate script, not part of running
typescript, @types/node, @types/express
```

**Why not B**, which would have removed a dependency: Node's native type stripping behaves differently across versions, and three people running different local Node versions produces a failure that hits one person only. Discovering that at an integration checkpoint costs more than the dependency saves.

**The trap in A, stated so it is not discovered later**: `tsx` strips types without checking them, so **the server starts even when types are wrong.** Convenient in the moment, and it means a type error can survive a long stretch of work before anything notices. `tsc --noEmit` exists as its own script for that reason and should be run before each integration checkpoint.

Speed matters here specifically because the discovery pipeline gets tuned by repeated runs against EXAONE, and a compile step inside that loop is felt every iteration.

### S5 - Is `device-stub` a separate process?

**A) Separate process, separate port** · B) Same process, `/devices/*` routes · C) Same process, direct function calls

[Answer]: A. Verbatim: "A". Recorded 2026-08-20T09:15:33Z.

```
packages/device-stub/   standalone Express app, port 4000
packages/backend/       port 3000, reaches it via DEVICE_API_URL
concurrently            dev script runs both
```

**Why the separate process earns its cost.** FR-5.5 guarantees the agent forwards device state rather than authoring it. In a separate process **there is no other way to do it** - the agent has to ask over HTTP, because the state object is not in its memory. In option B the state object sits in the same process, so a rushed hour can produce code that reads it directly, and then the screen shows intent rather than committed state. That is the exact failure FR-5.5 exists to prevent, and it was already noted earlier that single-process boundaries decay under time pressure.

Cost is one `concurrently` dependency and one port. INFRA owns the local run procedure, so the two-process dev script is theirs.

**Second benefit for a parallel team**: a separate package means whoever touches `device-stub` does not collide with backend files. Fewer merge conflicts across three branches is a real saving, not a theoretical one.

### S6 - Agent instance lifetime, and the state split

**A) Three created at boot, held at module level** · B) Per request · C) One agent, product as a parameter · D) Lazy plus cache

[Answer]: A, with the state architecture specified. Verbatim: "checkpointer는 보통 state 중간 상태 저장, 이전 대화 이력 등을 위해서 사용되는데 시연을 목적으로는 Langchain In-Memory checkpointer로 커버하고, 구체적인 skill과 같이 필요한 항목은 따로 DynamoDB에서 불러와서 inject". Recorded 2026-08-20T09:24:06Z.

Three agents held for the process lifetime, each with its own in-memory checkpointer. C was not available regardless of convenience - one agent handling three devices is forbidden by FR-5.4, because it breaks the premise that each character learns its own product.

### The state split

| What | Where | Lifetime |
|---|---|---|
| Message history, intermediate agent state | **LangChain in-memory checkpointer** | Process. Lost on restart, accepted |
| Skills, and anything else durable | **DynamoDB**, read and **injected** at invoke time | Persistent |

**One property worth naming, because it removes a problem rather than solving one.** Skills live only in DynamoDB and are read fresh on each invoke, so there is **no cache to invalidate between the discovery pipeline and the control agent.** The background pipeline writes a skill; the very next control turn reads it. If skills had been held in the checkpointer instead, the two would need synchronising - a background write would have to reach into three live agent states, and getting that wrong would mean a character not knowing about a skill it had just announced.

The restart posture also stays consistent with what was already decided: a restart loses conversation scrollback, and loses nothing that matters.

### S7 - How skills are injected into the agent

A) System prompt · **B) Exposed as tools** · C) Hybrid · D) Runtime context

[Answer]: B. Verbatim: "B". Recorded 2026-08-20T09:31:18Z. Skills reach the agent through tools - `listSkills` and `getSkill` - which the model calls when it needs them. No skill content in the system prompt.

```
tools/skills.ts   listSkills(productId)      titles and ids
                  getSkill(productId, id)    the Markdown document
```

**What this buys**: token efficiency, and the document is read only when relevant. It also keeps the prompt stable in size as skills accumulate, so nothing degrades as the demo progresses.

**The failure mode to design against.** The model has to *decide* to call `listSkills`. If a user says "저녁 관리 루틴 실행해줘" and the model does not look, the character answers that it does not know of such a thing - while the skill sits in the database. On stage that reads as the product having forgotten what it just announced, and the cause is invisible.

Two cheap mitigations, both belonging to prompt work rather than structure:

1. The system prompt states that discovered skills exist and are reachable via `listSkills`, without listing them. Costs a sentence, and removes the model's need to infer that skills might exist.
2. Tool descriptions carry their own weight - `listSkills` described as the way to find out what this character has learned, rather than a bare name.

**Related**: the slash-command path from Q5 does not depend on the model's judgement at all. It can resolve the named skill directly and pass the document in, bypassing tool selection. That makes it the reliable path for stage use, which is what it was recorded as.
