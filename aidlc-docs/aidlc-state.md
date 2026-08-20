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
- [x] Requirements Analysis (requirements.md generated, awaiting approval)
- [ ] User Stories (assessed: SKIP by default per Lean choice; offered as an option at the requirements approval gate)
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

## Settled Decisions
- **Products**: Pra.L (beauty), ShoeCase (life/niche), Massage Chair (wellness). One agent and one character each.
- **Pillar depth**: Skill Discovery DEEP and autonomous and primary; Character Progression THIN and presentation-led; Agentic Control BASELINE.
- **Stack**: TypeScript/Node, LangGraph with LangChain v1 `createAgent` plus middleware, Bedrock, Polly, browser Web Speech API.
- **Storage**: JSON fixtures for usage history; DynamoDB for progression, skills, device state, feedback; in-memory LangGraph checkpointer for conversation; audio not persisted.
- **Auth**: none, one hardcoded demo user. Conditional passcode NFR if ever deployed publicly.
- **Hosting**: local first, EC2 only if time remains.
- **UI**: mobile-first responsive browser app, Korean default with English toggle.
- **Progression rewards**: skill unlocks at thresholds plus cosmetic evolution. No personality or tone change by level.
- **Workflow shape**: Requirements Analysis, Workflow Planning, Functional Design, Code Generation, Build and Test. NFR Design and Infrastructure Design skipped. User Stories skipped by default.

## Next Step
Awaiting approval of `aidlc-docs/inception/requirements/requirements.md`. On approval, proceed to Workflow Planning, unless the user elects to add the User Stories stage.

## Session History
- **2026-08-19T07:27:43Z** - Session 1: Workspace Detection completed, Requirements Analysis started, stopped at Step 6 gate.
- **2026-08-19T07:41:12Z** - Session 2: Resumed. No answers found in the question file, so the Step 6 gate was re-presented via `aidlc-docs/session-resume-questions.md`. No stage progress advanced.
