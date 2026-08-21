# Application Design Plan

**Stage**: INCEPTION - Application Design
**Created**: 2026-08-20T04:26:14Z
**Status**: **COMPLETE and APPROVED 2026-08-20T07:34:07Z.** All 8 questions in section 3 answered; every checklist step in section 4 executed. Read section 4a - four generated artifacts were deliberately discarded before approval and the stage outcome was collapsed into a single short `application-design.md`.
**Inputs**: `requirements.md` (rev 5), `stories.md` (rev 4), `execution-plan.md` (rev 5)

---

## 1. Scope of this stage

Two jobs, and the second is the one that matters for a 3-person build:

1. **Identify components, their responsibilities, and their interfaces.** High level only. Detailed business rules belong to Functional Design.
2. **Freeze the contracts** the three parallel streams will build against. Per `execution-plan.md` section 5 these are the DynamoDB schema, the application API, shared types, and the environment contract, plus the device API contract which is now BE-internal but still needs a written shape because it becomes a handoff artifact at hour 4.

**Component count is capped at 3 top-level components.** The workspace YAGNI guidance asks for an explicit flag above 3-4 for an MVP, and three is already the floor imposed by the two mandated boundaries. No separate top-level components for discovery, progression, or skill storage - those are modules inside the backend.

## 2. What is already decided

Recorded here so the questions below do not re-litigate settled ground.

| Area | Decided |
|---|---|
| Top-level components | 3: device stub, backend, frontend. Mapped to units INFRA / BE / FE |
| Language | TypeScript across all three |
| Agent framework | LangGraph with LangChain v1 `createAgent` and middleware |
| Agent topology | Strict 1:1:1. Three agent instances, no multiplexing (FR-5.4) |
| Runtime data flow | Device API to agent to UI, synchronous, not persisted |
| Accumulation flow | Device API buffers usage events, flushes to DynamoDB for Skill Discovery |
| Stats invariant | Structured device response passed through, never model-authored text (FR-5.5) |
| Skill representation | Composition over the enumerated capability vocabulary plus a trigger |
| Storage | DynamoDB primary for usage events, secondary for character state, skills, feedback |
| Speech | Transcribe in, text out. No Polly |
| Auth | None, single hardcoded user |
| Hosting | Local first, EC2 conditional |

---

## 2A. MANDATORY CONSTRAINT: EXAONE via Friendli

*Added 2026-08-20T04:52:07Z. Hackathon requirement, not a preference.*

### REVISED 2026-08-20T05:14:22Z: two models, split by responsibility

The constraint is no longer "EXAONE everywhere". It is a division of labour:

| Responsibility | Model | Rationale |
|---|---|---|
| **Agentic Control** - conversation, device commands | **Amazon Bedrock** via `ChatBedrockConverse` | Latency-sensitive path, most-used interaction in the demo |
| **Skill Discovery** | **EXAONE** via Friendli | The mandated model governs the deep pillar, which is the right place for it to be judged |
| **Sensitive data access** - LG product data, user data | **EXAONE** via Friendli | *Settled 2026-08-20T05:26:03Z.* EXAONE is the only path to data revealing user behaviour |
| **Simple current device stat** | **Amazon Bedrock**, direct access | *Settled 2026-08-20T05:26:03Z.* Current state is not personal, so no gateway is needed |

### Data classification, settled

The governance boundary is **data sensitivity**, not data kind. Worth stating in a form that can be reasoned about rather than memorised, because it is what keeps the design both compliant and fast:

> A single reading of "the shoe dryer has 25 minutes left" reveals almost nothing.
> Sixty days of when you dry your shoes reveals your schedule.

| Class | Contents | Access |
|---|---|---|
| **Sensitive** | Accumulated usage history, derived routines and preferences, anything revealing presence, sleep or personal-care patterns, discovered-skill provenance since it encodes habits | **EXAONE only.** Never logged, never sent raw to the client |
| **Open** | Current device state (power plus per-product attributes), capability list, character level and experience | **Bedrock direct**, no gateway |

Character level and experience sit in the open class deliberately - they are game state, not personal data.

**Enforcement is structural, not conventional.** Two separate access modules, and each model's tools reach only one:

```
packages/backend/src/data/deviceState.ts    <- reachable by Bedrock control tools
packages/backend/src/data/usageHistory.ts   <- reachable only by the EXAONE discovery workflow
```

Nothing in the Bedrock agent's tool set imports `usageHistory`. That is the entire mechanism, and it is checkable by inspection rather than depending on discipline - which matters, given the earlier finding that single-owner boundaries decay under time pressure.

**Three consequences.** The Bedrock control agent reads current device state directly, so there is no model-calling-a-model penalty on the interactive path, which was the concern that prompted this question. FR-5.5 holds unchanged, since current stats still arrive as structured device API responses via Bedrock tool calls. And NFR-1.5 gains a companion obligation: the sensitive class is never logged nor sent raw to the client.

Three consequences worth stating:

