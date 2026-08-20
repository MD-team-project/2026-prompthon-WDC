# Skill Discovery Pipeline - Review for Audit

**Status**: Implemented, live-tested against real Bedrock + Friendli credentials. Awaiting user confirmation before settling.
**Date**: 2026-08-20
**Scope**: `discovery/graph.ts`, `discovery/trigger.ts`, `data/skills.ts`, `tools/skills.ts`, `agents/index.ts` (skill-related portion), `routes/skills.ts`, shared types (`SkillRecord`, `SkillSummary`, `ControlEvent`).

---

## 1. What exists now

### Creation (automatic, unchanged)
`discovery/trigger.ts` fires `runDiscoveryGraph` when 3 new usage events accumulate for a product (fire-and-forget, in-flight dedup, counter resets after every run whether or not a skill was found). `discovery/graph.ts` is a 3-node `StateGraph` (`loadWindow` → `findPattern` → `save`) running on EXAONE:
- `loadWindow`: reads a 60-day event window.
- `findPattern`: asks EXAONE to find ONE genuine recurring pattern or say `NO_PATTERN_FOUND`. No fabrication - confirmed live, twice, on non-patterned data.
- `save`: writes at most one `SkillRecord` (title + Markdown `content`) if found.

Each node publishes a `discoveryProgress` SSE event (`started`/`analysing`/`found`/`noPattern`) on a persistent per-product channel (`GET /events`), plus a `skillDiscovered` event on save. Server logs mirror the same transitions, plus explicit `[exaone:...] invoke/response` lines.

### Read/update/delete (revised this session, per Q5)
No separate feedback endpoint. The **control agent** (Bedrock, via `tools/skills.ts`) owns the full lifecycle after creation, exposed as four tools:
- `listSkills` - titles + ids only (cheap).
- `getSkill` - full Markdown by id.
- `updateSkill` - agent composes the full revised Markdown itself from feedback + current content, tool just persists it. No round-trip to EXAONE.
- `deleteSkill` - hard delete. No status flag, no soft-delete - the row is gone.

`SkillRecord` no longer has a `status`/`SkillStatus` field; that concept was removed entirely rather than left unused.

---

## 2. Live verification (real Bedrock `us.anthropic.claude-opus-4-6-v1` + real Friendli/EXAONE)

| Test | Result |
|---|---|
| FR-5.5 clamp (request 30 min, device caps at 25) | UI-facing `deviceState` showed 25, prose text didn't override it |
| Multi-step tool calling in one chat turn (`listCapabilities` → `applyCommand` ×2) | Streamed and logged correctly, final `deviceState` matched last tool result |
| Discovery on non-patterned events | Correctly returned "no pattern", twice, with different random data |
| Discovery on a seeded 4-day recurring pattern (21:40 daily, 30 min) | Created a real skill, correct title, correct Markdown description |
| SSE `discoveryProgress`/`skillDiscovered` delivery | Arrived in real time on `/events`, matched server log order |
| Chat-driven revision ("change evening to morning") | `listSkills`→`getSkill`→`updateSkill` fired in order; persisted content changed 21:40→07:00 correctly |
| Chat-driven deletion | **Not separately live-tested this session** - tool is structurally identical to `updateSkill` (same call pattern, simpler body), flagging rather than asserting it's proven |

---

## 3. Decisions settled during construction (previously parked)

- **Q5** (how feedback revises a skill): via control-agent tools during ordinary chat, not a REST+EXAONE round-trip. Delete is hard, not soft (status concept dropped).
- **Q6** (skills per run): confirmed at 1, matching the original recommendation. Already how the code works.
- **Q7** (placeholder capability vocabulary): deferred again, per user instruction - current device-stub vocabulary (`power`/`start`/`stop`/`setMode`/`setDuration`, with a `standard`/`quick`/`deep` mode enum) stays as-is until real per-product work begins.

---

## 4. Gaps and risks flagged for your call, not silently decided

1. **No revision history.** `updateSkill` overwrites `content` in place. US-3.4's acceptance criteria says a corrected skill "retains its identity and history" - identity (`id`) survives, but there is no record of what the skill said before a revision. Acceptable for a 1.5-day scaffold, but worth an explicit yes/no rather than an assumption.
2. **Delete has no structural safeguard.** It's irreversible, gated only by the system prompt's instruction to "only do it when they clearly mean it" - i.e., purely a model-judgment call, nothing enforces confirmation.
3. **Fixed 60-day window, no tiering.** The original basic/advanced (14-day/60-day) tier idea was dropped along with `SkillTier` when the schema went minimal (Q2b). If tiering still matters later, it needs to be reintroduced deliberately, not assumed gone.
4. **Discovery only exists if flush exists.** It's entirely dependent on `/internal/usage/flush` being called; if that breaks silently, discovery never fires and nothing reports it as broken (the same "quiet failure" risk Application Design already flagged for the fixture).
5. **`StateGraph` over a plain function** - kept per your earlier call ("추후 확장할 것"), now more justified than before since each node's `publish()` call maps directly onto real SSE progress events.

---

## 5. Requesting your confirmation to settle

Nothing above blocks continuing - flagging for explicit sign-off before treating Skill Discovery as done rather than silently locking in defaults on items 1-4.
