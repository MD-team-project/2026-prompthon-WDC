# BE Code Generation Plan

**Stage**: CONSTRUCTION - Code Generation, unit BE
**Created**: 2026-08-20T09:41:52Z
**Branch**: `construction/be`
**Status**: Awaiting approval before Part 2 begins

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
- [ ] Confirm **tool calling on the dedicated Friendli endpoint**. Bind one trivial tool, confirm a tool call returns. *Failure invalidates S1 and S7 and requires rework, not adjustment*
- [ ] Confirm `modelKwargs` reaches Friendli and changes behaviour rather than being dropped
- [ ] Observe **thinking output shape** - inline in content, or a separate field. Determines the sanitiser
- [ ] Check whether `seed` is honoured. If it is, discovery reproducibility gets easier

Record results in `aidlc-docs/construction/be/code/verification-results.md`. If item one fails, stop and revisit before continuing.

### Step 1 - Monorepo root
- [ ] Root `package.json` with npm workspaces: `packages/*`
- [ ] `tsconfig.base.json` - strict, ES2022, NodeNext resolution
- [ ] Root scripts: `dev`, `build`, `check`, `test`
- [ ] `concurrently` for the two-process dev script
- [ ] `.gitignore` additions - `dist`, `node_modules`, `.env`

### Step 2 - `packages/shared`
- [ ] `package.json`, `tsconfig.json`
- [ ] `src/types.ts` - only what FE and BE have actually agreed: `ProductId`, `SkillRecord`, `DeviceState` envelope, `UsageEvent`, SSE event shapes
- [ ] Keep it deliberately thin. It grows as FE and BE agree things, per the interface evolution policy

### Step 3 - `packages/device-stub`
- [ ] `package.json`, `tsconfig.json`, Express app on port 4000
- [ ] `GET /devices/:productId/capabilities` - canned `Capability[]`
- [ ] `GET /devices/:productId/state` - canned `DeviceState`
- [ ] `POST /devices/:productId/command` - canned response, **one capability clamps** so the FR-5.5 test is exercisable
- [ ] `POST /devices/:productId/reset` - in-memory only, per the recorded scope
- [ ] Canned generic raw usage events, for discovery to analyse
- [ ] Flush loop posting to the backend, honouring prefix-based partial acceptance

### Step 4 - Backend skeleton
- [ ] `packages/backend/package.json`, `tsconfig.json`
- [ ] `src/index.ts` - Express bootstrap, port 3000, agents constructed at boot
- [ ] `src/config.ts` - env reading with a loud failure on missing required vars

### Step 5 - Models
- [ ] `src/models/exaone.ts` - `ChatOpenAI` with `baseURL` override, `modelKwargs` carrying `chat_template_kwargs`, temperature in 0.1-0.3, `maxRetries: 1`. **Single construction site**
- [ ] `src/models/bedrock.ts` - `ChatBedrockConverse`. Single construction site
- [ ] `src/models/stripThinking.ts` - written against what Step 0 observed

### Step 6 - Data layer
- [ ] `src/data/client.ts` - DynamoDB document client, table name from env
- [ ] `src/data/skills.ts` - put, get, list, update status
- [ ] `src/data/usage.ts` - append events, read window, count since last run
- [ ] Local substitute usable until INFRA's table exists
- [ ] **FR-5.11**: nothing in `src/tools/` imports `src/data/usage.ts`. Verifiable by inspection

### Step 7 - Device client
- [ ] `src/device/adapter.ts` - HTTP client for the four device routes, base URL from env

### Step 8 - SSE helper
- [ ] `src/routes/sse.ts` - one helper handling stream headers, `X-Accel-Buffering: no`, `req.on("close")` cleanup, and a ~15s keep-alive comment
- [ ] **Carries Agentic Control output only.** Nothing from discovery

### Step 9 - Tools
- [ ] `src/tools/device.ts` - `getDeviceState`, `listCapabilities`, `applyCommand`
- [ ] `src/tools/skills.ts` - `listSkills`, `getSkill`, with descriptions written to make selection likely per the S7 mitigation
- [ ] Tool results returned **structured**, so FR-5.5 holds: the agent forwards rather than authors

### Step 10 - Agents
- [ ] `src/agents/index.ts` - `createAgent` per product, three instances in a `Map`, each with its own in-memory checkpointer
- [ ] System prompt stating that discovered skills exist and are reachable, without listing them
- [ ] Skills injected via tools only, per S7

### Step 11 - Discovery graph
- [ ] `src/discovery/graph.ts` - `StateGraph` with phase nodes, running on EXAONE
- [ ] Node transitions written to the **server log**, one line per phase. **No SSE emission from discovery**
- [ ] `src/discovery/trigger.ts` - threshold check at 3 events, fire-and-forget, ignore while running, reset after empty
- [ ] Output is a Markdown document plus a title

**Note on S1.** `StateGraph` was chosen over a plain async function partly because it streams node transitions natively, and that argument was made when progress was going to SSE. With progress now going to logs, the argument weakens - a plain function with five log lines would do the same job. `StateGraph` still stands on state management and on being the shape Inception recorded, but the streaming benefit is no longer part of its case.

### Step 12 - Routes
- [ ] `src/routes/chat.ts` - POST chat, returns prose plus structured device state
- [ ] `src/routes/skills.ts` - list, get, invoke, feedback. **The list route is what FE polls to notice new skills**
- [ ] `src/routes/events.ts` - SSE subscription, Agentic Control output only
- [ ] `src/routes/internal.ts` - flush intake, returns `accepted` count
- [ ] `src/routes/health.ts`

**How FE learns a skill was discovered: polling.** *Decided 2026-08-20T09:58:44Z.* Discovery emits nothing to FE, so FE polls the skill list and shows anything new.

This keeps two things that the alternatives each gave up. The announcement stays **unprompted**, satisfying FR-3.6 - it appears without the user having sent anything, which riding on the next chat turn would have broken. And SSE stays **Agentic Control only**, with no exception carved out.

The cost is polling latency: a gap between the skill being created and FE showing it, bounded by the poll interval. Visible on stage, and the reason to keep the interval short.

**BE's obligation is just the list route.** No push, no notification endpoint, no long-poll. Polling cadence is FE's decision.

One implementation note worth passing to FE in the integration notes: **the list response should be cheap to poll.** Returning `id`, `title`, `status` and `createdAt` without `content` keeps a few-second interval harmless, and `getSkill` fetches the document when the user opens one.

### Step 13 - Tests
- [ ] Test runner setup (`vitest`)
- [ ] Unit tests for the data layer against the local substitute
- [ ] Unit tests for the threshold logic - the one piece of real business logic in this scaffold
- [ ] **NFR-3.1 property-based tests** on pure functions and serialization round-trips, using `fast-check`. Honest note: a scaffold has few pure functions, so this will be small - threshold arithmetic and `SkillRecord` round-trips are the realistic targets
- [ ] Not run here. Build and Test executes them

### Step 14 - Documentation
- [ ] `packages/backend/README.md` - how to run, env vars, ports
- [ ] `aidlc-docs/construction/be/code/be-summary.md` - what was built, what is stubbed, what is parked
- [ ] `aidlc-docs/construction/be/code/fe-integration-notes.md` - **the routes and SSE event shapes BE actually built**, for FE to build against. This is the artifact the interface evolution policy depends on

### Step 15 - Deployment artifacts
- [ ] `.env-example` additions for the new variables
- [ ] `Dockerfile` for backend and device-stub, only if it costs little. Deployment is conditional, so this is the lowest-priority step and the first to drop

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