1. **Bedrock returns to the runtime.** The AWS surface is Bedrock, DynamoDB and Transcribe again, so the Round 1 Q2 AWS-central posture is restored rather than narrowed.
2. **Two wrappers, not one.** The `createExaone` factory specified below stands, and a second construction site is added for Bedrock. Both are single-site.
3. **The thinking-mode question dissolves entirely.** *Confirmed 2026-08-20T05:26:03Z.* `chat_template_kwargs` is an EXAONE feature, and after the Q4 and Q11 answers EXAONE is off the interactive path completely - discovery is background and async, and simple stats go to Bedrock directly. So thinking is simply **on** for EXAONE, with no latency cost anywhere. Question 13 is withdrawn rather than answered.

EXAONE still governs the mandated territory, and it governs the part the hackathon most likely cares about: the intelligence, not the plumbing.

### The original constraint, as first stated

- **EXAONE is the required model.** Text input only.
- Served over Friendli's OpenAI-compatible chat/completions interface at `https://api.friendli.ai/dedicated/v1/chat/completions`, authenticated with `FRIENDLI_API_KEY`, model identified by dedicated endpoint id.
- Sample call uses `temperature: 1.0`, `top_p: 0.95`, `presence_penalty: 0.0`, and `chat_template_kwargs: { enable_thinking: true, preserve_thinking: true }`.
- **Discovery content and internal device data must be reachable only through the EXAONE model.**

### What this changes in the stack

| Concern | Before | Now |
|---|---|---|
| Model | Amazon Bedrock via `@langchain/aws` | **EXAONE via Friendli**, `ChatOpenAI` from `@langchain/openai` with `baseURL` overridden |
| AWS surface | Bedrock, DynamoDB, Transcribe | **DynamoDB, Transcribe** only |
| Model credentials | AWS IAM | `FRIENDLI_API_KEY`, which NFR-1.1 and NFR-1.2 now cover instead of AWS model access |

Bedrock drops out of the runtime. The AWS-central posture from Round 1 Q2 narrows accordingly, and that is not a choice - the required model is not on Bedrock.

**Voice is unaffected.** EXAONE accepting text only does not remove voice input, because the pipeline already converts speech to text before the model sees it: browser capture, Transcribe streaming, then text into EXAONE. Nothing changes.

### Verified before relying on it

`createAgent` needs tool calling, and the entire device-control and data-access design rests on it. Confirmed from sources rather than assumed: EXAONE 4.0 introduces agentic tool use as a headline capability, and Friendli documents tool calling plus OpenAI SDK compatibility by base-URL substitution.

**Still to verify by you, and quickly**: the documentation found was for Friendli's serverless endpoints while the sample call targets a **dedicated** endpoint. Tool calling on that specific dedicated endpoint should be tested inside the first hour. If it turns out unavailable, the agent cannot call device tools and the architecture needs rework rather than adjustment - so this is the single highest-value ten-minute check available before construction starts.

### Specification: data reachable only through EXAONE

The instruction that discovery content and internal device data be accessible only through the model needs care, because read naively it collides with FR-5.5, which requires stats **not** to be derived from model-generated text. Both can hold, and the distinction is worth stating exactly:

> **EXAONE mediates *access*. EXAONE does not *author* values.**

Mechanically, this is ordinary tool-call result passthrough:

1. The client never receives raw device or usage data from a direct data endpoint. There is no `GET /devices/:id/state` for the browser to call.
2. Data leaves the server toward the client only as the **result of an EXAONE tool call**. The model decides to call `getDeviceState` or the discovery workflow reads usage through its own step.
3. The response envelope carries **two separate things**: the model's prose, and the **structured tool results** unchanged.
4. The UI renders stats from the **structured part**. It never parses the prose.

So the model is on the access path, satisfying the constraint, while the numbers on screen are structured tool output rather than tokens the model produced - satisfying FR-5.5. The clamping test still works: if the device returns 25 where 30 was asked, the structured result says 25, and only a UI reading prose would show 30.

For discovery the constraint is satisfied naturally. Usage history is read inside the discovery workflow by EXAONE, and what reaches the client is the resulting skill plus its provenance, never the raw event log.

**One open consequence** is Question 11 below: initial page load has no agent turn to attach a tool result to.

### Specification: wrapping EXAONE as a LangChain chat model

*Added 2026-08-20T05:01:44Z on request.*

Because Friendli speaks the OpenAI chat/completions protocol, EXAONE does not need a custom LangChain integration. It needs `ChatOpenAI` pointed somewhere else. That is the whole trick, and it matters because it means `createAgent`, middleware, tool binding, and the LangGraph discovery workflow all work unchanged.

#### Single construction site

**Exactly one file constructs the model.** Everything else receives it as a parameter.

```
packages/backend/src/model/exaone.ts   ->  createExaone(opts): ChatOpenAI
```

This is worth being strict about for three reasons. The endpoint id is an opaque string that will change between environments. The `chat_template_kwargs` escape hatch is easy to get subtly wrong and should be written once. And if the dedicated-endpoint tool-calling check fails, there is exactly one place to change.

#### The wrapper

