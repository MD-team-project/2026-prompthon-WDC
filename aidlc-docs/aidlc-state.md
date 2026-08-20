# AI-DLC State Tracking

## Project Information
- **Project Name**: prompthon
- **Project Type**: Greenfield
- **Start Date**: 2026-08-19T07:27:43Z
- **Current Phase**: INCEPTION
- **Current Stage**: Requirements Analysis
- **Rule Details Directory**: `.kiro/aws-aidlc-rule-details/`

## Workspace State
- **Existing Code**: No
- **Programming Languages**: None detected
- **Build System**: None detected
- **Project Structure**: Empty (documentation and tooling scaffolding only)
- **Reverse Engineering Needed**: No (greenfield)
- **Workspace Root**: `/Users/sehoonbyun/Documents/prompthon`

### Detection Details
- No `aidlc-docs/aidlc-state.md` existed prior to this run, so this is a new project rather than a resumed session.
- No source files or build manifests found anywhere in the workspace.
- Pre-existing files: `LICENSE`, `.gitignore`, `.env`, `.env-example`, empty `requirements/` directory, `.claude/.cc-writes/`, and the `.kiro/` AI-DLC rule set.
- `.env-example` indicates an AWS CLI profile (`AWS_PROFILE`) is expected for local work, suggesting AWS involvement. Not yet confirmed as a requirement.
- Git history contains scaffolding commits only.

## Code Location Rules
- **Application Code**: Workspace root (NEVER in aidlc-docs/)
- **Documentation**: aidlc-docs/ only
- **Structure patterns**: See code-generation.md Critical Rules

## Extension Configuration
| Extension | Enabled | Decided At |
|---|---|---|
| Security Baseline | **No** | Requirements Analysis, Round 2 Q7 = B. Baseline NOT loaded, not blocking. Six lite guardrails carried as ordinary NFRs instead. |
| Resiliency Baseline | **No** | Requirements Analysis, Round 2 Q8 = B. Baseline NOT loaded, 15 practice areas not blocking. Four lite items carried as ordinary NFRs instead. |
| Property-Based Testing | **Partial** | Requirements Analysis, Round 1 = B. Enforced for pure functions and serialization round-trips only. |

**Deferred rule loading status**: `security-baseline.md` and `resiliency-baseline.md` are NOT to be loaded at any stage. `property-based-testing.md` loads for Code Generation and Build and Test, scoped to pure functions and serialization round-trips.

Opt-in questions are presented in `aidlc-docs/inception/requirements/requirement-verification-questions.md`. Full extension rule files are loaded only for extensions the user opts into.

## Stage Progress

