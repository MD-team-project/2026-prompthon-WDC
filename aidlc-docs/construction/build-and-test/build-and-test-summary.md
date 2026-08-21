# Build and Test Summary

**Stage**: CONSTRUCTION - Build and Test
**Created**: 2026-08-21T00:20:00Z
**Completed**: 2026-08-21T01:15:00Z
**Status**: **COMPLETE and APPROVED 2026-08-21T01:40:00Z**
**Scope**: joint, all three units - INFRA, BE, FE

Companion documents: `build-instructions.md`, `unit-test-instructions.md`, `integration-test-instructions.md`, `performance-test-instructions.md`.

---

## 1. Outcome

**The demo path runs end to end**, against real Bedrock, real Friendli/EXAONE and INFRA's real deployed DynamoDB table. Both mandatory integration checkpoints held.

Two of the nine user stories are not fully delivered, and both were on the pre-agreed drop order rather than being discovered missing here.

| | Result |
|---|---|
| Builds | All clean. `tsc -b`, `vite build`, `cdk synth`, `cdk deploy` |
| Unit tests | 26 pass in FE, infra suite passes, **backend has none** |
| Integration | 7 scenarios, all pass. Two real defects found and fixed, both at seams |
| Performance | Within demo tolerance. Streaming is a binding condition |
| `npm audit` | 0 vulnerabilities |

## 2. The prediction that came true

`execution-plan.md` raised the project risk level to High and moved the top risk from "the discovery pillar working at all" to **"integration at the seams"**, on the reasoning that three independently built components meeting for the first time is the most likely failure.

**Both defects that mattered were at seams, and neither was visible from inside the unit that caused it.**

- **The DynamoDB key schema.** INFRA created the table with `pk`/`sk`, on the reasonable-sounding basis that a meaning-neutral base key cannot be wrong later. BE's `data/skills.ts` addresses items by `id` alone. Every read would have thrown `ValidationException`. Caught 2026-08-20T12:10:00Z by reading BE's PR rather than by a test, and fixed by replacing the empty table. Two rules came out of it: **BE's data-access code is the contract**, and a fixed `tableName` makes CloudFormation unable to replace a table at all, because it would create the replacement before deleting the original and the names collide.
- **The `engines.node` floor.** `>=20` installs and then fails, because `@langchain/openai` requires 22 and that is the mandated EXAONE path.

Neither is a clever bug. Both are exactly the kind of thing that only appears when two units meet, which is the point.

**What the process got right here**: the generic `pk`/`sk` key was solving a problem this codebase does not have. Usage events ended up staying in memory by BE's own deferral, so skills are the only persisted entity - read by `id` plus a `Scan` filter. Deferring the schema to the moment the code existed cost one table replacement; fixing it in Inception would have cost the same replacement plus a renegotiation.

## 3. FR-5.5 and FR-5.11, verified rather than asserted

**FR-5.5 passes, including the inverted test.** Asking for 30 minutes on a capability the stub clamps to 25 shows 25 in the UI. More importantly, **suppressing the flush makes the UI fail to update** rather than optimistically showing the agent's intent. That is the test `execution-plan.md` specified at 2026-08-20T04:02:33Z when it corrected its own earlier reading of the risk, and it holds because `device-stub` is a separate process on its own port - the state object is genuinely not in the agent's memory.

**FR-5.11 passes structurally on the tool path.** Nothing under `packages/backend/src/tools/` imports `data/usage.ts`, verifiable by `grep`. The absent import is the enforcement.

**FR-5.11 is weaker on the SSE path than the design intended.** BE's Step 8 stated twice that SSE carries Agentic Control output only; the built code emits discovery progress and results over it. The reasoning is recorded in the BE plan's section 6.5 - a run that takes tens of seconds with no visible sign of life reads as a hang - and the announcement still arrives by polling, so the "no push required" property holds. **The cost is real**: containment on that channel now depends on what discovery chooses to emit, rather than on discovery having no channel. Not a blocking finding at demo scope; not something to carry into a product either.

## 4. Open findings

Listed rather than closed. Closing them means reopening approved stages.

### F-1. No tests in `packages/backend` - **the NFR-3.1 gap**

Not thin coverage. None. Four properties were scoped in `be/functional-design/business-rules.md` section 6 and all four are unimplemented: threshold arithmetic, skill round-trip, in-flight guard, flush prefix acceptance. **PBT-02 is unmet as a result.**

The threshold logic in `discovery/trigger.ts` is the one piece of real business logic in the scaffold, with three edge cases that were argued about during design - ignore re-crossing mid-run, reset after an empty run, allow the fixture to fire on first boot. All three are currently verified by reading.

The argument for why this matters rather than being bookkeeping: FE's property test **found a real bug**. `normalizeInput` was not idempotent, because slicing at the input cap can land on a space and a second pass then removes it. No example-based test had caught it. That is the case the partial PBT scope exists for, and BE has the same class of pure logic and none of the coverage.

### F-2. CI covers the frontend only

`.github/workflows/ci.yml` names `@prompthon/frontend` explicitly, because it was written by the FE stream when the other packages did not yet exist. They exist now and the workflow was never extended. `npm run check`, the root `vitest run`, and `npm run test --workspace infra` do not run in CI.