```typescript
import { ChatOpenAI } from "@langchain/openai";

export interface ExaoneOptions {
  /** Thinking mode. On for discovery, off for chat control per Q13. */
  thinking: boolean;
  /** Defaults to 0.2 for discovery stability, not the sample's 1.0. */
  temperature?: number;
}

export function createExaone(opts: ExaoneOptions): ChatOpenAI {
  return new ChatOpenAI({
    // Friendli identifies the model by dedicated endpoint id, not a model name.
    model: requireEnv("FRIENDLI_ENDPOINT_ID"),
    apiKey: requireEnv("FRIENDLI_API_KEY"),
    configuration: {
      baseURL: process.env.FRIENDLI_BASE_URL
        ?? "https://api.friendli.ai/dedicated/v1",
    },
    temperature: opts.temperature ?? 0.2,
    topP: 0.95,
    presencePenalty: 0.0,
    // NFR-2.1: timeout plus one bounded retry.
    timeout: 30_000,
    maxRetries: 1,
    // chat_template_kwargs is not an OpenAI parameter. modelKwargs is the
    // documented escape hatch for extra body fields in ChatOpenAI.
    modelKwargs: {
      chat_template_kwargs: {
        enable_thinking: opts.thinking,
        preserve_thinking: opts.thinking,
      },
    },
  });
}
```

Two named instances, created once at startup:

```typescript
export const exaoneChat      = createExaone({ thinking: false });               // control path
export const exaoneReasoning = createExaone({ thinking: true, temperature: 0.3 }); // discovery
```

#### How it plugs into what is already decided

| Consumer | Usage |
|---|---|
| Agent (Q6: no module, one framework call) | `createAgent({ model: exaoneChat, tools, middleware })` |
| Discovery (Q6: LangGraph workflow) | Workflow nodes call `exaoneReasoning.invoke(...)` directly |
| Tool calling | Standard OpenAI-format tool schemas. `createAgent` binds them; Friendli forwards them to EXAONE |
| Streaming | `ChatOpenAI` streaming for chat replies. Independent of the SSE channel from Q3, which carries unprompted announcements rather than tokens |

#### Thinking-token sanitisation

With `enable_thinking` on, the response carries reasoning content that **must never render as the character's speech**. A single sanitiser sits between the model and anything user-facing.

**Do not assume the shape of this output.** It may arrive inline in `content` inside delimiters, or in a separate field such as `reasoning_content`. Which one it is has to be observed against the real endpoint. The design is therefore: one `stripThinking(message)` function, its internals written after a single test call, and every user-facing path goes through it. Note that `preserve_thinking: true` also retains reasoning in conversation history, which consumes context - so it is on only for discovery, where history is short.

#### Environment contract additions

Owned by INFRA even though these are not AWS values, since INFRA owns the environment contract:

| Variable | Purpose |
|---|---|
| `FRIENDLI_API_KEY` | Bearer token. Server-side only, per NFR-1.1 and NFR-1.2 |
| `FRIENDLI_ENDPOINT_ID` | Dedicated endpoint id used as the `model` field |
| `FRIENDLI_BASE_URL` | Overridable, defaults to the dedicated URL |

#### First-hour verification checklist

All four are cheap, and each one invalidates part of the design if it fails. They belong in the hour 0 to 1.5 contract session, not in construction.

1. **Tool calling on the dedicated endpoint.** Bind one trivial tool and confirm a tool call comes back. *If this fails, the agent cannot control devices and the architecture needs rework.*
2. **`modelKwargs` passthrough.** Confirm `chat_template_kwargs` actually reaches Friendli and changes behaviour, rather than being silently dropped.
3. **Thinking output shape.** One call with thinking on, to see where reasoning content appears. Determines `stripThinking`.
4. **`seed` support.** Not in the sample call, so probably unsupported - but if Friendli honours it, NFR-4.1 determinism becomes far more attainable and Question 12 gets an easier answer. Worth one call to find out.

### Two conflicts this constraint creates

**Conflict A - NFR-4.1 determinism is no longer achievable as written.** NFR-4.1 requires discovery to be deterministic given the same fixture and feedback state. That was written when discovery might have been rule-based. Now discovery reasoning must go through EXAONE, and language model output is not reproducible - the sample call's `temperature: 1.0` makes it emphatically so, and even at temperature 0 reproducibility is not guaranteed. The requirement as stated cannot be met. Question 12 decides how to restate it.

**Conflict B - thinking mode cuts both ways.** `enable_thinking: true` improves reasoning quality, which discovery wants, at the cost of latency and extra output that must not be shown as the character's speech. Chat control is the most latency-sensitive path in the demo and gains least from deep reasoning. Question 13 splits this.

## 3. Questions

Letter after each `[Answer]:` tag. `X` plus text if nothing fits. Answer in chat if easier and I will transcribe.

### Question 1 - Repository structure

Three people, shared types, 1.5 days.

A) **Monorepo with workspaces**, one repo, packages for `device-stub`, `backend`, `frontend`, `shared` **(recommended: `shared` becomes an imported package rather than three hand-copied type files, which `execution-plan.md` section 5 identifies as a failure mode that shows up within hours)**

B) Monorepo, single `package.json`, folders without workspace boundaries - simpler tooling, but shared types get imported by relative path across the tree

C) Three separate repositories - clean ownership, but shared types must be published or duplicated, and duplication is the thing to avoid

X) Other

[Answer]: A - monorepo with workspaces. Verbatim: "A, 이미 git 구성완료 각자 branch에서 작업 후 PR 리뷰 후 머지 예정". Recorded via chat, 2026-08-20T04:35:41Z.

