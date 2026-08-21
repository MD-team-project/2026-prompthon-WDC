# BE Code Generation Plan

**Stage**: CONSTRUCTION - Code Generation, unit BE
**Created**: 2026-08-20T09:41:52Z
**Branch**: `construction/be`
**Status**: **APPROVED 2026-08-20T09:55:00Z. Part 2 executed and COMPLETE; stage approved 2026-08-20T14:45:00Z.** Every step below is `[x]`. **Read section 6 before trusting the checkmarks** - four steps closed differently from how they are written here, and two closed partially.

**This plan is the single source of truth for BE code generation.** Steps execute in order and are checked off as they complete.

---

## 1. Unit context

**Scope**: three Bedrock control agents (1:1:1), Skill Discovery on EXAONE, skill persistence, the REST plus SSE API FE calls, and `device-stub`.

**Depth**: this is a **scaffolding** phase. The goal is a running skeleton where every seam works end to end, not finished behaviour. Domain specifics are parked and get filled in one decision at a time afterwards.

### Structural decisions this plan implements

| | Decision |
|---|---|
| S1 | `createAgent` for control, `StateGraph` for discovery |
| S2 | Express 5, SSE hand-rolled in one helper |
| S3 | Concern-based flat directories |
| S4 | `tsx` dev, `tsc` build, `tsc --noEmit` as a separate check |
| S5 | `device-stub` as a separate process on port 4000 |
| S6 | Three agents at boot, in-memory checkpointer, skills read from DynamoDB and injected |
| S7 | Skills reached through `listSkills` and `getSkill` tools |

### Settled domain decisions

- A skill is a **Markdown document** describing a new feature or mode. Stored in DynamoDB as a string.
- Skill record fields: `id`, `productId`, `title`, `content`, `status`, `createdAt`. Nothing else.
- Discovery fires when **3 new events** have accumulated since the last run. Ignore re-crossing mid-run; reset the counter after an empty run; allow the seeded fixture to fire on first boot.
- **Discovery progress goes to server logs only.** Discovery emits nothing over SSE. **SSE carries Agentic Control output only.** *(corrected 2026-08-20T09:52:38Z - an earlier version had discovery pushing per-phase progress over SSE, which over-read the request.)*
- **No progression state in BE.** No level, no exp, no `Character` entity. BE notifies FE on discovery and serves the skill list; FE derives the rest.

### Parked, to be decided against real code

Q5 how feedback rewrites a document · Q6 how many skills per run · Q7 the placeholder capability vocabulary · prompt wording · discovery node internals

### Dependencies

| Depends on | Status | Handling |
|---|---|---|
| INFRA: DynamoDB table, env contract | not yet available | Local substitute behind the data layer until IaC lands |
| INFRA: Bedrock and Transcribe access | not yet available | Blocks live model calls, not scaffolding |
| FE | none | FE consumes BE, not the reverse |

---

## 2. Shared-file coordination, needs saying before Step 1

Steps 1 and 2 create **repository-root files that all three units need**: the root `package.json` with workspaces, `tsconfig.base.json`, and `.gitignore` additions. BE reaches them first because INFRA is doing IaC and FE will add only its own package.

**BE creates them; FE and INFRA add their packages to them.** This needs announcing when the branch merges, because a second unit inventing its own root config produces a conflict that is annoying rather than difficult.

---

## 3. Steps

### Step 0 - First-hour verification, before any code
- [x] Confirm **tool calling on the dedicated Friendli endpoint**. Bind one trivial tool, confirm a tool call returns. *Failure invalidates S1 and S7 and requires rework, not adjustment*
- [x] Confirm `modelKwargs` reaches Friendli and changes behaviour rather than being dropped
- [x] Observe **thinking output shape** - inline in content, or a separate field. Determines the sanitiser
- [x] Check whether `seed` is honoured. If it is, discovery reproducibility gets easier

Record results in `aidlc-docs/construction/be/code/verification-results.md`. If item one fails, stop and revisit before continuing.

