# BE Business Rules

**Stage**: CONSTRUCTION - Functional Design, unit BE
**Created**: 2026-08-20T09:38:00Z
**Status**: COMPLETE. Stage approved 2026-08-20T09:41:52Z
**Companion documents**: `domain-entities.md`, `business-logic-model.md`

Rules are numbered `BE-R-n` so Code Generation and Build and Test can cite them. Each one is written to be checkable.

---

## 1. Invariants

These two are requirement-level and cannot be traded away locally. They are stated as **structural** rules rather than runtime checks, because a runtime guard can be removed by the next person and an absent import cannot be removed by accident.

### BE-R-1 (FR-5.5) - the agent forwards state, it never authors it

Displayed device state must originate in a structured device response. The agent may cause state to change and may read it; it is not the source of truth for the display.

- Every response that can change state carries prose and `deviceState` as **separate fields**. Never state values embedded in prose.
- No function in BE accepts a model's text output and returns device state.
- **Observable test**: have the device clamp a requested 30 minutes to 25. The UI must show 25.
- **The failure mode this exists to prevent** is not the obvious one. It is wiring the display to the same in-process object the agent mutates, so the screen shows *intent* rather than *committed* state. Ownership separation never prevented this; it only made the shortcut inconvenient. BE owns both the stub and the agent, so the shortcut is available.
- **Build and Test verification**: suppress the flush and confirm the UI fails to update rather than optimistically showing the agent's intent.

### BE-R-2 (FR-5.11) - sensitive data never reaches the control path or the client

Accumulated usage history, derived routines and raw provenance are EXAONE-only.

- Nothing in the tool layer imports the usage-event module. **Verifiable by inspection**, which is the enforcement mechanism.
- Raw usage events are never logged and never returned by any client-facing route.
- FR-5.11 was **relocated** during this stage: with no provenance field on a skill, the rule becomes a generation-time constraint on what the Markdown document may contain. A skill may say *why* it was proposed; it may not reproduce the observations behind it.

---

## 2. Discovery trigger rules

### BE-R-3 - threshold is 3 new events since the last run, per product

Low on purpose: a few demo interactions must cross it.

### BE-R-4 - one run at a time per product

A product already running is skipped, not queued. Re-crossing the threshold mid-run is **ignored**, not remembered.

- The alternative - queueing - risks a run finishing straight into another run on stage.

### BE-R-5 - the counter resets after every run, including an empty one

An empty run is a normal outcome. Not resetting would make a product that never yields a pattern retrigger on every single event forever.

### BE-R-6 - the seeded fixture may fire on first boot

Explicitly allowed rather than tolerated. A cold start with a pre-seeded window crossing the threshold immediately is the intended demo behaviour.

### BE-R-7 - flush intake never waits for a discovery run

The flush request returns an accepted count immediately. Discovery is fire-and-forget.

### BE-R-8 - flush acceptance is prefix-based

The device buffers, flushes, and clears. If BE accepts only part of a batch, the device clears only the accepted prefix and retries the rest. Out-of-order partial acceptance is not supported and is not needed.

---

## 3. Skill rules

### BE-R-9 - a skill is created only by a discovery run

No authoring endpoint, no seeding endpoint, no admin path.

### BE-R-10 - identifiers are server-generated

Never a client-supplied identifier. Binding, from INFRA's runtime contract rather than local preference.

### BE-R-11 - revision preserves identity

A rewrite changes `content`. It does not change `id` and does not create a second record. This is what makes US-3.4 read as a correction.

### BE-R-12 - retirement is terminal and non-destructive

`status` moves to `retired`; `content` is left as it was. Nothing un-retires.

### BE-R-13 - a skill is usable the moment it exists

Level does not gate skills. There is no unlock check anywhere in BE.

### BE-R-14 - the list response omits `content`

`id`, `title`, `status`, `createdAt` only. This is what makes FE's polling cadence affordable; `getSkill` fetches the document when the user opens one.

### BE-R-15 - a discovered skill must not restate an existing one

Checked in the `validate` node against the current skill list for that product. A near-duplicate ends the run as if nothing was found.

- **Honest limit**: "restatement" is judged by a model, so this rule is soft. It reduces obvious duplicates; it does not guarantee novelty.

---

## 4. Model and generation rules

### BE-R-16 - one construction site per model

EXAONE is constructed in exactly one module, Bedrock in exactly one module. No second `new ChatOpenAI` anywhere.

- Cheap to state, and it is what makes the model swap a config change. The Bedrock model ID is an **environment variable**, never a literal, so reverting from Opus to Haiku is a config flip.