**Collaboration workflow recorded**: git already set up. Each of the three works on their own branch, opens a PR, gets review, then merges. This fits the parallel plan well and adds one thing worth naming: PR review is a serialisation point. With three people merging into one repo on a 1.5-day clock, a review that waits blocks a stream. Suggested convention, to confirm during Units Generation rather than debated here - contract and shared-type changes get reviewed properly, while within-package changes on your own unit can merge on a light review, since nobody else is touching those files.

### Question 2 - Frontend framework

A) **Vite plus React** - fastest cold start, no SSR machinery, a plain SPA calling the backend **(recommended for a 1.5-day build)**

B) Next.js - more batteries, but app-router conventions and server components add decisions this project does not need, and its server layer duplicates the backend that already exists

C) Something else

X) Other

[Answer]: A - Vite plus React. Verbatim: "A". Recorded via chat, 2026-08-20T04:35:41Z. Plain SPA calling the backend, no SSR.

### Question 3 - How does an unprompted announcement reach the browser?

The most consequential interface question in this stage. FR-3.6 requires the character to announce a discovered skill **without the user having sent anything**, so the browser has to learn about a server-side event it did not request.

A) **Server-Sent Events** - one long-lived GET, server pushes announcements, browser reconnects automatically. Unidirectional, which is all that is needed since user input already goes over normal requests **(recommended: least machinery for exactly this shape of problem)**

B) WebSocket - bidirectional, more capable, more to manage. The extra direction is unused

C) Polling every few seconds - simplest to write, but a poll interval is visible on stage as a delay between the discovery happening and the character mentioning it

D) No push at all - discovery results appear only when the user next sends a message, and the announcement rides on that response. Cheapest, but the announcement stops being unprompted, which weakens FR-3.6 to the point of contradicting it

X) Other

[Answer]: A - Server-Sent Events. Verbatim: "A". Recorded via chat, 2026-08-20T04:35:41Z. One long-lived GET per character screen, server pushes announcements, browser reconnects automatically. Unidirectional; user input continues over normal requests. This closes the FR-3.6 transport gap.

### Question 4 - What starts a discovery run?

FR-3.2 settles that a run completes without human intervention once started. It does not say what starts it, and nothing else in the requirements does either. This is a genuine gap.

A) **On demand, triggered by an explicit action in the UI** - a "let the character study your usage" affordance. Honest about being a demo, and gives the operator control of timing on stage **(recommended: predictable, and NFR-4.1 determinism is easiest to demonstrate this way)**

B) **On session start** - a run executes when a character screen is opened, so the announcement lands as the user arrives. Strongest first impression, but pushes a slow model call onto the load path, which NFR-4.2 warns against

C) **On a timer** - runs every N minutes while the app is open. Most lifelike, least controllable, and worst on a stage where timing matters

D) **After accumulated usage crosses a threshold** - most principled and most faithful to the product story, but needs live usage to accumulate, which the seeded fixture mostly substitutes for

E) A and B together: automatic on first open, manually repeatable afterwards

X) Other

[Answer]: *Pending - elaboration requested. Verbatim: "발견 실행 elaborate". Expanded below.*

### Question 4 expanded

**First, what a discovery run actually is.** A single pass that:

1. Reads accumulated usage for one product - the seeded fixture, plus any events flushed during the session
2. Looks for behavioural patterns in it
3. Decides, unaided, which patterns are worth turning into a skill
4. Composes each skill over the enumerated capability vocabulary, plus a trigger condition
5. Records provenance - which observations motivated it
6. Emits an announcement, which reaches the browser over SSE per the Q3 answer
7. Fires a level-up presentation, since discovery is what causes levelling per FR-2.4

Steps 2 through 5 are the LangGraph workflow from your Q6 answer. This question is only about **what invokes step 1.**

**The point that resolves most of the anxiety here.** Autonomy in this product means the agent decides **what** to create, with no human proposing candidates and no human approving results. It does **not** mean the agent decides **when** to run. FR-3.2 is precise about this: *once started, a run completes without human intervention.* Something starting it is assumed, not prohibited.

So a button labelled "let your character study your usage" does **not** weaken the autonomy claim. What would weaken it is a human filtering, approving, or seeding the output - which nothing here does. Worth being clear about internally, because it is easy to talk yourself out of the cheapest option on a misplaced purity concern.

**The options, with mechanics**

| | Trigger | Mechanics | Stage behaviour | Cost |
|---|---|---|---|---|
| **A** | Explicit UI action | `POST /characters/:id/discover`, SSE announcement follows | Operator fires it exactly when wanted | Lowest. One route, one button |
| **B** | Character screen opened | On mount, run if none recently | Announcement lands as the judge arrives - strongest single moment | Puts a slow model call on the load path, which NFR-4.2 warns against |
| **C** | Timer while app is open | Interval in the server | Lifelike, but may fire mid-sentence during a demo | Low to build, high to control |
| **D** | Accumulated-usage threshold | Count flushed events, run at N | Most faithful to the product story | Needs live accumulation; the fixture is static, so N is nearly arrived at already |
| **E** | B then A | Auto on first open, repeatable after | Strong open plus operator control | B's load-path cost, plus both paths to test |

**Recommendation: A, with a caveat worth hearing.**

A is recommended on controllability and cost. But it has one real weakness: a judge watching someone click a button before the character "spontaneously" notices something may read the spontaneity as staged. That is a presentation problem rather than an architectural one, and it has cheap presentation fixes - trigger it from the character screen as an in-world action the character responds to, or fire it during a natural pause rather than as a visible click before the payoff.

