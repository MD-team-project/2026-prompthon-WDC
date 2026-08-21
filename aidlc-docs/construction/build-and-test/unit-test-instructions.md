# Unit Test Instructions

**Stage**: CONSTRUCTION - Build and Test
**Created**: 2026-08-21T00:20:00Z
**Status**: COMPLETE. Stage approved 2026-08-21T01:40:00Z

Read section 4 first if you are here to judge coverage. Unit test coverage across the three units is **uneven by a wide margin**, and describing it as complete would be false.

---

## 1. Commands

```bash
npm run test                            # root vitest run
npm run test --workspace @prompthon/frontend
npm run test --workspace infra          # node --import tsx --test test/*.test.ts
```

Two runners, on purpose: FE and the root are on `vitest`, `infra` uses the built-in `node:test`. INFRA's tests are CDK template assertions and did not need a framework.

## 2. What actually exists

| Location | Files | Content |
|---|---|---|
| `packages/frontend/tests/pure.test.ts` | 1 | 18 example-based tests on pure functions and the reducer |
| `packages/frontend/tests/pure.pbt.test.ts` | 1 | 8 property-based tests, `fast-check` |
| `infra/test/runtime-stack.test.ts` | 1 | CDK template assertions on the runtime stack |
| `packages/backend` | **0** | **none** |
| `packages/device-stub` | **0** | **none** |
| `packages/shared` | **0** | none, and none needed - types only |

**26 tests pass in FE.** The infra suite passes.

## 3. Property-based testing (NFR-3.1)

Enabled **partial**: pure functions and serialization round-trips only. That scoping was a deliberate narrowing at Requirements Analysis, not an oversight.

### It earned its place in FE

`normalizeInput` **was not idempotent**. Slicing at the input cap can land on a space, and a second pass then removes it, so `f(f(x)) !== f(x)`. No example-based test had caught it, and the fix also moved the cap to code points so it means something for Korean text.

This is the case the PBT scope exists for, and it is the argument for section 4 being a real gap rather than a bookkeeping one.

### Replaying a failure

The seed is logged on every run (`packages/frontend/tests/setup.ts`). Re-run with `PBT_SEED` set to the seed from the log to reproduce exactly.

### Compliance against the PBT rules

| Rule | Status |
|---|---|
| PBT-01 Testable Properties section in the functional design | **Compliant, after a gap was found and closed.** It was missing from FE's design and was appended to `fe/functional-design/business-rules.md` |
| PBT-02 serialization round-trip properties | **N/A for FE, with a stated reason** - FE decodes and never encodes. **In scope for BE and not implemented** |
| PBT-03, 07, 08, 09 | Compliant for FE |
| PBT-05, PBT-06 | N/A |

## 4. The BE gap, stated plainly

**`packages/backend` has no tests.** Not thin coverage - none.

`be/functional-design/business-rules.md` section 6 scoped four properties, and all four are unimplemented:

| Property | Target | Status |
|---|---|---|
| PBT-A | threshold arithmetic: a run fires iff `n >= t`, counter is 0 after any run | **not written** |
| PBT-B | skill record round-trip | **not written** |
| PBT-C | in-flight guard: at most one run per product active | **not written** |
| PBT-D | flush prefix acceptance: device retains exactly the events after index `k` | **not written** |

**This is the NFR-3.1 gap for BE**, and PBT-02 is unmet as a result.

Why it is worth more than a line in a table: the threshold logic in `discovery/trigger.ts` is **the one piece of real business logic in the entire scaffold**, and it has three edge cases that were argued about during design - ignore re-crossing mid-run, reset after an empty run, allow the fixture to fire on first boot. All three are currently verified by reading the code.

PBT-A would have been a short test. FE's idempotence bug is the evidence for what that kind of test finds.

**Not closed here.** Build and Test is where this was surfaced, not where it was fixed; writing BE tests is code generation work and would reopen an approved stage. Carried as an open finding in `build-and-test-summary.md`.

## 5. What has no unit tests and does not need them

- **`device-stub`** returns canned responses. A test would assert the canned value equals the canned value.
- **Agents, discovery graph, model wiring.** These are model calls. Unit-testing them means mocking the model, at which point the test asserts the mock. They are covered by the integration path instead - see `integration-test-instructions.md`.
- **`packages/shared`** is types only.

Stated so the absence reads as a decision where it is one, and as a gap where it is one.

## 6. Adding a BE test, when someone does

```bash
# packages/backend/tests/trigger.test.ts
npm run test          # the root vitest run picks it up, no config change needed
```

`vitest` 3.0.5 and `fast-check` 3.23.2 are already devDependencies at the root. Nothing needs installing.
