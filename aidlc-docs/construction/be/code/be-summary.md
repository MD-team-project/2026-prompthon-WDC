# BE Code Generation Summary

**Stage**: CONSTRUCTION - Code Generation, unit BE
**Branch**: `construction/be`
**Status**: **COMPLETE and APPROVED 2026-08-20T14:45:00Z**
**Plan**: `construction/plans/be-code-generation-plan.md` - all 15 steps plus Step 0 executed. **Section 6 of that plan is the delta**, and it matters: six steps closed differently from how they were written.

Companion artifacts: `api-examples.md` (real request/response captures), `discovery-review.md`, `verification-results.md` (Step 0), `packages/backend/README.md`.

---

## 1. What was built

`packages/backend`, `packages/device-stub`, and BE's share of `packages/shared`. Twenty-nine source files in the backend.

| Area | State |
|---|---|
| Three control agents, 1:1:1 with the products | Built. Bedrock, streamed, one agent file per product |
| Skill Discovery | Built. `StateGraph` on EXAONE, five phases, writes a Markdown document |
| Skill persistence | Built. DynamoDB, single table, partition key `id` |
| REST plus SSE surface | Built. Per-product router mounted three times |
| `device-stub` | Built. Canned responses on :4000, buffer-and-flush loop, three fixture scenarios |
| Usage accumulation | Built, **in memory** - see section 3 |
| Transcribe / voice | **Not built.** Out of scope for this plan |
| Tests | **Not built.** See section 4 |

## 2. What made it work, and what nearly didn't

**Step 0 was the right call and it earned its cost twice.** The blocking check - tool calling on the *dedicated* Friendli endpoint - **passed**, which is what left S1 and S7 standing. The documentation available during Inception covered Friendli's serverless endpoints only, so this was a genuine unknown rather than a formality; failure would have meant rework, not adjustment.

It also **cancelled a planned task**. Thinking output arrives in separate fields with `content` already clean, so `stripThinking` had nothing to strip and was never written. Had the order been reversed, that sanitiser would have been written, tested and deleted.

**The one thing that actually broke was at a seam, not inside a unit.** `data/skills.ts` addresses items by `id` alone; INFRA had created the table with `pk`/`sk`. Every read would have failed with `ValidationException`. Caught at 2026-08-20T12:10:00Z and fixed by replacing the empty table. The rule that came out of it - **BE's data-access code is the contract** - is recorded in INFRA's runtime contract.

This is exactly the failure mode `execution-plan.md` named as the top risk when it raised the risk level to High. It predicted the class correctly.

## 3. What is stubbed, and what that costs

- **`device-stub` is a canned-response server, not a simulator.** No clock, no state machine, no lifecycle events. It serves generic product-neutral capabilities and usage events, which is all discovery needs to find a pattern.
- **Usage events live in memory.** The plan's "local substitute until INFRA's table exists" became the permanent answer. **The accumulation window does not survive a restart**, and DynamoDB therefore holds skills only. This is also why the generic `pk`/`sk` key schema was solving a problem this codebase does not have.
- **Past-days app context is a fixture** loaded at boot from `packages/backend/fixtures/*.jsonl`. Today's reading comes over HTTP from `device-stub` instead, so the agent has to ask for it and the user can see the same figures the character is reasoning from.
- **No auth.** One hardcoded demo user.

## 4. Open gaps, stated rather than implied

**No tests exist in this package.** `vitest` and `fast-check` are wired at the root, and no BE test file was written. The four properties scoped in `be/functional-design/business-rules.md` section 6 - threshold arithmetic, skill round-trip, in-flight guard, flush prefix acceptance - are all unimplemented. This is the **NFR-3.1 gap for BE**; the only property-based tests in the repository are FE's. Carried into `construction/build-and-test/build-and-test-summary.md` as an open finding.

Worth naming the cost: threshold arithmetic is the one piece of real business logic in this scaffold, and `PBT-A` would have taken minutes. FE's run is the argument - a property test there caught a real idempotence bug that example-based tests had missed.

**Skill removal is a hard delete**, not the `status: retired` transition `business-rules.md` BE-R-12 specified. A removed skill is gone. Recorded as a regression against the design, not as a satisfied rule.

**BE-R-15's duplicate check is weaker in code than on paper.** It runs in the `validate` node as designed, but the near-duplicate judgement is a model call and has been observed letting restatements through.

**SSE now carries discovery output**, reversing Step 8. Detail and the reasoning in the plan's section 6.5. The cost: FR-5.11 on the SSE path now depends on what discovery chooses to emit, rather than on discovery having no channel at all. Weaker enforcement than the design had.

**A dev-only discovery escape hatch exists** (`POST /internal/discovery/:productId/run`). It is the answer to the demo-timing risk the functional design flagged as unresolved, and it shares the threshold path's in-flight guard and counter reset so it does not weaken either rule.

## 5. Parked, to be decided against real code

Q5 how feedback rewrites a document (the code settled on in-place `content` update, leaving `title` and `summary` stale) · Q6 how many skills per run · Q7 the placeholder capability vocabulary in final form · prompt wording · discovery node internals.

**Deferred to the per-product phase**: authentic capability vocabularies, real attribute keys, product-specific rhythms, device time model, per-product tools, and a tiered fixture that would make the 14-day and 60-day skill tiers mean anything.

## 6. What BE hands to the other units

**To FE**: `api-examples.md`. Unedited captures from a running backend rather than described shapes - the routes, the SSE event sequence, and the exact envelopes. Two things in it are requirement-level and not negotiable: prose and `deviceState` are always separate fields (FR-5.5), and nothing on a client-facing route carries raw usage history (FR-5.11). Everything else is revisable by agreement.

**To INFRA**: the data-access code is the schema. Single table, partition key `id`, no sort key, no index. Keys are `randomUUID()`, never client-supplied. Table name travels as `DDB_TABLE_NAME` and must never be hardcoded.

**To both**: `engines.node` is `>=22`, because `@langchain/openai` requires it and that is the mandated EXAONE path. The root `workspaces` array includes `infra`.

## 7. Verified, not asserted

`npm run check` (`tsc -b` across shared, device-stub, backend) clean under strict mode · `npm run build` succeeds · Friendli dedicated-endpoint tool calling returns a real tool call · Bedrock `converse` succeeds from the deployed instance role holding only `InvokeModel` and `InvokeModelWithResponseStream` · DynamoDB put/get/scan against the live table after the key-schema correction · full discovery run end to end, skill written and announced · **BE unit tests: none exist.**