**If the demo narrative matters more than control, E is the honest second choice.** The strongest possible version of this demo is a judge opening a character and being told something about their own habits without asking. E buys that while keeping A's reliable repeat for later beats. The cost is real though: B's path puts a model call on screen load, and you would be testing two trigger paths instead of one on a 1.5-day clock.

**D is the one to resist**, despite being the most principled. With a static fixture the threshold is already effectively met, so it collapses into either A or B with extra machinery in between.

[Answer]: 

### Question 5 - How is a discovered skill invoked?

A) **Through the agent** - the user asks in chat, the agent recognises the skill and runs it. Keeps one entry point and matches the no-buttons thesis **(recommended)**

B) Direct from the UI - a run button on each skill in the list. Legible, but reintroduces a control surface the product argues against

C) Both - chat for the thesis, button as demo insurance

X) Other

[Answer]: A, with two invocation paths, both through the agent. Verbatim: "A, slash command를 통해 prompt input으로 넣거나(manual), 그냥 Text나 음성으로 기술 이름 명시(autonomous)". Recorded via chat, 2026-08-20T04:35:41Z.

- **Explicit path**: a slash command naming the skill, entered as prompt input. Deterministic, and useful as demo insurance without adding a UI button.
- **Natural path**: the user mentions the skill in ordinary text or speech and the agent recognises and runs it.

Both arrive through the chat surface, so no device control panel is reintroduced and the no-buttons thesis holds. The slash command is worth noting as the reliable path for stage use, since natural recognition depends on the model.

### Question 6 - Backend module granularity

Top-level components are capped at 3, so this is about named modules inside the backend, which determines how `component-methods.md` is organised.

A) **Four modules**: `agent` (runtime, tools, middleware), `discovery` (analysis, skill synthesis), `skills` (representation, lifecycle, revision), `api` (HTTP surface, Transcribe endpoint) **(recommended)**

B) Two modules: `agent` and `api`, with discovery and skills as internal files of `agent`

C) Six or more, splitting discovery into analysis and synthesis, and skills into store and lifecycle

X) Other

[Answer]: X - lighter than A, with implementation mapped per concern. Verbatim: "agent는 기본적으로 create_agent를 활용예정, 모듈도 필요없음(langchain 함수 하나로 커버), discovery는 langgraph workflow로 구성, skills는 langgraph state 및 dynamoDB연동/API는 boto3". Recorded via chat, 2026-08-20T04:35:41Z.

Resulting structure - four concerns, but only three of them are real modules since the agent needs none:

| Concern | Implementation | Module? |
|---|---|---|
| Agent | `create_agent` / `createAgent` directly, one framework call | **No module.** A thin construction site, not a layer |
| Discovery | A LangGraph **workflow** - an explicit graph rather than agent tool-calling | Yes |
| Skills | LangGraph **state** plus DynamoDB persistence | Yes |
| API | HTTP surface plus AWS SDK calls | Yes |

Noting that discovery being an explicit LangGraph workflow rather than an agent behaviour is a good decision and directly supports NFR-4.1: a graph runs the same nodes in the same order every time, whereas a model deciding whether to call a discovery tool does not. It also aligns with the Question 8 recommendation, which wanted discovery callable without a conversation.

**Language check raised and resolved, 2026-08-20T04:41:09Z.** The answer specified `boto3`, which is Python-only, against a project specified as TypeScript since Round 1 Q5. Raised as potentially blocking because it would have determined whether the `shared` package from Question 1 could exist at all - a Python backend cannot import TypeScript types, which would have forced either hand-duplicated types or a generation step.

User confirmed JavaScript has its own AWS client, which it does. **TypeScript stands, and `boto3` maps to these:**

| Purpose | Package |
|---|---|
| DynamoDB | `@aws-sdk/client-dynamodb` plus `@aws-sdk/lib-dynamodb` for the document client, which removes attribute-value wrapping |
| Transcribe streaming | `@aws-sdk/client-transcribe-streaming` |
| Bedrock | `@langchain/aws` with `ChatBedrockConverse`, preferred over calling the SDK directly since it passes straight into `createAgent` as the model |

AWS SDK v3 is modular per service, so only these are installed. Note also that agent construction is `createAgent` in camelCase, not `create_agent` - the JS API confirmed earlier.

The `shared` package therefore survives intact, which was the point of the check.

### Question 7 - Device stub state across restarts

Runtime device state is deliberately not persisted (FR-5.5 revision). So a backend restart resets every device to its default.

A) **Accept it** - devices return to default on restart, and the fixture plus DynamoDB character state carry everything that matters **(recommended: character progress and skills already survive, which is what NFR-2.3 actually requires)**

B) Persist device state to a local file so a restart preserves it - small effort, removes a mid-demo surprise if the process is restarted

C) Persist device state to DynamoDB after all - reverses the revision 5 decision

X) Other

[Answer]: A - accept the reset. Verbatim: "A(memory는 어차피 in-메모리를 활용할 것이기에)". Recorded via chat, 2026-08-20T04:35:41Z. Consistent with the LangGraph in-memory checkpointer already chosen for conversation threads: a restart loses device state and chat scrollback, while character progression, skills, and accumulated usage events survive in DynamoDB. That is exactly what NFR-2.3 requires and no more.