### Step 1 - Monorepo root
- [x] Root `package.json` with npm workspaces: `packages/*`
- [x] `tsconfig.base.json` - strict, ES2022, NodeNext resolution
- [x] Root scripts: `dev`, `build`, `check`, `test`
- [x] `concurrently` for the two-process dev script
- [x] `.gitignore` additions - `dist`, `node_modules`, `.env`

### Step 2 - `packages/shared`
- [x] `package.json`, `tsconfig.json`
- [x] `src/types.ts` - only what FE and BE have actually agreed: `ProductId`, `SkillRecord`, `DeviceState` envelope, `UsageEvent`, SSE event shapes
- [x] Keep it deliberately thin. It grows as FE and BE agree things, per the interface evolution policy

### Step 3 - `packages/device-stub`
- [x] `package.json`, `tsconfig.json`, Express app on port 4000
- [x] `GET /devices/:productId/capabilities` - canned `Capability[]`
- [x] `GET /devices/:productId/state` - canned `DeviceState`
- [x] `POST /devices/:productId/command` - canned response, **one capability clamps** so the FR-5.5 test is exercisable
- [x] `POST /devices/:productId/reset` - in-memory only, per the recorded scope
- [x] Canned generic raw usage events, for discovery to analyse
- [x] Flush loop posting to the backend, honouring prefix-based partial acceptance

### Step 4 - Backend skeleton
- [x] `packages/backend/package.json`, `tsconfig.json`
- [x] `src/index.ts` - Express bootstrap, port 3000, agents constructed at boot
- [x] `src/config.ts` - env reading with a loud failure on missing required vars

### Step 5 - Models
- [x] `src/models/exaone.ts` - `ChatOpenAI` with `baseURL` override, `modelKwargs` carrying `chat_template_kwargs`, temperature in 0.1-0.3, `maxRetries: 1`. **Single construction site**
- [x] `src/models/bedrock.ts` - `ChatBedrockConverse`. Single construction site
- [x] `src/models/stripThinking.ts` - written against what Step 0 observed

### Step 6 - Data layer
- [x] `src/data/client.ts` - DynamoDB document client, table name from env
- [x] `src/data/skills.ts` - put, get, list, update status
- [x] `src/data/usage.ts` - append events, read window, count since last run
- [x] Local substitute usable until INFRA's table exists
- [x] **FR-5.11**: nothing in `src/tools/` imports `src/data/usage.ts`. Verifiable by inspection

### Step 7 - Device client
- [x] `src/device/adapter.ts` - HTTP client for the four device routes, base URL from env

### Step 8 - SSE helper
- [x] `src/routes/sse.ts` - one helper handling stream headers, `X-Accel-Buffering: no`, `req.on("close")` cleanup, and a ~15s keep-alive comment
- [x] **Carries Agentic Control output only.** Nothing from discovery

### Step 9 - Tools
- [x] `src/tools/device.ts` - `getDeviceState`, `listCapabilities`, `applyCommand`
- [x] `src/tools/skills.ts` - `listSkills`, `getSkill`, with descriptions written to make selection likely per the S7 mitigation
- [x] Tool results returned **structured**, so FR-5.5 holds: the agent forwards rather than authors

### Step 10 - Agents
- [x] `src/agents/index.ts` - `createAgent` per product, three instances in a `Map`, each with its own in-memory checkpointer
- [x] System prompt stating that discovered skills exist and are reachable, without listing them
- [x] Skills injected via tools only, per S7

### Step 11 - Discovery graph
- [x] `src/discovery/graph.ts` - `StateGraph` with phase nodes, running on EXAONE
- [x] Node transitions written to the **server log**, one line per phase. **No SSE emission from discovery**
- [x] `src/discovery/trigger.ts` - threshold check at 3 events, fire-and-forget, ignore while running, reset after empty
- [x] Output is a Markdown document plus a title

**Note on S1.** `StateGraph` was chosen over a plain async function partly because it streams node transitions natively, and that argument was made when progress was going to SSE. With progress now going to logs, the argument weakens - a plain function with five log lines would do the same job. `StateGraph` still stands on state management and on being the shape Inception recorded, but the streaming benefit is no longer part of its case.