### F-3. FR-2.5 cosmetic evolution is partly held

The CSS level layer was removed from the character stage when real art landed - a ring around an illustration reads as decoration rather than the character advancing - and the replacement was never built. Cosmetic evolution is met on the roster tile ring only. **Second on the agreed drop order**, left open deliberately. FE-R-10 carries it as partly held.

### F-4. Voice input is not wired - **US-4.1 dropped**

Transcribe was deferred in BE's plan until INFRA granted access, and never came back. **First on the agreed drop order.** The IAM permission exists on the deployed role; nothing calls it.

### F-5. Smaller items, recorded rather than fixed

- `artRef` is carried through the types but nothing resolves it. `massagechair` paths are hardcoded, which is fine at one art set and wrong at two.
- Sprite frames have no preloading, so a cold first playthrough can stutter. More worth doing since the re-export took the set from 2.1 MB to 3.8 MB.
- Skill removal is a **hard delete**, not the `status: retired` transition BE-R-12 specified.
- `updateSkillContent` touches `content` only, so `title` and `summary` can go stale after a chat-driven revision.
- BE-R-15's duplicate check is a model call and has been observed letting restatements through.

## 5. Extension compliance

| Extension | Enabled | This stage |
|---|---|---|
| Security Baseline | **No** | Not loaded, not blocking. Six lite guardrails carried as ordinary NFRs and checked as such |
| Resiliency Baseline | **No** | Not loaded, not blocking. Four lite items carried as ordinary NFRs |
| Property-Based Testing | **Partial** | Loaded and enforced for pure functions and serialization round-trips. **PBT-01, 03, 07, 09 compliant. PBT-02 unmet for BE - see F-1. PBT-08 compliant in letter (PBT runs in CI) and weak in practice - see F-2. PBT-05, 06 N/A** |

Two things worth stating plainly rather than reporting green:

- **PBT-01 was a real gap that got closed.** A Testable Properties section was missing from FE's functional design and was appended to `business-rules.md`. Round-trip properties are recorded **N/A for FE with a stated reason** - it decodes and never encodes.
- **CI was added rather than reported as a blocking PBT-08 finding.** No pipeline existed. A 15-line workflow cost less than the finding, and the honest note is that it still only covers one workspace.

## 6. Security posture, as built

No auth. One hardcoded demo user. The deployed security group has **zero inbound rules** and management is via SSM Session Manager - no key pair, no SSH port, IMDSv2 required. The instance role holds four actions: one exact SSM parameter, two Bedrock invoke actions, one Transcribe action.

**If this is ever exposed publicly, NFR-5.2's passcode gate comes first.** Opening `PORT` in the security group without it is the mistake available here.

The pre-existing `bedrock-apikey` stack is left untouched and unused. Its plaintext token is a redundant auth path - profile credentials already work - and it cannot be deleted because `iam:CreateUser` is not granted. **Never copy that token into a document or a commit.** The copy would be the actual NFR-1.1 violation, not the stack.

The Friendli token was pasted into a chat transcript during setup and **should be rotated in the Friendli console before the demo**. It currently lives only in `.env`, which is gitignored and untracked, verified.

## 7. The account-deletion constraint

**Satisfied.** `cdk bootstrap` and `cdk deploy` both ran to completion against the live account, so `infra/` is a verified reusable asset rather than an unapplied draft.

What IaC cannot capture is written into `infra/README.md`, which is the part that matters for reuse:

1. **Bedrock model access is not IaC-manageable.** No entitlement API exists in any tool. It is a console action. A future account will apply the IaC perfectly, fail to run the app, and see nothing about it in the IaC logs.
2. `FRIENDLI_API_KEY` is outside AWS entirely.
3. The region lock and the `iam:PassRole` whitelist are account-attached policies, not our code, and may differ in the next account.

`cdk bootstrap` must be re-run per account and region. The `CDKToolkit` stack dies with the account.

## 8. Story status

| Story | Status |
|---|---|
| US-1.1 control by speaking | Delivered by text. Voice not wired |
| US-2.1 progression | Delivered. Level derived by FE from the skill list. Cosmetic evolution partly held, F-3 |
| US-3.1 discover unasked | **Delivered.** The deep pillar, running on real EXAONE |
| US-3.2 announce what and why | Delivered. Reasoning lives in the skill document; FE polls to notice it |
| US-3.3 use a discovered skill | Delivered |
| US-3.4 correct a skill | Delivered through the chat turn, identity preserved |
| US-4.1 voice | **Dropped.** F-4 |
| US-4.2 language | Delivered. Korean default, English toggle, honoured from the toggle rather than inferred |
| US-5.1 demo path | **Delivered.** IT-7 passes |

## 9. Next

Construction is closed. Operations is a framework placeholder with no content and nothing in this project's scope to execute against - the deployment target dies with the AWS account. Closed as out of scope 2026-08-21T01:45:00Z.

The scaffolding phase did what it was for: the pipeline runs end to end, so the per-product phase should be data and tools rather than architecture. What it deliberately did not do is make any of it product-authentic - real capability vocabularies, real attribute keys, authentic usage rhythms, the device time model, per-product tools, and a fixture spanning the 14-day and 60-day skill tiers are all still ahead.