### Question 8 - Service layer shape

How the pieces are orchestrated behind the API.

A) **Thin services, agent-centred** - the API layer calls a small service per use case, and the agent owns conversational orchestration. Discovery is a service the API can invoke directly without going through an agent turn **(recommended: keeps discovery testable in isolation, which matters because it is the deep pillar)**

B) Agent-only - everything including discovery is triggered through an agent turn. Fewer concepts, but discovery becomes hard to test without a conversation

C) Full service layer with an orchestrator in front of the agents - more structure than a 1.5-day build can justify

X) Other

[Answer]: *Pending - elaboration requested. Verbatim: "선택 사항에 대해 더 자세히 설명". Expanded below.*

### Question 8 expanded

This is only about **what sits between an HTTP route and the work**, and it matters for one concrete reason: whether a discovery run can execute without a conversation happening first.

**Option A - thin services, agent-centred**

```
POST /chat                 -> ChatService      -> agent (createAgent)
POST /discover             -> DiscoveryService -> LangGraph discovery workflow
GET  /skills               -> SkillService     -> DynamoDB
POST /skills/:id/feedback  -> SkillService     -> revision path
GET  /stats                -> DeviceService    -> device API client
```

One small service per route. The agent owns conversational orchestration only, and discovery is a **peer** of the agent rather than something underneath it. A discovery run is an ordinary function call.

**Option B - agent-only**

```
POST /chat -> agent -> tools: [control..., runDiscovery, listSkills, reviseSkill]
```

Everything is a tool. To run discovery you send a message and hope the model decides to call `runDiscovery`. Fewer concepts, reads elegantly, but the trigger becomes a model decision.

**Option C - orchestrator above the agents**

An orchestration layer coordinating the three agents, routing work between them, managing shared context. Real multi-agent systems need this. Three independent 1:1:1 agents that never talk to each other do not.

**Why A, concretely**

The Q6 answer already made discovery a **LangGraph workflow** rather than agent tool-calling. Option B would wrap that deterministic graph inside a non-deterministic trigger, defeating the reason for making it a graph. NFR-4.1 requires discovery to be deterministic given the same fixture and feedback state - and under B, *entry* to that determinism depends on whether the model chose to call the tool on that run. The property you committed to could not be cleanly demonstrated.

There is a stage consequence too. Under A the Q4 trigger is a POST the UI or operator fires reliably. Under B, triggering discovery in front of judges means typing something and hoping the model cooperates.

A also costs almost nothing - four or five small functions, not a framework.

**When C would become right**: if characters started collaborating, the ShoeCase agent telling the Massage Chair agent about an evening routine. Interesting product direction, explicitly out of scope here.

[Answer]: 

---

## Question 11 - Initial page load, given EXAONE-only data access

If the browser cannot fetch device state directly, then opening a character screen has no tool result to render stats from, because no agent turn has happened yet.

A) **A silent agent turn on load.** The screen opens, the server runs one EXAONE turn whose tools fetch device state, and the structured results populate the stats. The model's prose is discarded or used as a greeting. Fully honours the constraint, costs one model call per screen open **(recommended if the constraint is strict)**

B) **A read endpoint that is itself an EXAONE tool call server-side.** `GET /characters/:id/stats` runs the same tool through the model internally. Same guarantee, less conversational overhead, but it is a thin wrapper whose only purpose is to satisfy the constraint

C) **Treat the constraint as applying to usage and discovery data only**, and let current device state be read directly. Cheapest and fastest, but a narrower reading of your instruction than what you wrote

D) **Cache the last tool result** and render it on load, refreshing on the first real interaction. Fast open, but the stats shown at open are from the previous session

X) Other

[Answer]: 

---

## Question 12 - Restating NFR-4.1 now that discovery must run through EXAONE

A) **Reproducible in shape, not in wording.** The same fixture yields skills of the same kind and trigger, while names and phrasing may vary. Set temperature low, around 0.1 to 0.3, rather than the sample's 1.0 **(recommended)**

B) **Pre-compute and replay.** Run discovery ahead of the demo, persist the result, and have the demo replay it. Guarantees stage behaviour exactly. Still genuinely autonomous, since no human filtered the output - just produced earlier

C) **A, with B held in reserve.** Run live, but keep a cached good run available if the live one produces something weak on stage **(recommended alongside A - this is cheap insurance for the demo's single most important moment)**

D) Drop the determinism requirement entirely and accept variance

X) Other

[Answer]: C - reproducible in shape, with a cached run held in reserve. Verbatim: "C". Recorded via chat, 2026-08-20T05:34:18Z.

NFR-4.1 restatement: *the same fixture and feedback state shall yield skills of the same kind and trigger, though names and phrasing may vary.* Temperature 0.1 to 0.3 rather than the sample's 1.0. A previously computed run is retained and may be replayed if a live run produces a weak result on stage.

**The reserve costs almost nothing here**, which is why C is affordable. Discovery is now background and asynchronous per FR-5.9, so a run already persists its result. "Pre-computed run" and "just-computed run" are structurally the same artifact, and replay is reading a stored result rather than a separate mechanism built for demo insurance.

---