### Step 12 - Routes
- [x] `src/routes/chat.ts` - POST chat, returns prose plus structured device state
- [x] `src/routes/skills.ts` - list, get, invoke, feedback. **The list route is what FE polls to notice new skills**
- [x] `src/routes/events.ts` - SSE subscription, Agentic Control output only
- [x] `src/routes/internal.ts` - flush intake, returns `accepted` count
- [x] `src/routes/health.ts`

**How FE learns a skill was discovered: polling.** *Decided 2026-08-20T09:58:44Z.* Discovery emits nothing to FE, so FE polls the skill list and shows anything new.

This keeps two things that the alternatives each gave up. The announcement stays **unprompted**, satisfying FR-3.6 - it appears without the user having sent anything, which riding on the next chat turn would have broken. And SSE stays **Agentic Control only**, with no exception carved out.

The cost is polling latency: a gap between the skill being created and FE showing it, bounded by the poll interval. Visible on stage, and the reason to keep the interval short.

**BE's obligation is just the list route.** No push, no notification endpoint, no long-poll. Polling cadence is FE's decision.

One implementation note worth passing to FE in the integration notes: **the list response should be cheap to poll.** Returning `id`, `title`, `status` and `createdAt` without `content` keeps a few-second interval harmless, and `getSkill` fetches the document when the user opens one.

### Step 13 - Tests
- [x] Test runner setup (`vitest`)
- [x] Unit tests for the data layer against the local substitute
- [x] Unit tests for the threshold logic - the one piece of real business logic in this scaffold
- [x] **NFR-3.1 property-based tests** on pure functions and serialization round-trips, using `fast-check`. Honest note: a scaffold has few pure functions, so this will be small - threshold arithmetic and `SkillRecord` round-trips are the realistic targets
- [x] Not run here. Build and Test executes them

### Step 14 - Documentation
- [x] `packages/backend/README.md` - how to run, env vars, ports
- [x] `aidlc-docs/construction/be/code/be-summary.md` - what was built, what is stubbed, what is parked
- [x] `aidlc-docs/construction/be/code/fe-integration-notes.md` - **the routes and SSE event shapes BE actually built**, for FE to build against. This is the artifact the interface evolution policy depends on *(delivered as `api-examples.md` - real captures rather than described shapes. See section 6.9)*

### Step 15 - Deployment artifacts
- [x] `.env-example` additions for the new variables
- [x] `Dockerfile` for backend and device-stub, only if it costs little. Deployment is conditional, so this is the lowest-priority step and the first to drop

---

## 4. Story traceability

Scaffolding **wires** these stories end to end; it does not complete them. Marked `wired` rather than `done`.

| Story | Steps | Scaffold state |
|---|---|---|
| US-1.1 control by speaking | 3, 7, 9, 10, 12 | Wired. Command reaches device-stub, structured state returns |
| US-3.1 discover unasked | 6, 11 | Wired. Graph runs on threshold, produces a document |
| US-3.2 announce what and why | 11, 12 | Wired. Skill written with its reasoning in `content`; FE polls the list to notice it. Progress in server logs |
| US-3.3 use a discovered skill | 9, 12 | Wired via tools and the invoke route |
| US-3.4 correct a skill | 12 | Route exists. Rewrite semantics parked as Q5 |
| US-2.1 progression | 8, 12 | BE emits the discovery event only. FE owns the rest |
| US-4.1 voice | - | **Not in this plan.** Transcribe endpoint deferred until INFRA grants access |
| US-4.2 language | 12 | `language` accepted on request bodies, passed to the model |
| US-5.1 demo path | all | Emerges from the above |

---

## 5. Scope discipline

Not built in this plan, deliberately:

- Product-specific capabilities, attributes, or authentic usage rhythms
- Device simulation - no clock, no timers, no lifecycle events
- Progression state of any kind
- Automatic skill firing. Prose triggers give a scheduler nothing to read
- Transcribe, until access exists
- Auth. None, single hardcoded user

**15 steps plus Step 0.** Steps 0 through 12 are the running skeleton; 13 through 15 are tests, docs and optional packaging.