### INCEPTION PHASE
- [x] Workspace Detection
- [ ] Reverse Engineering (SKIPPED - greenfield, no existing code)
- [x] Requirements Analysis (APPROVED 2026-08-20T02:22:47Z; requirements.md merged to main via PR #4)
- [x] User Stories (APPROVED 2026-08-20T03:31:18Z after 4 revisions. 9 stories, 2 personas)
- [x] Workflow Planning (**APPROVED** 2026-08-20T04:26:14Z, execution-plan.md rev 5)
- [x] Application Design - **collapsed to a short decision record, awaiting approval**. Detailed interface contract discarded 2026-08-20T07:14:09Z
- [x] Units Generation - **COMPLETE and APPROVED** 2026-08-20T07:41:33Z, minimal depth. 3 units: INFRA, BE, FE. Planning questions skipped as already answered by prior stages

### CONSTRUCTION PHASE - runs per unit in parallel
- [ ] INFRA: Functional Design -> Code Generation
- [ ] BE: Functional Design -> Code Generation
- [ ] FE: Functional Design -> Code Generation
  - **STARTED** 2026-08-20T08:00:00Z on branch `aidlc/construction-fe`
  - Functional Design **APPROVED** 2026-08-20T08:45:00Z. Plan at `aidlc-docs/construction/plans/fe-functional-design-plan.md`, all 14 questions answered. Artifacts at `aidlc-docs/construction/fe/functional-design/`
  - Code Generation **plan APPROVED and Part 2 COMPLETE** 2026-08-20T09:15:00Z, awaiting code approval. Plan at `aidlc-docs/construction/plans/fe-code-generation-plan.md`, all 23 steps [x]. Summary at `aidlc-docs/construction/fe/code/code-summary.md`
  - **Verified, not asserted**: `tsc --noEmit` clean under strict mode; `vitest run` 26 passed (8 property-based, 18 example-based); `vite build` succeeds; `npm audit` 0 vulnerabilities; dev server serves and the `shared` workspace resolves
  - **Code lives at** `packages/frontend/` and `packages/shared/`. Components in **9 files**
  - **Dependency upgrade forced by real advisories**: 6 advisories on the vite 5 / vitest 2 line, all tracing to `esbuild <=0.24.2` including a critical Vitest RCE. Now on vite 8.2.2, vitest 4.1.11, plugin-react 6.1.0, @types/node 22.20.1. All dev-only, all cleared. **BE and INFRA: pin exact versions and check `npm audit` before adding tooling**
  - **A property test caught a real bug**: `normalizeInput` was not idempotent, because slicing at the cap can land on a space and a second pass then removes it. Also switched the cap to code points so it is meaningful for Korean. This is the case NFR-3.1's PBT scope exists for
  - **Ponytail review ran two cycles.** The `ponytail-reviewer` sub-agent is NOT registered in this environment, so its definition and `review.md` were read and applied directly - recorded as a mechanism deviation, not a skipped review. Ten findings, nine applied, roughly 45 lines removed. The substantive one: hand-rolled exponential backoff over `EventSource` was reimplementing native reconnection worse than the platform does it
  - **PBT: no blocking findings.** PBT-02 round-trip is **N/A for FE** with a stated reason. PBT-03, 07, 08, 09 compliant. PBT-05 and PBT-06 N/A
  - **PBT-01 gap found and closed**: a Testable Properties section was missing from the functional design and has been appended to `business-rules.md`. Round-trip properties recorded **N/A for FE** - it decodes and never encodes. FR-5.5 is checked example-based on the pure reducer, which also removed `jsdom` and testing-library from the dependency list
  - **FE creates four shared surfaces** because it started first: root `package.json`, `packages/shared/{package.json,src/types.ts}`, `.github/workflows/ci.yml`. Kept minimal. `packages/shared` is seeded from FE's mock contract and **BE should change anything wrong**
  - **CI added rather than reported as a blocking PBT-08 finding.** No CI pipeline existed; a 15-line workflow costs less than the finding. Runs FE tests only for now, since BE and INFRA packages do not exist yet - they extend it
  - FE adds one artifact beyond the stage default: `backend-mock-contract.md`, FE's opening proposal for the FE/BE payload negotiation the interface evolution policy defers to Construction
  - **FE decisions**: React+Vite; in-app mock behind an env flag with a scripted SSE stream; generic stat renderer keyed on a BE-ordered attribute array; no router and no context; character-centric screen where the character stage is the only region that grows, with the skill list and the conversation log as raised sheets; in-place level-up and discovery effects; record-then-POST voice with an editable transcript draft; plain i18n dictionary; failures split into request-level and connection-level
  - **Intimacy (친밀도) explicitly removed** 2026-08-20T08:10:00Z. Raised by the user as an example only. FR-2.1 defines exp and level; a second axis would need an increase rule and would dilute level, which FR-2.4 already uses as the presentation device for discovery
  - **Retires open item 3 in `requirements.md` section 7**: character art strategy is settled as one illustration per product, referenced never generated (NFR-4.2)

  **FE post-summary iteration** 2026-08-20T21:45:00Z, docs corrected to match the code:
  - **Real character art arrived for `massagechair`**: 121 `.webp` frames, **3.8 MB**, `levelup/` 56 and `surprise/` 65 at 40ms, served static not bundled. `pral` and `shoecase` keep the CSS placeholder. **BE/INFRA note**: static asset serving is now a real deployment concern, not a placeholder one
  - **`StatHeader` was split and deleted.** Progression became a pill in `CharacterView`'s HUD, device state became `DeviceStatStrip`. This made FE-R-2 stronger, not weaker: no component can now reach both data classes, and `CharacterStage` takes no progression at all
  - **The flex budget inverted.** The speech area had `flex: 1` with the character fixed at 176px, which made the screen a chat client with an avatar on top - the opposite of what Q5 D decided. The stage grows now
  - Three components the plan did not have: `DeviceStatStrip`, `CharacterSwitcher` (switch character without returning to the roster, by dot or swipe), `SpotlightCard` (a discovery leaves a trace the next line of speech cannot push away). `ConversationLog` was never built - same list and props as `ConversationSheet`
  - **Re-verified, not carried over**: `tsc --noEmit` clean; `vitest run` 26 passed; `vite build` 175.28 kB JS / 56.19 gzipped, 22.10 kB CSS / 5.27 gzipped; `npm audit` 0 vulnerabilities
  - **FR-2.5 regressed and is recorded as such.** The CSS level layer was removed from the character stage when real art landed - a ring around an illustration reads as decoration rather than the character advancing - and the replacement was never built. Cosmetic evolution is met on the roster tile ring only. Left open deliberately: it is second in the drop order. FE-R-10 carries it as partly held
  - Two smaller gaps recorded rather than fixed: `artRef` is carried but nothing resolves it (`massagechair` paths are hardcoded, fine at one art set and wrong at two), and frames have no preloading so a cold first playthrough can stutter
  - **Docs updated in this pass**: all five `fe/functional-design/` artifacts, `fe/code/code-summary.md`, section 11 appended to `fe-code-generation-plan.md`, and `packages/frontend/README.md`. The plan's executed steps were left intact - the delta is a new section, so what was planned versus what the screen needed stays legible

  **FE polish pass** 2026-08-20T22:10:00Z, two changes, docs re-corrected with them:
  - **Sprite transparency moved from CSS into the asset.** Frames were exported near-white rather than transparent, so each frame's canvas occluded the aura and floor behind it. The first fix was a CSS edge-fade mask and it could not be made safe - several `levelup` frames put the chair flush against the frame boundary, so any fade wide enough to hide the seam clipped the character. All 121 frames re-exported with real alpha, flood-filled inward from the borders; the mask is gone. **2.1 MB to 3.8 MB**, which makes frame preloading more worth doing than it was
  - **The spotlight toast no longer waits for a level-up**, only for a bare discovery: `busy` is now `discovery && !levelUp`. A small surprise reaction is worth not covering; a level-up is loud enough to share the frame, and holding the toast back from it splits one moment into two. FE-R-10b carries the rule
  - Re-verified: `tsc --noEmit` clean, 26 tests pass, build 175.28 kB JS / 56.19 gzipped and 21.80 kB CSS / 5.20 gzipped

**Cross-unit items FE raised for BE** (2026-08-20T08:30:00Z, detail in `fe/functional-design/backend-mock-contract.md`):
- **Structural ask 1**: one SSE stream for all three characters, each event naming its `characterId`. A per-character stream cannot deliver an announcement for a character the user is not viewing, which is what FE's badge behaviour depends on
- **Structural ask 2**: `deviceState` always a separate field from reply text. FE's FR-5.5 enforcement is that no function accepts a string and returns stats, and that only holds if the response separates them
- **RISK, unresolved**: how discovery is made to fire on cue for the demo. FR-5.10 triggers on accumulated data volume, so timing is outside the presenter's control. FE has no lever and no fallback if it stays silent during the show. Needs settling early, not at rehearsal
- **Note for the hour-5.5 checkpoint**: a scripted in-process mock cannot prove real SSE behaviour through dev-server proxies or buffering intermediaries. An SSE route emitting one hardcoded event is enough to find out, so it is worth doing before the checkpoint rather than at it
- [ ] Build and Test - joint, after all three units

**How each owner starts**: on their own branch, open a session and say
`AI-DLC Construction, {INFRA|BE|FE} 담당` .
The agent reads `aidlc-state.md` for that unit's scope and constraints, then runs Functional Design followed by Code Generation.
- [ ] Workflow Planning
- [ ] Application Design (not yet assessed)
- [ ] Units Generation (not yet assessed)

### CONSTRUCTION PHASE
- [ ] Per-Unit Loop (Functional Design / NFR Requirements / NFR Design / Infrastructure Design / Code Generation)
- [ ] Build and Test

### OPERATIONS PHASE
- [ ] Operations (PLACEHOLDER)

## Captured Product Intent (Round 1)
- **Product**: AI-characterized companion layer over LG products, replacing settings-driven UI with agentic chat and voice.
- **Core concept**: 1:1:1 relation between AI agent, LG product, and character. Usage accrues exp; the character discovers and unlocks personalized skills, creating a self-improving impression.
- **Target**: B2C, any LG product owner. Demo audience is hackathon judges.
- **Problem**: ThinQ lacks AI-native skills and chat interaction, and is boring.
- **Stack**: TypeScript / Node.js. AWS-central (Bedrock, storage, Polly, EC2).
- **Quality bar**: Hackathon demo that must survive a live run. Timeline 1-2 days. Lean workflow.
- **Undecided pending Round 2**: demo-critical slice, product/character count, persistence, auth, voice input path, usage-data source, control realism, hosting, UI shape, language, exp reward mechanic.

## Working Conventions
- **Conversation language**: Korean. **Document language**: English. Set by user directive 2026-08-20T02:29:15Z. Applies to all AI-DLC artifacts from this point forward.
- Independent of the product's own UI language, which is Korean-first with an English toggle per Round 2 Q14.
- User answers questions in chat; the AI transcribes them verbatim into the relevant question file, which remains the artifact of record.

## Settled Decisions
- **Products**: Pra.L (beauty), ShoeCase (life/niche), Massage Chair (wellness). One agent and one character each.
- **Pillar depth**: Skill Discovery DEEP and autonomous and primary; Character Progression THIN and presentation-led; Agentic Control BASELINE.
- **Stack**: TypeScript/Node, LangGraph with LangChain v1 `createAgent` plus middleware, DynamoDB, **Amazon Transcribe** (streaming, server-side). **Two models split by responsibility** (rev 2026-08-20T05:14:22Z): **Bedrock** for Agentic Control via `ChatBedrockConverse`, **EXAONE via Friendli** for Skill Discovery and product-stat governance via `ChatOpenAI` with overridden `baseURL`. **Polly removed** 2026-08-20T03:04:52Z (replies text only); **Transcribe replaced browser Web Speech API** 2026-08-20T03:14:36Z.
- **Consequence of the model split**: Bedrock returns, so the AWS surface is Bedrock + DynamoDB + Transcribe and the AWS-central posture is restored.
- **Layer separation (2026-08-20T05:26:03Z)**: Agentic Control is **interactive and live** on the request path; Skill Discovery is **background and async**, off it entirely. Discovery never blocks an interaction. Trigger is **accumulated data volume crossing a threshold**, tuned low enough that a few demo interactions cross it.
- **Data classification (2026-08-20T05:26:03Z)**: boundary is **sensitivity, not kind**. *Sensitive* = accumulated usage history, derived routines, skill provenance → **EXAONE only**, never logged, never sent raw to the client. *Open* = current device state, capability list, character level and exp → **Bedrock direct**. Enforced structurally by two separate data modules, so the Bedrock tool set simply never imports the usage-history module. Consequence: no model-calling-a-model penalty on the interactive path.
- **EXAONE is now entirely off the interactive path**, so thinking mode is simply on with no latency cost anywhere. The thinking-mode question was withdrawn rather than answered.
- **Architecture (rev 3)**: strict 1:1:1 binding of agent, character, and device. Three products means three agents, each with its own state - no multiplexing. The agent reaches its device over an **API**, not shared memory; `DeviceAdapter` is that API's client.
- **Data paths (rev 5, separated by purpose)**: **Runtime flow** - device API to agent to UI, synchronous, current device state **not persisted**. **Accumulation flow** - device API buffers usage events in memory, flushes to DynamoDB, clears; this exists for **Skill Discovery** to analyse later. All actions connect directly to the device API. Flush-before-read (former FR-5.8) **removed** - the display no longer reads flushed state, which eliminated the staleness window entirely.
- **DynamoDB purpose (rev 5)**: **primary** = usage-event accumulation for Skill Discovery. **secondary** = character state, level, exp, skills, feedback log. **Not** current device state.
- **The FR-5.5 invariant (rev 5)**: located in **payload provenance**, not the storage path. Stats reach the UI as a structured device API response the agent forwards rather than authors. A model can write a sentence but cannot fabricate a structured device response. Observable test: have the device clamp 30 minutes to 25 and confirm the UI shows 25, not 30.
- **UI model (rev 2)**: the character IS the device UI. Device state renders as character stats; no device control panel exists. Level, exp, and skill list all live on the main character UI.
- **Progression mechanic (rev 2)**: discovery triggers a level-up presentation. Level does NOT gate skills - skills are usable immediately. The user reads the level-up as having earned the skill, which is the intended illusion.
- **Skill tiers (rev 2)**: 14 days of history yields basic skills, 60 days yields advanced skills.
- **Channels (rev 2)**: request by voice or text, response always text.
- **Storage**: JSON fixtures for usage history; DynamoDB for progression, skills, device state, feedback; in-memory LangGraph checkpointer for conversation; audio not persisted.
- **Auth**: none, one hardcoded demo user. Conditional passcode NFR if ever deployed publicly.
- **Hosting**: local first, EC2 only if time remains.
- **UI**: mobile-first responsive browser app, Korean default with English toggle.
- **Progression rewards**: skill unlocks at thresholds plus cosmetic evolution. No personality or tone change by level.
- **Workflow shape**: Requirements Analysis, Workflow Planning, Functional Design, Code Generation, Build and Test. NFR Design and Infrastructure Design skipped. User Stories skipped by default.

## Team Structure
**3 people working in parallel**: Infra, BE, FE. Set by user directive 2026-08-20T03:42:55Z. Wall clock stays 1.5 days; capacity roughly 36 person-hours. The binding constraint moves from total hours to **interface contracts and integration**.

## Execution Plan Summary (revision 2, 3-person parallel)
- **Stages to execute**: Application Design (contracts), Units Generation (3 units), Functional Design x3 in parallel, Code Generation x3 in parallel, Build and Test (integration)
- **Stages to skip**: Reverse Engineering (greenfield), NFR Requirements (NFRs already fixed), NFR Design (dependent on skipped stage), Infrastructure Design (localhost, deployment conditional - note the Infra *stream* still has substantial unit-level work)
- **Units (rev 3)**: INFRA (IaC and environment ONLY - AWS resources, IAM, env config, deployment, integration harness; owns zero stories, an enabling unit), BE (device API **stub**, flush cycle, 3 agents, discovery engine, skill lifecycle, Transcribe endpoint, app API, tiered fixture), FE (UI, stats as character, progression presentation, audio capture, i18n)
- **Contracts frozen before streams split (rev 3, reduced to 2 cross-team + shared types + env)**: DynamoDB schema (INFRA→BE), application API (BE→FE), shared types (all), environment contract (INFRA→all). Device API contract is now internal to BE
- **SCAFFOLDING PHASE (2026-08-20T06:52:14Z)**: this phase builds three components, the seams between them, and enough behaviour to prove the seams work. **Product-specific data and tools are deferred to a later phase.**
  - `device-stub` is a **canned-response server**, not a simulator. No state machine, no clock, no lifecycle event emission.
  - **Skill Discovery over raw device data remains the CORE deliverable of this phase.** Device data is raw data; discovering skills from it is the point. The canned stub supplies **generic raw usage events**, which is all discovery needs to find patterns, synthesise, validate, persist and announce.
  - **Deferred is product-AUTHENTIC data**, not usage data as such: what a real Pra.L or ShoeCase session looks like, realistic per-product rhythms, real capability vocabulary, real `attributes` keys, event vocabulary and emission points, device time model, product-specific agent tools.
  - What this phase must also get right is what is expensive to change later: contract shapes, access classes, layer separation, model wiring.
- **SUPERSEDED - the two-phase INFRA role (option A, decided 04:18)**. Its premise was INFRA absorbing the device stub and the product-authentic fixture; the stub is now roughly an hour and the authentic fixture is out of scope. INFRA phase 1 (hours 0-4, IaC and environment, not interruptible) still stands.
- **OPEN DECISION - INFRA slack**: INFRA ~3 h, BE ~8-9 h, FE ~8-9 h. BE stays heaviest because the discovery pipeline did not shrink; only the simulator and authentic-data authoring left. Options: (A) INFRA joins whichever stream is behind after hour 4, (B) INFRA absorbs the canned stub at hour 2 to buy BE an extra hour on discovery, (C) accept INFRA idling.
- **Success criteria UNCHANGED.** A brief claim that this phase could no longer demonstrate autonomous discovery was wrong and has been withdrawn. Generic raw events are sufficient. Only how *convincing* the discovered skill looks differs from the eventual product; the pipeline is the same.
- **Caution (corrected 2026-08-20T04:02:33Z)**: FR-5.5 does NOT forbid the agent reading stats or causing them to change - it forbids the UI sourcing displayed stats from the agent's reply text. The agent is simply not the source of truth for the display. With BE owning both the device stub and the agent, the risk is that the display gets wired to the same in-process object the agent mutates, bypassing the commit path, so the UI shows intent rather than committed state. Ownership separation never enforced this; it only made the shortcut inconvenient. **Build and Test verification**: suppress the flush and confirm the UI fails to update rather than optimistically showing the agent's intent.
- **Risk level**: High (raised from Medium-High). Top driver is now **integration at the seams**, then the 1.5 day wall clock, generative behaviour in the primary pillar, BE overload, Transcribe fragility, load-bearing fixture
- **Two mandatory integration checkpoints**: 5.5h (thin end-to-end) and 9.0h (full demo path). The 5.5h one is the single most important line in the plan
- **Drop order if time runs short**: voice input, then cosmetic evolution, then English toggle

## Next Step
**INCEPTION complete and approved. CONSTRUCTION is WAITING for the three owners to start in parallel.**

Before anyone writes code, run the four first-hour verifications. The first one can invalidate BE's architecture:
1. **Tool calling on the *dedicated* Friendli endpoint.** Failure means rework, not adjustment. Documentation found covers serverless endpoints only.
2. `modelKwargs` passthrough actually reaches Friendli rather than being silently dropped.
3. Thinking output shape - inline in content or a separate field. Determines the sanitiser.
4. Whether `seed` is honoured. If it is, discovery reproducibility gets much easier.

## Working Conventions for Parallel Construction (2026-08-20T07:34:07Z)
- **Branching**: each unit on its own branch, PR, review, merge.
- **Shared file conflicts**: `aidlc-state.md` and `audit.md` stay shared and **one person resolves conflicts as they arise**. No file splitting, no per-unit audit logs. `audit.md` is append-only so resolution is mechanical.
- **Construction artifacts** land under `aidlc-docs/construction/{unit}/`, which does not overlap between units.
- **FE must mock the backend including a fake SSE stream.** Without it FE waits on BE and roughly a third of team capacity idles for most of the build. Identified as the single most consequential item in the dependency document.

## Application Design Outcome (rewritten 2026-08-20T07:14:09Z)

**The detailed interface contract was discarded by user decision.** Files removed: `components.md`, `component-methods.md`, `services.md`, `component-dependency.md`. Everything now lives in a single short `application-design.md`. `be-reference-discovery-workflow.md` retained as BE's non-binding notes.

**The only interface decisions made at this stage:**
- **FE to BE: REST API plus SSE.** REST for user-initiated actions, SSE for unprompted agent pushes such as a discovery announcement.
- **Stubbing: `device-stub` serves device data.** BE builds it, canned responses, and it is the source of the generic raw usage events discovery analyses.
- **Route names, payload shapes, SSE event names and the storage schema are settled by FE and BE directly during Construction.** Not fixed in Inception - two people agreeing, not three-way coordination.

**INFRA scope**: provide what BE needs and prepare IaC so later deployment is easy. Slack resolved as **option A** - IaC first since it unblocks the others, then join whichever stream is behind.

**Constraints that still bind** (from requirements, not negotiable locally): EXAONE for discovery and sensitive data with Bedrock for control; the `ChatOpenAI` wrapper with `modelKwargs`; thinking output never shown as speech; stats from structured device responses; sensitive data never crossing to the client; discovery off the request path; server-side model credentials; text-only replies; Korean default with English toggle.

**Interface evolution policy (2026-08-20T07:22:51Z)**: **fix the transport only, evolve everything above it.**
- **Fixed at Inception**: REST for user-initiated FE→BE, SSE for server-initiated BE→FE, HTTP JSON for BE→`device-stub`, canned responses in `device-stub`. That is the entire interface commitment.
- **Not fixed, deliberately**: route paths, payload shapes, SSE event names, storage schema and keys, error response shapes.
- **How they get settled**: FE and BE agree directly and incrementally during Construction and revise as they learn. No artifact, no change control, no sign-off.
- **Rationale**: fixing payloads in Inception means guessing before either side has written code, and every guess costs a renegotiation to correct. Deciding while building means each shape is set by whoever has just discovered what it needs to be.
- **What this does NOT loosen**: the requirement-level constraints. A payload shape can change freely; which class of data may be in it cannot.
- **The practice that makes it work**: integrate thinly and early. The hour-5.5 checkpoint stops being a formality and becomes the mechanism.

## Phase Structure (2026-08-20T07:14:09Z)
```
NOW:    Scaffolding      Inception (this) -> Construction
LATER:  Per product      Inception -> Construction, per product
                         product-specific state, capabilities, tools, authentic data
```
The scaffolding phase exists to make later per-product phases cheap: once the pipeline runs end to end, adding a product should be data and tools rather than architecture.

## MANDATORY CONSTRAINT - EXAONE via Friendli (2026-08-20T04:52:07Z)
Hackathon requirement. **EXAONE is the required model**, text input only, served over Friendli's OpenAI-compatible chat/completions at `api.friendli.ai/dedicated/v1`.
- **Bedrock removed from the runtime.** AWS surface narrows to DynamoDB and Transcribe.
- **Wrapped as `ChatOpenAI` with `baseURL` overridden** - no custom LangChain integration needed, so `createAgent`, middleware, tool binding, and the LangGraph discovery workflow all work unchanged. Single construction site at `packages/backend/src/model/exaone.ts`.
- **`chat_template_kwargs` goes through `modelKwargs`**, since it is not an OpenAI parameter.
- Two instances: `exaoneChat` (thinking off, control path), `exaoneReasoning` (thinking on, discovery).
- **Voice unaffected** - Transcribe converts speech to text before the model sees it.
- **Access mediation specified**: EXAONE mediates *access*, does not *author* values. No direct data endpoint for the browser; data reaches the client as structured tool-call results carried alongside the prose, and the UI renders from the structured part. This reconciles the constraint with FR-5.5.
- **First-hour verification, 4 items**: tool calling on the *dedicated* endpoint (documentation found covers serverless only - failure here means rework), `modelKwargs` passthrough, thinking-output shape, and whether `seed` is honoured.
- **NFR-4.1 conflict**: determinism as written is unachievable with LLM-based discovery. Restatement pending Q12.

## Requirements Gaps Found During Application Design Planning
Two things no requirement specifies, raised as questions rather than assumed:
1. **Announcement transport** - FR-3.6 requires an unprompted announcement, so the browser must learn of a server-side event it did not request. No requirement says how.
2. **Discovery trigger** - FR-3.2 says a run completes without intervention once started, but nothing says what starts it.

## Timeline Correction
Build window is **1.5 days**, not the 1-2 days `requirements.md` was written against. Corrected by the user at 2026-08-20T02:36:41Z. Story scope was tightened accordingly; the same correction should inform Workflow Planning and Code Generation scope.

## Session History
- **2026-08-19T07:27:43Z** - Session 1: Workspace Detection completed, Requirements Analysis started, stopped at Step 6 gate.
- **2026-08-19T07:41:12Z** - Session 2: Resumed. No answers found in the question file, so the Step 6 gate was re-presented via `aidlc-docs/session-resume-questions.md`. No stage progress advanced.