## Question 13 - Thinking mode

`enable_thinking` and `preserve_thinking` from the sample call.

A) **Thinking on for discovery, off for chat control.** Discovery is where reasoning quality matters and where a few seconds of latency is acceptable. Chat control is the latency-sensitive path and gains least. Two model configurations, which is a few lines **(recommended)**

B) On everywhere, as in the sample call. Simplest, but adds latency to every command in the demo's most-used interaction

C) Off everywhere. Fastest, weakest discovery reasoning, which undercuts the deep pillar

X) Other

[Answer]: 

**Worth considering separately**: thinking output must never be rendered as the character's speech. But it could be shown *deliberately* during a discovery run as the character visibly studying your usage - a progress surface rather than a spinner. That would turn a latency cost into a demo asset. Not part of this question; raised for Functional Design.*Pending - elaboration requested. Verbatim: "선택 사항에 대해 더 자세히 설명". Expanded below; answer still needed.*

### Question 8 expanded

The question is only about **what sits between an HTTP route and the work**, and it matters for exactly one reason: whether a discovery run can be executed without a conversation happening first.

**Option A - thin services, agent-centred**

```
POST /chat            -> ChatService      -> agent (createAgent)
POST /discover        -> DiscoveryService -> LangGraph discovery workflow
GET  /skills          -> SkillService     -> DynamoDB
POST /skills/:id/feedback -> SkillService -> revision path
GET  /stats           -> DeviceService    -> device API client
```

Each route calls one small service. The agent owns conversational orchestration only, and discovery is a peer of the agent rather than something underneath it. A discovery run is an ordinary function call.

**Option B - agent-only**

```
POST /chat -> agent (createAgent) -> tools: [control..., runDiscovery, listSkills, reviseSkill]
```

Everything is a tool. To run discovery you send a message and hope the model decides to call `runDiscovery`. Fewer concepts, and it reads elegantly, but the trigger path becomes a model decision.

**Option C - orchestrator above the agents**

An orchestration layer coordinating the three agents, routing work between them, managing shared context. Real systems need this. Three independent 1:1:1 agents that never talk to each other do not.

**Why A is recommended, concretely**

Your Q6 answer already decided discovery is a **LangGraph workflow** rather than agent tool-calling. Option B would then wrap a deterministic graph inside a non-deterministic trigger, which defeats the reason for making it a graph. NFR-4.1 requires discovery to be deterministic given the same fixture and feedback state, and under B the *entry* to that determinism depends on whether the model chose to call the tool on that particular run - so you could not cleanly demonstrate the property you committed to.

There is also a demo consequence. Under A, the Q4 trigger is a POST that the operator or the UI can fire reliably. Under B, triggering discovery on stage means typing something and hoping the model cooperates.

A also costs almost nothing. These are four or five small functions, not a framework.

**Where C would become right**: if characters started collaborating - the ShoeCase agent telling the Massage Chair agent about an evening routine. That is a genuinely interesting product direction and explicitly out of scope for this build.

X) Other

[Answer]: 

---

## Question 9 - Backend language: Python or TypeScript? (BLOCKING)

*Added 2026-08-20T04:35:41Z after the Q6 answer.*

The Q6 answer specified **`boto3`**, which is the Python AWS SDK, and wrote **`create_agent`** in Python snake_case. But Round 1 Q5 selected **TypeScript / Node.js**, and every document since has recorded TypeScript. These cannot both hold.

This is not a naming quibble. It determines whether the `shared` package agreed in Question 1 can exist, and that package was the specific defence against three hand-maintained copies of the skill type drifting apart.

**Option A - TypeScript backend**, as originally decided
- AWS SDK is `@aws-sdk/client-dynamodb` and friends, **not** `boto3`
- Agent construction is `createAgent` from `langchain`, which I verified earlier does exist in JS with middleware support
- **`shared` package works as intended**: one set of types imported by both backend and frontend
- One language across all three units, so anyone can read anyone's code during a 1.5-day crunch
- Cost: LangGraph's Python ecosystem is more mature, and Python examples outnumber JS ones. Checkpointer options in JS are memory, SQLite, and Postgres, which is already accounted for since conversation threads use the in-memory checkpointer

**Option B - Python backend, TypeScript frontend**
- `boto3` as written, `create_agent` as written, the more mature LangGraph ecosystem
- **`shared` package cannot be shared.** Types must be duplicated by hand in Python and TypeScript, or generated from a single source such as Pydantic models exported to JSON Schema and converted to TS. Hand duplication is the failure mode already flagged; generation costs setup time
- The monorepo becomes mixed-language: `uv` or `poetry` alongside npm workspaces
- FE and BE owners can no longer read each other's code easily

**Option C - Python everywhere**
- Reverses the Vite plus React decision from Question 2. Not recommended; a Python frontend for this UI would cost more than it saves

**Recommendation: A, TypeScript.** The deciding factor is not framework maturity but the fact that the shared type package is the plan's main defence against the three streams drifting, and Option B removes it. On a 1.5-day clock, a drifting skill type discovered at the hour-9 integration checkpoint is a worse outcome than working with slightly thinner LangGraph documentation.

**If you genuinely prefer Python for the agent work**, say so and I will replan properly rather than bolting it on: the contract strategy would shift from a shared TypeScript package to a generated-types step, and that needs to be an explicit item in the hour 0 to 1.5 contract session rather than something discovered later.