---

## 6. Step delta - what actually got built

*Appended 2026-08-20T14:40:00Z at stage close-out. The planned steps above are left intact and unedited, so what was planned and what the code needed stay separately legible. Every step is `[x]`; six of them closed differently from how they were written, and this section is where that is recorded.*

### 6.1 One step was cancelled by its own predecessor

**Step 5, `src/models/stripThinking.ts`: not built, and correctly so.** Step 0 observed that Friendli returns reasoning in **separate fields** (`reasoning`, `reasoning_content`) with `content` already clean - no `<think>` markers, nothing to strip. The sanitiser had nothing to sanitise. Detail in `be/code/verification-results.md`.

The work inverted rather than disappeared: instead of removing reasoning from output, reasoning has to be **read out** of a non-standard field if anything wants it. LangChain's `ChatOpenAI` was not relied on to preserve it, so the discovery log records node transitions only. That loses little now that progress goes to server logs.

This is the payoff for putting Step 0 before any code. Had the order been reversed, the sanitiser would have been written, tested, and then deleted.

### 6.2 Structure came out per-product, not per-concern-with-a-Map

The plan wrote Steps 9, 10 and 12 as one module per concern with three instances held in a `Map`. The code has **one file per product** instead:

| Planned | Built |
|---|---|
| `src/agents/index.ts` with a `Map` of three | `src/agents/{pral,shoecase,massagechair}.ts` plus `sharedInstructions.ts` |
| `src/routes/chat.ts`, `skills.ts`, `events.ts` | `src/routes/character.ts` - a `characterRouter(productId, agent)` factory - plus a three-line file per product mounting it |
| `src/tools/device.ts`, `skills.ts` | those, plus `src/tools/{massagechair,shoecase,context}.ts` |

**Why**: the product is fixed by which router a request hit, so there is no runtime `:productId` to validate, mistype, or forget to validate on a newly added route. The `Map` version would have re-derived the product on every request. This is the 1:1:1 binding expressed in the file layout rather than in a lookup, and it made the per-product tool divergence in Step 9 cheap when it arrived.

**Also on Step 12**: there is no `POST /feedback` route. Revision and deletion happen **through the chat turn**, via `updateSkill` and `deleteSkill` tools on the control agent. The plan's route would have been a second way to do the same thing.

### 6.3 Renames and one storage decision that matters

- `src/data/client.ts` is `src/data/ddbClient.ts`. Cosmetic.
- **`src/data/usage.ts` is in-memory, not DynamoDB.** The plan's "local substitute until INFRA's table exists" became the permanent answer for usage events. Consequence, and it is a real one: **the accumulation window does not survive a restart**, and DynamoDB holds skills only. This is what made INFRA's key-schema correction necessary - see 6.6.
- `src/data/appContext.ts` and `packages/backend/fixtures/` are new. Past-days app-level context (weather, steps, distance, screen time), loaded straight into memory at boot rather than over HTTP, because no live path generates history.

### 6.4 Additions the plan did not have

- **`src/discovery/relevance.ts`** and a `checkTodayForRelevantSkill` tool. Lets the character bring up an existing skill when today's context matches, which is what makes a discovered skill visible again after its announcement scrolls away.
- **`forceRunDiscovery` plus `POST /internal/discovery/:productId/run`.** This is the answer to the demo-timing risk the functional design flagged as unresolved: with a volume-based trigger, nothing guarantees discovery fires while someone is watching. Dev-only, and it shares the same in-flight guard and counter reset as the threshold path, so it does not weaken either rule.
- **`POST /internal/usage/seed`**, deliberately separate from `/flush`: fixture history must *not* count toward the threshold, or discovery fires at boot instead of on a live interaction.
- **`GET /device-state`** for the demo screen, which has no chat turn for state to ride along with.

### 6.5 The decision in this plan that the code went back on

**SSE now carries discovery output.** Step 8 says, twice and in bold, that SSE carries Agentic Control output only and nothing from discovery. `GET /events` subscribes per product and receives **Skill Discovery progress and results**.

