# AI-DLC State Tracking

## Project Information
- **Project Name**: prompthon
- **Project Type**: Greenfield
- **Start Date**: 2026-08-19T07:27:43Z
- **Current Phase**: **CONSTRUCTION - COMPLETE**
- **Current Stage**: **ALL STAGES COMPLETE.** Every Inception and Construction stage the workflow plan scheduled has closed and been approved. All three units (INFRA, BE, FE) complete; joint Build and Test **APPROVED 2026-08-21T01:40:00Z**. Operations closed as out of scope 2026-08-21T01:45:00Z. Open findings are carried in `construction/build-and-test/build-and-test-summary.md` section 4, not hidden by the completion status
- **Rule Details Directory**: `.kiro/aws-aidlc-rule-details/`

## Workspace State
- **Existing Code**: No
- **Programming Languages**: None detected
- **Build System**: None detected
- **Project Structure**: Root npm workspace + `infra/` CDK workspace (created 2026-08-20T10:15:00Z). `packages/*` still empty, owned by BE and FE
- **Reverse Engineering Needed**: No (greenfield)
- **Workspace Root**: `/Users/hyunjin/prompthon/2026-prompthon-WDC` (corrected 2026-08-20T10:36:00Z; the previous value `/Users/sehoonbyun/Documents/prompthon` was a different machine)

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
- [x] Reverse Engineering (SKIPPED - greenfield, no existing code. Decision closed, nothing outstanding)
- [x] Requirements Analysis (APPROVED 2026-08-20T02:22:47Z; requirements.md merged to main via PR #4)
- [x] User Stories (APPROVED 2026-08-20T03:31:18Z after 4 revisions. 9 stories, 2 personas)
- [x] Workflow Planning (**APPROVED** 2026-08-20T04:26:14Z, execution-plan.md rev 5)
- [x] Application Design - **APPROVED 2026-08-20T07:34:07Z**, collapsed to a short decision record. Detailed interface contract discarded 2026-08-20T07:14:09Z
- [x] Units Generation - **COMPLETE and APPROVED** 2026-08-20T07:41:33Z, minimal depth. 3 units: INFRA, BE, FE. Planning questions skipped as already answered by prior stages

### CONSTRUCTION PHASE - **COMPLETE**, ran per unit in parallel
- [x] **INFRA: COMPLETE.** Functional Design APPROVED 2026-08-20T09:07:10Z -> Code Generation **APPROVED 2026-08-20T11:40:00Z**, deployed and verified against the live account. See the INFRA deployed-runtime section below
- [x] **BE: Functional Design COMPLETE** 2026-08-20T09:41:52Z. Closed on structural decisions S1-S7; the plan file at `construction/plans/be-functional-design-plan.md` carries them. Artifacts at `construction/be/functional-design/` - deliberately **thin on domain behaviour**, because section 2A redirected the stage to structural questions and parked domain specifics to be decided against real code. `business-rules.md` carries 24 numbered rules plus a delta section recording where the built code diverged
- [x] **BE: Code Generation COMPLETE and APPROVED 2026-08-20T14:45:00Z.** `construction/plans/be-code-generation-plan.md`, all 15 steps plus Step 0 `[x]`. Summary at `construction/be/code/be-summary.md`
  - **Step 0 earned its cost twice.** The blocking check - tool calling on the *dedicated* Friendli endpoint - **passed**, which is what left S1 and S7 standing. It also **cancelled a planned task**: thinking output arrives in separate fields with `content` already clean, so the `stripThinking` sanitiser was never written. Reversed order would have meant writing, testing and deleting it
  - **Structure came out per-product, not per-concern-with-a-Map.** One agent file and one router file per product, with a `characterRouter(productId, agent)` factory. The product is fixed by which router a request hit, so there is no runtime `:productId` to validate or forget to validate
  - **Usage events live in memory**, not DynamoDB. The plan's "local substitute" became the permanent answer, so the accumulation window does not survive a restart and **DynamoDB holds skills only**. This is why INFRA's generic `pk`/`sk` key was solving a problem this codebase does not have
  - **One design decision was reversed: SSE now carries discovery output.** Step 8 said twice that SSE is Agentic Control only. A run taking tens of seconds with no sign of life reads as a hang. Polling still delivers the announcement, so the "no push required" property holds - but FR-5.11 on that channel now depends on what discovery emits rather than on discovery having no channel. Weaker enforcement, stated plainly
  - **No tests exist in `packages/backend`.** All four properties scoped in `business-rules.md` section 6 are unimplemented. This is the NFR-3.1 gap for BE and it is carried as finding F-1 in the Build and Test summary, not closed
  - **The FE handoff artifact is `api-examples.md`**, not the planned `fe-integration-notes.md`. Real unedited captures against live Bedrock, Friendli and INFRA's deployed table rather than described shapes - which is what the interface evolution policy actually needs
  - **Dockerfile dropped**, as the plan allowed. `ecs-tasks.amazonaws.com` is absent from the account's `iam:PassRole` whitelist, so there is no container target
- [x] **FE: Functional Design -> Code Generation COMPLETE. Code APPROVED 2026-08-20T22:15:00Z**
  - **STARTED** 2026-08-20T08:00:00Z on branch `aidlc/construction-fe`
  - Functional Design **APPROVED** 2026-08-20T08:45:00Z. Plan at `aidlc-docs/construction/plans/fe-functional-design-plan.md`, all 14 questions answered. Artifacts at `aidlc-docs/construction/fe/functional-design/`
  - Code Generation **plan APPROVED and Part 2 COMPLETE** 2026-08-20T09:15:00Z, **code APPROVED 2026-08-20T22:15:00Z** after the iteration and polish passes below. Plan at `aidlc-docs/construction/plans/fe-code-generation-plan.md`, all 23 steps [x]. Summary at `aidlc-docs/construction/fe/code/code-summary.md`
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

- [x] **Build and Test - COMPLETE and APPROVED 2026-08-21T01:40:00Z**, joint, after all three units. Five instruction files at `construction/build-and-test/`; `build-and-test-summary.md` is the artifact of record
  - **The demo path runs end to end** against real Bedrock, real Friendli/EXAONE and INFRA's real deployed table. Both mandatory integration checkpoints held - hour 5.5 thin end-to-end and hour 9.0 full demo path
  - **`execution-plan.md` predicted the failure class correctly.** It moved the top risk to "integration at the seams" and raised the level to High. **Both real defects were at seams and neither was visible from inside the unit that caused it**: the DynamoDB key schema (`pk`/`sk` against BE's `id`, every read would have thrown `ValidationException`) and the `engines.node` floor
  - **FR-5.5 passes including the inverted test.** The clamp shows 25 not 30, and **suppressing the flush makes the UI fail to update** rather than optimistically showing the agent's intent. That second test is the one that proves it, and it holds because `device-stub` is a separate process - the state object is genuinely not in the agent's memory
  - **FR-5.11 passes structurally on the tool path** (`grep` confirms nothing under `src/tools/` imports `data/usage.ts`) and is **weaker on the SSE path** than designed
  - Builds all clean: `tsc -b`, `vite build`, `cdk synth`, `cdk deploy`. `npm audit` 0 vulnerabilities. 26 tests pass in FE, infra suite passes, **backend has none**
  - **Five open findings carried rather than closed**: F-1 no BE tests (the NFR-3.1 gap, PBT-02 unmet), F-2 CI covers the frontend only, F-3 FR-2.5 cosmetic evolution partly held, F-4 voice not wired so US-4.1 is dropped, F-5 assorted smaller items. F-3 and F-4 were **second and first on the pre-agreed drop order**, so neither was discovered missing here
  - **7 of 9 stories delivered.** US-3.1, the deep pillar, runs on real EXAONE

**Cross-unit items FE raised for BE** (2026-08-20T08:30:00Z, detail in `fe/functional-design/backend-mock-contract.md`):
- **Structural ask 1**: one SSE stream for all three characters, each event naming its `characterId`. A per-character stream cannot deliver an announcement for a character the user is not viewing, which is what FE's badge behaviour depends on
- **Structural ask 2**: `deviceState` always a separate field from reply text. FE's FR-5.5 enforcement is that no function accepts a string and returns stats, and that only holds if the response separates them
- **RISK, unresolved**: how discovery is made to fire on cue for the demo. FR-5.10 triggers on accumulated data volume, so timing is outside the presenter's control. FE has no lever and no fallback if it stays silent during the show. Needs settling early, not at rehearsal
- **Note for the hour-5.5 checkpoint**: a scripted in-process mock cannot prove real SSE behaviour through dev-server proxies or buffering intermediaries. An SSE route emitting one hardcoded event is enough to find out, so it is worth doing before the checkpoint rather than at it
  - **Both structural asks were met.** One SSE stream naming its `characterId` per event, and `deviceState` always a separate field from reply text. Both are regression-checked in `construction/build-and-test/integration-test-instructions.md` section 7
  - **The unresolved risk was resolved 2026-08-20T14:00:00Z, and not by changing the trigger.** BE added a dev-only lever, `POST /internal/discovery/:productId/run`, which forces a run now while sharing the threshold path's in-flight guard and counter reset. FE's "no lever and no fallback" concern is answered; the trigger itself is untouched, so nothing about the autonomous behaviour was weakened to make the demo safe
  - **The SSE proxy check was done before the checkpoint, as advised**, and passes through the Vite dev server. Tokens arrive incrementally rather than as one block

### BE structural decisions (S1-S7)
| | Decision |
|---|---|
| S1 | `createAgent` for control, `StateGraph` for discovery |
| S2 | Express 5, SSE hand-rolled in one helper |
| S3 | Concern-based flat directories under `packages/backend/src` |
| S4 | `tsx` dev, `tsc` build, `tsc --noEmit` separate |
| S5 | `device-stub` separate process, port 4000 |
| S6 | Three agents at boot; in-memory checkpointer for conversation, DynamoDB read-and-inject for skills |
| S7 | Skills reached through `listSkills` and `getSkill` tools, not the system prompt |

### BE settled domain decisions
- A skill is a **Markdown document** describing a new feature or mode, stored in DynamoDB as a string
- Skill fields: `id`, `productId`, `title`, `content`, `status`, `createdAt`
- Discovery threshold: **3 new events**. Ignore re-crossing mid-run, reset after empty run, fixture may fire on first boot
- Discovery emits **per-phase progress over SSE** so the run is visible
- **No progression state in BE.** FE derives level from the skill list
- FR-3.4 relocated: prose cannot be validated, so execution is bounded by the control agent's tool set instead
- FR-5.11 relocated: no separate provenance field exists, so it becomes a generation-time constraint on what the document may contain

**Delta against the built code** (2026-08-20T14:40:00Z, BE Code Generation close-out). The decisions above are left as recorded; these are the differences:
- **`status` did not survive.** Removal is a **hard delete**, not a `retired` transition. BE-R-12 is a recorded regression, not a satisfied rule
- **`title` and `summary` are bilingual objects**, not strings, once Korean-default plus English-toggle met a skill card showing both. A **`kind`** field was added (`buff` condition-activated, `action` run-on-command) - it classifies the prose rather than making it executable, and nothing fires a `buff` automatically
- **S3 came out per-product, not concern-flat.** One agent file and one router file per product plus a `characterRouter` factory, because that puts the 1:1:1 binding in the file layout instead of a runtime lookup
- **Usage events never reached DynamoDB.** In memory only, so the accumulation window does not survive a restart

### Parked until their code is written
Q5 document rewrite semantics · Q6 skills per run · Q7 placeholder capability vocabulary · prompt wording · discovery node internals

**How each owner starts**: on their own branch, open a session and say
`AI-DLC Construction, {INFRA|BE|FE} 담당` .
The agent reads `aidlc-state.md` for that unit's scope and constraints, then runs Functional Design followed by Code Generation.

**INFRA branch `construction/infra` created 2026-08-20T08:55:00Z.** Environment survey, Functional Design and Code Generation are all **complete**; the stack is deployed and verified against the live account. Read the account-deletion and measured-environment sections below before doing any INFRA work - they contain facts that no other artifact carries.

*(Removed here: a duplicated set of empty Workflow Planning / Application Design / Units Generation / Per-Unit Loop checkboxes that contradicted the completed entries above. All four are already tracked correctly earlier in this section.)*

### OPERATIONS PHASE
- [x] Operations (PLACEHOLDER - **closed as out of scope 2026-08-21T01:45:00Z.** The framework stage carries no content and this project's deployment target dies with the AWS account, so there is nothing to execute)

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

## HARD CONSTRAINT - AWS account is deleted in 3 days (2026-08-20T08:45:00Z)

Set by user directive. The account is destroyed around **2026-08-23**, which changes IaC from an optional convenience into a first-class deliverable. `execution-plan.md` frames deployment as "conditional on time remaining"; **that framing no longer covers this** and IaC portability is now required regardless of whether the app is ever deployed.

**Decision: AWS CDK in TypeScript**, `infra/` workspace inside the existing monorepo, `aws-cdk-lib` pinned at 2.266.0.
- Terraform was seriously considered and wins on exactly one axis: CDK needs `cdk bootstrap` per account and region, which creates a CDKToolkit stack (S3 bucket, ECR repo, SSM parameter, five IAM roles) that dies with the account and must be re-established in any future one. Terraform has no equivalent prerequisite.
- CDK chosen anyway because the resource surface is small enough that expressiveness is a wash, the toolchain is already verified working, and TypeScript keeps IaC inside the monorepo's existing typecheck and test pipeline instead of adding HCL as a second language against a ~3 hour budget.
- **Revisit if the next account is corporate**, where IAM role creation may need approval. For a personal or another Workshop Studio account, bootstrap is a non-issue.

**What IaC cannot capture, and therefore must be written down.** This matters more for reuse than the tool choice:
1. **Bedrock model access is not IaC-manageable.** No entitlement or model-access API exists in the Bedrock CLI, and no CloudFormation or Terraform resource covers it. It is a console action. Not hypothetical - see the measured entitlements below. A future account will apply the IaC perfectly and still fail to run the app, and that failure appears nowhere in the IaC logs.
2. `FRIENDLI_API_KEY` is outside AWS entirely.
3. The region lock and `iam:PassRole` whitelist are account-attached policies rather than our code, and may differ in the next account.

**Required deliverable**: `infra/README.md` carrying a prerequisite checklist - Bedrock model IDs to enable, required region, required IAM permissions, environment variable names.

**Required before the account dies**: `cdk bootstrap` and `cdk deploy` must be run to completion at least once. IaC that has never been applied is an unverified draft, not a reusable asset, and after deletion there is no environment left to verify it against.

---

## Measured Environment Facts (2026-08-20T08:12:00Z)

Probed against the live account, not inferred from documents. Full detail in `audit.md`.

**Account** `643922457910`, `WSParticipantRole` (Workshop Studio), profile `prompthon`, region `us-east-1`.

**Permission boundary**
- **Region lock**: everything outside `us-east-1` denied, with a NotAction exception list including `bedrock:Invoke*`, `s3:*`, `iam:*`. DynamoDB, Transcribe and EC2 are us-east-1 only.
- `iam:CreateRole` and `iam:CreatePolicy` allowed. **`iam:CreateUser` is not.**
- **`iam:PassRole` restricted to**: lambda, ec2, apigateway, events, scheduler, rds, dynamodb, cloudformation, bedrock. **`ecs-tasks.amazonaws.com` absent, so ECS/Fargate is unavailable.** EC2 as the conditional deploy target is correct by necessity, not just preference.

**Bedrock model access - full census by real Converse calls, 2026-08-20T09:10:00Z**

Bedrock lists 121 models here, of which 88 are text-in/text-out. Probing every non-provisioned candidate: **59 invoke successfully, 49 of those support tool calling**, 14 are blocked. The listing is not the availability, so trust this census rather than `ListFoundationModels`.

**Critical gotcha**: most current models are `INFERENCE_PROFILE` only and **must be called with the `us.` or `global.` prefix**. The bare ID fails with "Invocation of model ID ... with on-demand throughput isn't supported". Verified: `anthropic.claude-sonnet-4-5-20250929-v1:0` fails, `us.anthropic.claude-sonnet-4-5-20250929-v1:0` works.

**Tool-calling capable (49) - the only ones usable for Agentic Control**

| Provider | Invoke IDs |
|---|---|
| Anthropic (6) | `us.anthropic.claude-sonnet-4-5-20250929-v1:0`, `us.anthropic.claude-sonnet-4-6`, `us.anthropic.claude-haiku-4-5-20251001-v1:0`, `us.anthropic.claude-opus-4-1-20250805-v1:0`, `us.anthropic.claude-opus-4-5-20251101-v1:0`, `us.anthropic.claude-opus-4-6-v1` |
| Amazon (4) | `amazon.nova-micro-v1:0`, `amazon.nova-lite-v1:0`, `amazon.nova-pro-v1:0`, `us.amazon.nova-2-lite-v1:0` |
| Meta (5) | `us.meta.llama3-1-8b-instruct-v1:0`, `us.meta.llama3-1-70b-instruct-v1:0`, `us.meta.llama3-3-70b-instruct-v1:0`, `us.meta.llama4-scout-17b-instruct-v1:0`, `us.meta.llama4-maverick-17b-instruct-v1:0` |
| Mistral (10) | `mistral.ministral-3-3b-instruct`, `mistral.ministral-3-8b-instruct`, `mistral.ministral-3-14b-instruct`, `mistral.mistral-small-2402-v1:0`, `mistral.mistral-large-2402-v1:0`, `mistral.mistral-large-3-675b-instruct`, `mistral.devstral-2-123b`, `us.mistral.pixtral-large-2502-v1:0`, `mistral.voxtral-mini-3b-2507`, `mistral.voxtral-small-24b-2507` |
| Qwen (5) | `qwen.qwen3-32b-v1:0`, `qwen.qwen3-next-80b-a3b`, `qwen.qwen3-coder-30b-a3b-v1:0`, `qwen.qwen3-coder-next`, `qwen.qwen3-vl-235b-a22b` |
| OpenAI OSS (4) | `openai.gpt-oss-20b-1:0`, `openai.gpt-oss-120b-1:0`, `openai.gpt-oss-safeguard-20b`, `openai.gpt-oss-safeguard-120b` |
| NVIDIA (4) | `nvidia.nemotron-nano-9b-v2`, `nvidia.nemotron-nano-12b-v2`, `nvidia.nemotron-nano-3-30b`, `nvidia.nemotron-super-3-120b` |
| Z.AI (3) | `zai.glm-4.7`, `zai.glm-4.7-flash`, `zai.glm-5` |
| MiniMax (3) | `minimax.minimax-m2`, `minimax.minimax-m2.1`, `minimax.minimax-m2.5` |
| Moonshot (2) | `moonshot.kimi-k2-thinking`, `moonshotai.kimi-k2.5` |
| Writer (2) | `us.writer.palmyra-x4-v1:0`, `us.writer.palmyra-x5-v1:0` |
| DeepSeek (1) | `deepseek.v3.2` |

**Invokes but no tool calling (10) - unusable for Agentic Control**: `us.deepseek.r1-v1:0`, `meta.llama3-8b-instruct-v1:0`, `meta.llama3-70b-instruct-v1:0`, `mistral.mistral-7b-instruct-v0:2`, `mistral.mixtral-8x7b-instruct-v0:1`, `writer.palmyra-vision-7b` all reject `toolConfig` outright. `google.gemma-3-4b-it`, `gemma-3-12b-it`, `gemma-3-27b-it`, `mistral.magistral-small-2509` accept it but answer in prose instead of calling the tool.

**Blocked entirely (14)**
- Legacy or end-of-life (5): `anthropic.claude-3-haiku-20240307-v1:0`, `us.anthropic.claude-sonnet-4-20250514-v1:0`, `us.amazon.nova-premier-v1:0`, `ai21.jamba-1-5-mini-v1:0`, `ai21.jamba-1-5-large-v1:0`. Claude 3.5 Haiku is end-of-life.
- Not entitled to this account (9): `us.anthropic.claude-sonnet-5`, `us.anthropic.claude-opus-5`, `us.anthropic.claude-opus-4-7`, `us.anthropic.claude-opus-4-8`, `us.anthropic.claude-fable-5`, `us.openai.gpt-5.6-luna`, `us.openai.gpt-5.6-sol`, `us.openai.gpt-5.6-terra`, `us.xai.grok-4.6`.

**DECISION for Agentic Control (revised 2026-08-20T09:40:00Z, user directive)**: default is **`us.anthropic.claude-opus-4-6-v1`**, with `us.anthropic.claude-haiku-4-5-20251001-v1:0` as the documented fallback and `amazon.nova-lite-v1:0` as the cheap floor.

**The model ID must be an environment variable** (`BEDROCK_MODEL_ID`), not a literal. This is what makes the choice cheap: if Opus feels slow during rehearsal, reverting to Haiku is a config flip rather than a code change. INFRA owns this in the environment contract.

**Streaming condition - SATISFIED** (user confirmed 2026-08-20T09:50:00Z: chat replies are streamed). Opus 4.6 takes ~4.1s for a 2-3 sentence Korean reply against Haiku's 2.9s, which reads as the character speaking when streamed and would be four seconds of blank screen if it were not. Use `ConverseStream`. If streaming is ever dropped, revert `BEDROCK_MODEL_ID` to Haiku 4.5.

**NFR-4.2 is moot for character art** (user confirmed 2026-08-20T09:50:00Z): level-up art uses pre-made character animation files, not runtime generation. The clause's only concrete example is therefore already satisfied by design, which is consistent with withdrawing it as a latency argument against Opus.

Also cap `maxTokens` around 300 and instruct 2-3 sentences in the system prompt. Opus's wall clock is competitive precisely because it answers tersely, so pin that with the prompt rather than relying on it.

**Latency measured 2026-08-20T09:25:00Z** on a realistic request - Korean character prompt, two tool definitions, tool call completed. Median of 3, so differences among Haiku/Sonnet/Opus are partly noise; the tokens-per-second ordering is the reliable signal.

| Model | Wall clock | Output tokens | Tokens/s | Tool call |
|---|---|---|---|---|
| `amazon.nova-lite-v1:0` | 1.11s | 104 | **94** | 3/3 |
| `amazon.nova-pro-v1:0` | 1.53s | 134 | 88 | 3/3 |
| **`us.anthropic.claude-haiku-4-5`** | 1.87s | 140 | **75** | 3/3 |
| `us.anthropic.claude-opus-4-6-v1` | 2.03s | 76 | 37 | 3/3 |
| `us.anthropic.claude-opus-4-5` | 2.06s | 75 | 36 | 3/3 |
| `us.anthropic.claude-sonnet-4-6` | 2.42s | 117 | 48 | 3/3 |
| `us.anthropic.claude-sonnet-4-5` | 3.05s | 93 | 30 | 3/3 |

No throttling at 8 concurrent requests for either Opus 4.6 or Haiku 4.5, though concurrent calls queue to ~4.4s and ~3.3s respectively. Irrelevant for a single-operator demo.

**History of the Opus 4.6 decision.** It was first recommended against at 09:25, then **adopted at 09:40**. The reversal is recorded with the reasoning because two of the three original objections did not survive scrutiny.

- ~~NFR-4.2 points the other way.~~ **Overstated and withdrawn.** NFR-4.2's own example is character art generated on level-up, so it targets slow generation that *blocks* a visible interaction, not the latency of the reply that *is* the interaction. Reading it as a latency budget for chat replies stretched the clause.
- ~~It blurs the two-model rationale.~~ **Partly withdrawn.** Agentic Control being BASELINE describes the depth of the *control* capability. The character's voice and personality come through the same model, and for a product selling an "AI-characterized companion" that is product value rather than plumbing. A stronger model writing better Korean character dialogue is a legitimate argument in favour.
- **The task does not need that tier - still true.** Even Nova Lite chose the right tool and extracted arguments correctly 3/3. Opus buys nothing on tool selection. It buys dialogue quality, which is a different and valid reason.

What the measurements actually showed, none of it disqualifying: tool calling 3/3, no throttling at 8 concurrent, terser output than Haiku (76 tokens vs 140), and cost negligible in absolute terms at demo volume despite being roughly 20x Haiku per token. The single real cost is per-token throughput at 37/s against Haiku's 75/s, which is why the streaming condition above is binding rather than advisory.

Opus also remains a good build-time tool for authoring persona prompts and fixture patterns, which is not a runtime dependency and does not enter the environment contract.

**This census does not transfer to a new account.** Entitlements are per-account, which is exactly why the account-deletion section requires them written into `infra/README.md`.

**Account contents** (as measured at 08:12, ~~superseded by the deployment below~~): DynamoDB 0 tables. S3 0 buckets, so **CDK is not bootstrapped**. Default VPC `vpc-0e879b6764ca8fc90`. Transcribe reachable. Monorepo **not** initialised despite `unit-of-work.md` claiming otherwise - no root `package.json`, no `packages/`.

**Corrected 2026-08-20T10:36:00Z**: CDK **is** now bootstrapped and the runtime stack is deployed. The root npm workspace and `infra/` exist. DynamoDB is still 0 tables, and that is deliberate, not pending setup. `packages/` is still absent and belongs to BE and FE.

**Pre-existing stack `bedrock-apikey`** (created 2026-08-19T02:29Z, before this project). IAM user plus a Bedrock bearer token exposed in plaintext as a stack Output; credential self-expires 2026-08-24. **Decision: leave untouched, do not use.** Profile credentials already work so the token is a redundant auth path, and deletion is irreversible because `iam:CreateUser` is not granted. **Never copy that token into a document or commit** - the copy would be the actual NFR-1.1 violation, not the stack.

**Local toolchain**: **Node 22.23.2** (npm 10.9.8). Upgraded from 20.20.2 because `@langchain/openai@1.5.9` requires `node >=22`, and that package is the mandated EXAONE/Friendli path. Installed via Homebrew with `node@20` unlinked and `node@22` linked, so all execution contexts agree. Full dependency set verified to resolve with no peer conflicts. **pnpm and Docker deliberately not installed** - npm workspaces satisfies the settled monorepo decision, and nothing in this phase needs Docker. Pin `typescript` at `^5.9.3`; latest is now 7.0.2, the native-port rewrite, too new for this clock.

---

## INFRA Deployed Runtime (2026-08-20T10:36:00Z) - the account-deletion requirement is SATISFIED

`cdk bootstrap` and `cdk deploy` have both **actually run to completion** against the live account, so `infra/` is a verified reusable asset rather than an unapplied draft. Full handoff in `aidlc-docs/construction/infra/code/runtime-contract.md`; evidence in `deployment-evidence.md` beside it.

| Item | Value |
|---|---|
| Stack | `prompthon-runtime` (`UPDATE_COMPLETE`, `cdk diff` clean) |
| EC2 | `i-0ede6aab809e7c1b0`, `t3.small`, AL2023, `us-east-1a`, running |
| Role | `prompthon-runtime-BackendRole78202DE5-AcROqSKNntXL` |
| Security group | `sg-0715b9fa40c2c378d` — **zero inbound rules** |
| Management | SSM Session Manager, agent `Online`. No key pair, no SSH port, IMDSv2 required |
| Role actions | `ssm:GetParameter` (one exact parameter ARN), `bedrock:InvokeModel`, `bedrock:InvokeModelWithResponseStream`, `transcribe:StartStreamTranscription` |
| DynamoDB | `prompthon-runtime-AppTable815C50BC-1O831W9BLPJNG`, `ACTIVE`. **Partition key `id` (String) only**, no sort key, on-demand, 0 indexes. Added 11:55Z, key schema corrected against BE's PR #7 at 12:10Z |
| Bootstrap | `CDKToolkit` created. Account-level, dies with the account, must be re-run in any future account |

**Bedrock IAM actions, corrected 2026-08-20T11:05:00Z.** An earlier version of this section claimed `bedrock:Converse` and `bedrock:ConverseStream` are not IAM action names. **That was wrong** — they exist. The rule depends on direction:

- **Allow**: `bedrock:InvokeModel` + `bedrock:InvokeModelWithResponseStream` are sufficient. Converse depends on Invoke, so it works without a separate grant. **Verified empirically**: the deployed role holds only those two actions and a `bedrock-runtime converse` call from the instance succeeded.
- **Deny**: denying `InvokeModel` already blocks Converse. [AWS documents `bedrock:InvokeModel*` as a wildcard, or adding `bedrock:Converse` and `bedrock:ConverseStream` to the action list, when you want the denial written out explicitly](https://docs.aws.amazon.com/bedrock/latest/userguide/security_iam_id-based-policy-examples.html). *(Content rephrased for compliance with licensing restrictions.)*

Removing them from the Allow policy was still correct, because there they granted nothing. Do not carry the "not an IAM action" claim into a Deny policy.

**Cost**: roughly $0.023/hr. Stopping the instance while idle is enough; do not `cdk destroy`, because that discards the verified deploy this whole constraint existed to obtain.

## Next Step

**Nothing outstanding in the workflow. Every stage is complete and approved.** INFRA, BE and FE all closed, joint Build and Test approved 2026-08-21T01:40:00Z, Operations closed as out of scope 2026-08-21T01:45:00Z.

**What is actually next is not a stage.** Two things, in this order:

1. **Before the demo**: rotate the Friendli token (it was pasted into a chat transcript during setup), and rehearse the discovery run using the dev-only lever `POST /internal/discovery/:productId/run` rather than hoping usage crosses the threshold on cue.
2. **Before the AWS account dies around 2026-08-23**: nothing. The constraint is already satisfied - `cdk bootstrap` and `cdk deploy` both ran to completion, so `infra/` is a verified reusable asset. **Do not `cdk destroy`.** Stop the instance while idle instead.

**Open findings are carried, not closed.** `construction/build-and-test/build-and-test-summary.md` section 4 lists five: no BE tests (the NFR-3.1 gap, and PBT-02 is unmet), CI covering the frontend only, FR-2.5 cosmetic evolution partly held, voice not wired so US-4.1 is dropped, plus smaller items. The last two were first and second on the pre-agreed drop order.

**The per-product phase is what comes after this.** The scaffolding phase existed to make it cheap: the pipeline runs end to end, so adding a product should be data and tools rather than architecture. Still ahead: authentic capability vocabularies, real attribute keys, per-product usage rhythms, the device time model, per-product agent tools, and a fixture spanning the 14-day and 60-day skill tiers.

---

### Historical: the INFRA-to-BE handoff (retained, resolved)

*All five blocking items below were resolved during BE Code Generation. Kept because the reasoning behind each is still the reason it must stay that way.*

**What BE needs from INFRA is now published.** Read `aidlc-docs/construction/infra/code/runtime-contract.md`. It carries a **MANDATORY for BE** section with five blocking items found by reviewing PR #7: `DDB_TABLE_NAME` must be set (the `prompthon-local` default does not exist), `engines.node` must be `>=22` not `>=20` because `@langchain/openai@^1.5.9` requires it, root `workspaces` must include `infra` or CDK dependencies stop installing, `.env-example` is missing the boot-required `FRIENDLI_ENDPOINT_ID`, and on EC2 the Friendli key comes from SSM rather than `.env`.

**DynamoDB handoff simplified 2026-08-20T11:10:00Z, then resolved 2026-08-20T11:55:00Z, both by user directive.** The seven-field access-pattern contract (caller, operation, owner boundary, consistency, fields, result bound, RPS) was **withdrawn as over-process for a demo**. Then the table was **created up front** rather than waiting on BE at all.

**Corrected 2026-08-20T12:10:00Z against BE's PR #7.** The table was first created with `pk`/`sk` on the reasoning that a meaning-neutral base key cannot be wrong later. Reading BE's `packages/backend/src/data/skills.ts` showed it addresses items by **`id` alone**, so every `Key: { id }` call would have failed with `ValidationException`. The table was replaced, empty, to match. **BE's data-access code is the contract**, and the earlier `pk`/`sk` reasoning was solving a problem this codebase does not have: usage events stay in memory by BE's own deferral, so skills are the only thing persisted, read by id plus a `Scan` filter.

**Table names must not be fixed.** `tableName: 'prompthon-app'` made the first replacement attempt fail outright — CloudFormation cannot replace a custom-named resource because it would create the replacement before deleting the original and the names collide. The name is now generated and travels as `DDB_TABLE_NAME`.

**Still binding**: keys come from a server-generated value, never a client-supplied identifier. BE satisfies this with `randomUUID()`.

**GSIs remain absent** and are added one per deploy when a lookup needs one — CloudFormation refuses more than a single index change per stack update. LSIs are excluded permanently since they cannot be added after table creation.

**Friendli handoff to BE**: the actual `FRIENDLI_API_KEY` value is intentionally unread and unverified by INFRA. BE must confirm it in its own local environment and run the four first-hour checks below.

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
- ~~**Bedrock removed from the runtime.** AWS surface narrows to DynamoDB and Transcribe.~~ **SUPERSEDED** by the 05:14:22Z two-model split and by `application-design.md` section 5 (07:14:09Z), both of which keep Bedrock for Agentic Control. **Bedrock is in the runtime. AWS surface is Bedrock + DynamoDB + Transcribe.** Confirmed against the live account 2026-08-20T08:12:00Z - Bedrock reachable, tool calling working.
- **Wrapped as `ChatOpenAI` with `baseURL` overridden** - no custom LangChain integration needed, so `createAgent`, middleware, tool binding, and the LangGraph discovery workflow all work unchanged. Single construction site, built at `packages/backend/src/models/exaone.ts` (directory is `models/`, not `model/`).
- **`chat_template_kwargs` goes through `modelKwargs`**, since it is not an OpenAI parameter.
- Two instances: `exaoneChat` (thinking off, control path), `exaoneReasoning` (thinking on, discovery).
- **Voice unaffected** - Transcribe converts speech to text before the model sees it.
- **Access mediation specified**: EXAONE mediates *access*, does not *author* values. No direct data endpoint for the browser; data reaches the client as structured tool-call results carried alongside the prose, and the UI renders from the structured part. This reconciles the constraint with FR-5.5.
- **First-hour verification, 4 items**: tool calling on the *dedicated* endpoint (documentation found covers serverless only - failure here means rework), `modelKwargs` passthrough, thinking-output shape, and whether `seed` is honoured.
  - **RESOLVED 2026-08-20T10:14:07Z.** Detail in `construction/be/code/verification-results.md`. Tool calling on the dedicated endpoint **passed** - the blocking check cleared, so S1 and S7 stand and no rework was needed. `chat_template_kwargs` passthrough passed. **Thinking output arrives in separate fields** (`reasoning`, `reasoning_content`) with `content` already clean, which **cancelled the planned `stripThinking` sanitiser** - there was nothing to strip. `seed` deliberately skipped as non-blocking.
- **NFR-4.1 conflict**: determinism as written is unachievable with LLM-based discovery. ~~Restatement pending Q12.~~ **Closed**: restated as **shape** reproducibility rather than output equality, held by temperature 0.1-0.3 with replay of a stored run as the reserve. `seed` would have made this easier, not possible, which is why verifying it was dropped.

## Requirements Gaps Found During Application Design Planning
Two things no requirement specifies, raised as questions rather than assumed. **Both closed during Construction, and both by FE and BE agreeing directly rather than by an Inception-era contract** - which is the interface evolution policy working as intended:
1. **Announcement transport** - FR-3.6 requires an unprompted announcement, so the browser must learn of a server-side event it did not request. No requirement says how. **Closed 2026-08-20T09:58:44Z: FE polls the skill list.** That kept the announcement unprompted and kept SSE scoped to Agentic Control with no exception carved out. Cost: poll-interval latency, visible on stage. *(SSE later did start carrying discovery progress as well - see the BE Code Generation entry - but polling remains what delivers the announcement.)*
2. **Discovery trigger** - FR-3.2 says a run completes without intervention once started, but nothing says what starts it. **Closed: accumulated volume, 3 new events since the last run, per product.** Fire-and-forget, one run at a time, counter resets even after an empty run. The residual risk this creates - nothing guarantees a run fires while someone is watching - was answered with a dev-only lever (`POST /internal/discovery/:productId/run`) rather than by changing the trigger.

## Timeline Correction
Build window is **1.5 days**, not the 1-2 days `requirements.md` was written against. Corrected by the user at 2026-08-20T02:36:41Z. Story scope was tightened accordingly; the same correction should inform Workflow Planning and Code Generation scope.

## Session History
- **2026-08-19T07:27:43Z** - Session 1: Workspace Detection completed, Requirements Analysis started, stopped at Step 6 gate.
- **2026-08-19T07:41:12Z** - Session 2: Resumed. No answers found in the question file, so the Step 6 gate was re-presented via `aidlc-docs/session-resume-questions.md`. No stage progress advanced.
- **2026-08-20T02:22:47Z - 07:41:33Z** - Session 3: Inception completed end to end. Requirements Analysis approved, User Stories approved after 4 revisions, Workflow Planning approved at revision 5, Application Design approved with the detailed interface contract deliberately discarded, Units Generation approved with 3 units. Construction split across three branches from here.
- **2026-08-20T08:00:00Z - 11:40:00Z** - Session 4, INFRA on `construction/infra`: environment survey against the live account, Functional Design approved, Code Generation approved. `cdk bootstrap` and `cdk deploy` both run to completion, which is what satisfies the account-deletion constraint.
- **2026-08-20T09:41:52Z - 14:45:00Z** - Session 5, BE on `construction/be`: Functional Design approved on structural decisions S1-S7, Step 0 verification run against the live Friendli endpoint, Code Generation approved. The DynamoDB key-schema mismatch with INFRA was found and fixed at 12:10:00Z.
- **2026-08-20T08:00:00Z - 22:15:00Z** - Session 6, FE on `aidlc/construction-fe`: Functional Design approved, Code Generation approved after an iteration pass with real character art and a polish pass. Ran in parallel with sessions 4 and 5, which is why its window overlaps theirs.
- **2026-08-21T00:20:00Z - 01:45:00Z** - Session 7: joint Build and Test. Five instruction files generated, seven integration scenarios run against real Bedrock, real Friendli and the deployed table. Stage approved 01:40:00Z with five open findings carried rather than closed. Operations closed as out of scope 01:45:00Z. **Workflow complete.**