A) TypeScript backend **(recommended)**

B) Python backend, TypeScript frontend

C) Python everywhere

X) Other

[Answer]: 

---

## 4. Execution checklist

**Executed and closed 2026-08-20T07:34:07Z.** Every step below ran. Read section 4a before reading the checkmarks: four of the artifacts this checklist names were generated and then **deliberately discarded**, so a `[x]` here means the step was carried out, not that its file still exists.

### Preparation
- [x] Confirm answers to all 8 questions and resolve any ambiguity
- [x] Re-read `requirements.md` FR-5.1 through FR-5.7 and confirm no design decision contradicts them

### Components
- [x] Generate `application-design/components.md` - 3 top-level components with purpose, responsibilities, interfaces
- [x] Record the explicit component-count justification, since the cap is a stated constraint
- [x] Name backend modules per the Question 6 answer

### Interfaces and methods
- [x] Generate `application-design/component-methods.md` - method signatures with input and output types, no business rules
- [x] Include the `DeviceAdapter` interface and the device API route shapes, since the stub is a handoff artifact at hour 4
- [x] Include the application API surface: chat, announcements, stats, skill list, invoke, feedback, audio
- [x] Include shared type definitions: Character, DeviceState, Skill, Trigger, Provenance, Level, UsageEvent

### Services
- [x] Generate `application-design/services.md` - service definitions, responsibilities, orchestration per the Question 8 answer
- [x] Specify how a discovery run is initiated per the Question 4 answer

### Dependencies
- [x] Generate `application-design/component-dependency.md` - dependency matrix, communication patterns
- [x] Document both data flows: runtime device-to-agent-to-UI, and accumulation device-to-DynamoDB
- [x] Mark which dependencies are stubbed during parallel work and by whom

### Contracts for the parallel split
- [x] DynamoDB schema: tables and keys for usage events (primary), character state, skills with provenance and revisions, feedback log
- [x] Application API contract, including the announcement transport chosen in Question 3
- [x] Environment contract: `.env` shape, resource names, run commands
- [x] Confirm the hour-4 handoff surface for the device stub is fully specified

### Consolidation and validation
- [x] Generate `application-design/application-design.md` consolidating the above
- [x] Verify every FR in `requirements.md` maps to a component that owns it
- [x] Verify no component exceeds the 3-component cap and no speculative component exists
- [x] Validate content per `common/content-validation.md` before writing

### Close-out
- [x] Mark each step `[x]`
- [x] Update `aidlc-state.md`
- [x] Log completion in `audit.md`

---

## 4a. What the stage actually produced, and what it threw away

**Decided 2026-08-20T07:14:09Z, by user decision, before stage approval.** The detailed interface contract was generated as planned and then **discarded**. `components.md`, `component-methods.md`, `services.md` and `component-dependency.md` were removed. The surviving artifact is a single short `application-design.md`, plus `be-reference-discovery-workflow.md` kept as BE's non-binding notes, plus the three Units Generation files.

**Why.** Writing method signatures, payload shapes and a storage schema in Inception means guessing before any of the three units has written a line of code, and every guess costs a renegotiation to correct. Three of the four discarded files were guesses of exactly that kind.

**What replaced them** is the interface evolution policy: **fix the transport only, evolve everything above it.** Fixed at Inception - REST for user-initiated FE-to-BE, SSE for server-initiated BE-to-FE, HTTP JSON for BE-to-`device-stub`, canned responses in `device-stub`. Not fixed - route paths, payload shapes, SSE event names, storage schema and keys, error shapes. Those get settled by FE and BE directly during Construction.

**The three contract steps above were therefore satisfied at a coarser grain than written:**

| Checklist step | How it actually closed |
|---|---|
| DynamoDB schema | **Deferred to Construction and settled there.** INFRA created a single table with partition key `id` and no sort key. The Inception-era guess would have been wrong: it assumed usage events were the primary persisted entity, and BE later deferred them to memory, leaving skills as the only stored record |
| Application API contract | **Deferred.** Settled incrementally between BE and FE; the artifact of record is `construction/be/code/api-examples.md` - unedited captures from a running backend rather than described shapes |
| Environment contract | **Reassigned to INFRA**, delivered as `construction/infra/code/runtime-contract.md` with the deployed resource names in it rather than placeholders |

**Retrospective judgement: the discard was correct.** The one Inception-fixed decision that held unchanged through Construction was the transport choice. Every payload-level decision moved at least once. The DynamoDB key schema moved after BE's code existed, which is precisely the renegotiation this policy was adopted to avoid paying twice.

**One thing the coarser grain cost.** The announcement transport (Question 3) was left open, and BE and FE settled it during Construction as **FE polling the skill list** rather than an SSE push. That kept SSE to Agentic Control only with no exception carved out, and kept the announcement unprompted per FR-3.6. It also introduced poll-interval latency that a contract fixed here would have surfaced earlier. Recorded as a real cost, not a hidden one.

---

## 5. Out of scope

Detailed business rules, algorithms, and data-model internals belong to Functional Design, per the stage's stated boundary. This stage produces interfaces and shapes, not logic. Prioritisation, sprint planning, and code structure beyond package layout are also excluded.