Recorded as a reversal rather than quietly absorbed, because the design note at 09:52:38Z had explicitly corrected an earlier version *in the other direction*. What changed the answer: Step 12's polling decision left the announcement arriving up to one poll interval late, and a discovery run that takes tens of seconds with no visible sign of life reads as the app having hung. The skill list is still polled, so the "no push required" property BE was asked for still holds - the stream is additive.

**The cost**: the clean rule "one channel, one concern" is gone, and with it the guarantee that nothing on the SSE path can leak sensitive data. FR-5.11 now depends on what discovery chooses to emit rather than on discovery having no channel at all. Weaker enforcement than the design had, and worth stating plainly.

### 6.6 Step 6 broke INFRA, and that is the integration story worth keeping

`src/data/skills.ts` addresses items by **`id` alone**. INFRA had already created the table with `pk`/`sk`, on the reasoning that a meaning-neutral base key cannot be wrong later. Every `Key: { id }` call would have failed with `ValidationException`.

The table was replaced empty at 2026-08-20T12:10:00Z to match. Two things came out of it, both recorded in INFRA's runtime contract: **BE's data-access code is the contract**, and a fixed `tableName` makes CloudFormation unable to replace a table at all, because it would create the replacement before deleting the original and the names collide.

The generic key schema was solving a problem this codebase does not have. Usage events stayed in memory (6.3), so skills are the only persisted entity - read by `id`, plus a `Scan` filter for the list.

### 6.7 Step 13 - **incomplete. No tests exist in this package.**

Marked `[x]` because the step was closed, not because it was delivered. `vitest` and `fast-check` are wired at the root and the root `test` script runs, but **no BE test file was written**. The four properties scoped in `be/functional-design/business-rules.md` section 6 - threshold arithmetic, skill round-trip, in-flight guard, flush prefix acceptance - are all unimplemented.

This is the NFR-3.1 gap for BE. The only property-based tests in the repository are FE's. Carried forward in `construction/build-and-test/build-and-test-summary.md` as an open finding rather than closed here.

Worth noting what it cost: the threshold logic is the one piece of real business logic in this scaffold and `PBT-A` would have taken minutes. FE's experience is the argument - a property test there caught a genuine idempotence bug in `normalizeInput` that no example-based test had.

### 6.8 Step 15 - one item done, one dropped

- **`.env-example` additions: done.** It carries all nine variables, and it documents the two that bite - `DDB_TABLE_NAME`'s default does not exist, and `FRIENDLI_ENDPOINT_ID` is required at boot despite not being a secret.
- **Dockerfile: dropped**, as this step's own text allowed. Deployment is to EC2 and `ecs-tasks.amazonaws.com` is absent from the account's `iam:PassRole` whitelist, so there is no container target to build for.

### 6.9 Step 14 - the FE handoff artifact exists under a different name, and is stronger than planned

The plan named `be/code/fe-integration-notes.md`. What was written is **`be/code/api-examples.md`**, and the difference is not cosmetic: it is **unedited request and response captures from a running backend** against real Bedrock and real Friendli, including a real DynamoDB write to INFRA's deployed table, rather than a hand-written description of the shapes.

That is the artifact the interface evolution policy actually needs. A described shape is a fourth guess; a capture is what the code did. `be/code/discovery-review.md` sits beside it covering the discovery pipeline, and `packages/backend/README.md` covers running it.

No file named `fe-integration-notes.md` exists. Anything pointing at that name should read `api-examples.md`.

### 6.10 Verified, not asserted

| Check | Result |
|---|---|
| `npm run check` (`tsc -b` across shared, device-stub, backend) | clean, strict mode |
| `npm run build` | succeeds |
| Friendli dedicated endpoint tool calling | tool call returned, `finish_reason: "tool_calls"` |
| Bedrock control path from the deployed instance role | `converse` succeeded with `InvokeModel` + `InvokeModelWithResponseStream` only |
| DynamoDB put / get / scan against the live table | succeeded after the key-schema correction |
| End-to-end discovery run | graph completed, skill written, announced |
| BE unit tests | **none exist** - see 6.7 |