### BE-R-17 - thinking output is never presented as speech

The discovery model runs with thinking enabled. Reasoning traces belong in server logs, never in a reply, never in `Skill.content` as if it were the document.

### BE-R-18 - discovery temperature stays low

0.1-0.3. NFR-4.1's determinism as written is unachievable with an LLM; what is achievable is **shape** reproducibility, and low temperature plus replay of a stored run is the reserve position.

### BE-R-19 - the control agent is bounded by its tool set, not by validation

FR-3.4 was **relocated** for this reason: prose cannot be validated, so what the agent may actually do is bounded by which tools it is given. Adding a tool is the only way to widen its reach.

### BE-R-20 - replies are terse by instruction

`maxTokens` around 300 and a system-prompt instruction of 2-3 sentences. The chosen control model is competitive on wall clock precisely because it answers briefly, so the brevity is pinned by the prompt rather than assumed.

---

## 5. Failure rules

### BE-R-21 - a failed discovery run is logged and swallowed

It never surfaces to the user and never breaks an interaction. The counter still resets.

### BE-R-22 - a missing required environment variable fails loudly at boot

Not lazily at first use. A demo must not appear healthy and then fail on stage.

### BE-R-23 - one retry, then a fallback message

Model calls retry once. On second failure the user gets a plain fallback sentence in their language, not a stack trace and not silence.

### BE-R-24 - a device that does not answer is a request-level failure

Distinct from a connection-level failure. The interaction fails; the session does not.

---

## 6. Testable properties (NFR-3.1)

Property-based testing is enabled **partial** - pure functions and serialization round-trips only.

| Property | Target | Status |
|---|---|---|
| **PBT-A** threshold arithmetic | For any event count `n` and any threshold `t`, a run fires iff `n >= t`, and the counter is 0 after any run | In scope. This is the one piece of real business logic in the scaffold |
| **PBT-B** skill round-trip | For any valid skill record, serialize then deserialize yields an equal record | In scope |
| **PBT-C** in-flight guard | For any interleaving of trigger calls, at most one run per product is active | In scope, as an example-based test - concurrency is awkward to express as a property |
| **PBT-D** flush prefix acceptance | For any batch and any accepted count `k`, the device retains exactly the events after index `k` | In scope |

**Honest note**: a scaffold has few pure functions, so this set is small. Listing four properties and admitting the ceiling is more useful than inventing a fifth.

---

## 7. What is deferred, and to where

**Parked until the corresponding code exists**: Q5 rewrite semantics · Q6 how many skills per run · Q7 the placeholder capability vocabulary in its final form · prompt wording · discovery node internals.

**Deferred to the per-product phase**: authentic capability vocabularies, real attribute keys, product-specific rhythms, the device time model, per-product tools, and the tiered fixture that would let the 14-day and 60-day skill tiers mean anything.

---

## 8. Delta recorded against the built code

*Appended 2026-08-20T14:40:00Z, at BE Code Generation close-out. Kept as a delta rather than an edit, so the design-time decision and what the code needed stay separately legible.*

- **`status` did not survive.** BE-R-12 designed retirement as a status transition. The code hard-deletes instead, so BE-R-12 is **not implemented as written** - a removed skill is gone rather than retired. The rule is left standing because the reasoning still holds for a product; it is recorded here as a scaffold-level regression, not as satisfied.
- **`title` and `summary` became bilingual objects** rather than single strings, once the Korean-default / English-toggle requirement met a skill card that shows both. BE-R-14's list shape holds - still no `content` in the list response.
- **A `kind` field was added** (`buff` for condition-activated, `action` for run-on-command). This is closer to a structured trigger than `domain-entities.md` section 5 said BE would model, and the honest description is that it classifies the prose rather than making it executable. Nothing fires a `buff` automatically.
- **BE-R-15's duplicate check is weaker in code than on paper.** It compares against the current list in the `validate` node as designed, but the near-duplicate judgement is a model call, and it has been observed passing restatements. Left as-is at demo scope.
- **A manual discovery escape hatch exists** (`forceRunDiscovery`). It shares BE-R-4's in-flight guard and BE-R-5's counter reset, so it does not weaken either. It is the answer to the unresolved demo-timing risk in `business-logic-model.md` section 7, and it is a **dev-only** path.
- **BE-side property tests were not written.** Section 6's four properties are in scope and unimplemented; the only property-based tests in the repository are FE's. Recorded as an open NFR-3.1 gap in `construction/build-and-test/build-and-test-summary.md` rather than quietly dropped.
