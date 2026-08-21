# FE Code Generation Plan

**Stage**: CONSTRUCTION - Code Generation, Part 1 (Planning)
**Unit**: FE
**Created**: 2026-08-20T08:45:00Z
**Status**: **APPROVED, Part 2 COMPLETE, stage APPROVED 2026-08-20T22:15:00Z.** All 23 steps `[x]`. Section 11 carries the post-summary delta; `fe/code/code-summary.md` is the artifact of record.
**Branch**: `aidlc/construction-fe`
**Workspace root**: `/Users/yujinchoi/Desktop/project/2026-prompthon-WDC`
**Project type**: Greenfield, monorepo with workspaces

**This plan is the single source of truth for FE Code Generation.** Part 2 executes these steps in order and nothing else.

---

## 1. Unit context

### Stories this unit implements

| Story | Role | What FE delivers |
|---|---|---|
| **US-2.1** See my character level up | Primary | Stat header, in-place level-up effect, CSS level layer, skill list on one surface, state surviving refresh |
| **US-4.1** Speak or type, read the reply | Primary | Audio capture, transcript as editable draft, text-only replies, degradation to text |
| **US-4.2** Use the app in my own language | Primary | Korean default, English toggle, `lang` on every request |
| **US-5.1** Follow the demo as a judge | Primary | Roster with no login, visible stat change, announcement plus level-up, judge-driven skill correction |
| **US-1.1** Control by saying what I want | Contributing | Stats as character, no control panel, clamp rendering, failure fallback |
| **US-3.2** Tell the owner what I made and why | Contributing | Announcement bubble, badge for off-screen, reason on the card |
| **US-3.3** Use a discovered skill | Contributing | Invoke by id from the card, no level gating |
| **US-3.4** Correct a skill | Contributing | Card-initiated feedback carrying `skillId`, in-place card update |

### Dependencies

**FE depends only on BE, and mocks past it.** Nothing in this plan waits on BE. The mock is built in step 5 and every flow runs against it.

### Interfaces

FE's proposal is `fe/functional-design/backend-mock-contract.md`. Two asks are structural and go to BE: one app-wide SSE stream, and `deviceState` always separate from reply text.

---

## 2. Code location and structure

Application code at the workspace root. Nothing under `aidlc-docs/` except markdown.

```
package.json                    root, workspaces  (SHARED SURFACE)
.github/workflows/ci.yml                          (SHARED SURFACE)
packages/
  shared/
    package.json                                  (SHARED SURFACE)
    src/types.ts                                  (SHARED SURFACE)
  frontend/
    package.json
    tsconfig.json
    vite.config.ts
    index.html
    src/
      main.tsx
      App.tsx
      state.ts            reducer, actions, session state
      api.ts              client interface, real implementation, flag selection
      mock.ts             mock implementation, scripted SSE
      strings.ts          i18n dictionary and device-attribute labels
      pure.ts             the four pure functions
      components/
        RosterView.tsx
        CharacterView.tsx
        StatHeader.tsx
        CharacterStage.tsx
        SpeechArea.tsx
        InputBar.tsx
        SkillCompendium.tsx
      styles.css
    tests/
      pure.test.ts        example-based, includes the FR-5.5 clamp check
      pure.pbt.test.ts    property-based
      setup.ts            PBT seed configuration and logging
```

### Files that are shared surfaces

Four files are not FE's alone. INFRA and BE need them too, and whoever starts first creates them. FE is starting first.

| File | Why FE creates it | Risk |
|---|---|---|
| root `package.json` | Nothing runs without workspaces configured | Conflict on merge. Kept minimal so a conflict is three lines |
| `packages/shared/*` | `unit-of-work.md` gives it exactly this purpose - what FE and BE agree lives in one place rather than being retyped | FE seeds it with the mock-contract shapes. **BE should change anything wrong** |
| `.github/workflows/ci.yml` | PBT-08 requires PBT in CI, and no CI exists | Runs FE tests only, since BE and INFRA packages do not exist yet. They extend it |

Handled by the convention already recorded in `aidlc-state.md`: shared files stay shared, one person resolves conflicts.

### Component-to-file mapping

The functional design names 16 components. This plan puts them in **7 files** by co-locating small children with their parent.

| File | Components |
|---|---|
| `App.tsx` | App, ConnectionBanner |
| `RosterView.tsx` | RosterView, CharacterTile, LangToggle |
| `CharacterView.tsx` | CharacterView |
| `StatHeader.tsx` | StatHeader, ProgressionBlock, DeviceStatsBlock |
| `CharacterStage.tsx` | CharacterStage, LevelUpEffect |
| `SpeechArea.tsx` | SpeechArea, SpeechBubble, ConversationLog |
| `InputBar.tsx` | InputBar |
| `SkillCompendium.tsx` | SkillCompendium, SkillCard |

The component tree is unchanged. Sixteen files for sixteen components, several of them under ten lines, is file count for its own sake. Recorded so the design and the code stay traceable.

---

## 3. Technical decisions taken here

| Decision | Value | Why |
|---|---|---|
| Build tool | Vite + `@vitejs/plugin-react` | Q1 A |
| Test runner | Vitest | Shares Vite's config and transform. A second toolchain would be a second config to keep in sync |
| PBT framework | **fast-check** | PBT-09's recommendation for TypeScript, integrates with Vitest, supports custom generators, shrinking and seeds |
| DOM testing | **None** | The one critical check is on the reducer, which is pure. No `jsdom`, no testing-library. See section 5 |
| State | `useReducer` plus context | Functional design decision. No state library |
| Styling | Plain CSS with custom properties | No UI kit |
| Runtime dependencies | `react`, `react-dom` only | Everything else is a dev dependency |

**Dependency count is four runtime-adjacent and five dev.** Pinned to exact versions, not ranges.

---

## 4. Automation-friendly attributes

Every interactive element gets a stable `data-testid` named `{component}-{element-role}`:

`roster-character-tile`, `roster-lang-toggle`, `character-back-button`, `character-compendium-toggle`, `input-text-field`, `input-send-button`, `input-mic-button`, `input-feedback-context-clear`, `skill-card`, `skill-invoke-button`, `skill-talk-button`, `compendium-close-button`, `speech-log-toggle`.

Values do not change between renders and do not encode ids.

---

## 5. Test approach

NFR-3.1 confines PBT to pure functions and serialization round-trips. FE has four pure functions and no serialization, so:

**Property-based** (`pure.pbt.test.ts`), five properties from the Testable Properties section of `business-rules.md`:
- `normalizeInput` idempotence
- `normalizeInput` never exceeds the cap
- `progressRatio` always within `[0, 1]`, including `expToNext === 0`
- `resolveLabel` never empty for a non-empty key
- `strings.ko` and `strings.en` have identical key sets

**Example-based** (`pure.test.ts`), with the FR-5.5 check first:
- **The clamp check**: apply a response whose `deviceState` says 25 and whose `text` mentions 30, assert state carries 25. This is FE-R-1, the single most important check in the unit
- `normalizeInput` rejects empty and whitespace-only
- `resolveLabel` falls back readably for an unknown key
- the reducer clears `pending` on failure, so FE-R-4 has a check
- badge increments for an off-screen announcement and not for an on-screen one

**Round-trip properties are N/A** (PBT-02). FE decodes and never encodes.

**Seed handling** (PBT-08): `tests/setup.ts` reads `PBT_SEED` from the environment, defaults to a time-derived value, configures fast-check globally, and logs the seed on every run. Shrinking is left at the framework default, which is enabled.

---

## 6. Steps

### Project structure

- [x] **Step 1** Root `package.json` with workspaces, `.gitignore` check, `packages/shared/{package.json,src/types.ts}` seeded from the mock contract
- [x] **Step 2** `packages/frontend/{package.json,tsconfig.json,vite.config.ts,index.html}` with exact pinned versions and the `VITE_USE_MOCK` flag wired

### Business logic

- [x] **Step 3** `src/pure.ts` - `normalizeInput`, `progressRatio`, `resolveLabel`, and the input cap constant. FE-R-23, FE-R-8
- [x] **Step 4** `src/strings.ts` - `ko` and `en` dictionaries plus device-attribute labels. FE-R-24, FE-R-25. US-4.2
- [x] **Step 5** `src/state.ts` - session state, actions, reducer. **This is where FE-R-1, FE-R-2, FE-R-3 and FE-R-4 are enforced**: the response action reads `text` and `deviceState` as separate fields, `pending` is a boolean, and every terminal action clears it. US-1.1, US-2.1

### API layer

- [x] **Step 6** `src/api.ts` - client interface, real implementation over `fetch` plus `EventSource`, `lang` attached centrally, flag-based selection. FE-R-24, FE-R-27
- [x] **Step 7** `src/mock.ts` - mock implementation with a scripted SSE stream emitting for **all three characters**, at least one clamped response, one failure, and one connection drop. Q2 A

### Business logic and API tests

- [x] **Step 8** `tests/setup.ts`, `tests/pure.test.ts`, `tests/pure.pbt.test.ts` per section 5. Tests are executed in Build and Test, not here

### Repository layer

- [x] **Step 9** **N/A, no work.** FE persists one `localStorage` key for `lang` and nothing else. Current device state is deliberately not cached (requirements 5.2), and progression and skills are BE's. Recorded as a step so the skip is visible rather than silent

### Frontend components

- [x] **Step 10** `src/main.tsx`, `src/App.tsx` - state wiring, single SSE connection, ConnectionBanner. FE-R-17, FE-R-18, FE-R-27
- [x] **Step 11** `src/components/RosterView.tsx` - three tiles, badges, language toggle, no login. FR-7.3, FE-R-28, US-5.1
- [x] **Step 12** `src/components/CharacterView.tsx` - the four-layer layout plus overlay slot. Q5 D
- [x] **Step 13** `src/components/StatHeader.tsx` - progression and device stats as two separate props, generic attribute renderer, block-level in-flight marker. FE-R-2, FE-R-3, FE-R-7, Q3 A
- [x] **Step 14** `src/components/CharacterStage.tsx` - placeholder art, CSS level layer, in-place level-up effect at ~1.5s. FE-R-8, FE-R-10, FE-R-11
- [x] **Step 15** `src/components/SpeechArea.tsx` - latest bubble, queued announcements, expandable log. US-3.2, FE-R-26
- [x] **Step 16** `src/components/InputBar.tsx` - text, mic, validation, feedback-context badge, transcript as editable draft. FE-R-20, FE-R-21, FE-R-23, US-4.1
- [x] **Step 17** `src/components/SkillCompendium.tsx` - overlay, cards with tier badge and always-visible reason, invoke by id, talk action, no empty slots. FE-R-12 to FE-R-16, FE-R-31, US-3.3, US-3.4
- [x] **Step 18** `src/styles.css` - mobile-first, per-product custom properties, level layer, effect keyframes. FR-7.1

### Database migrations

- [x] **Step 19** **N/A, no work.** FE owns no schema. Recorded so the skip is visible

### Documentation and CI

- [x] **Step 20** `.github/workflows/ci.yml` - install and run FE tests with a logged seed. PBT-08
- [x] **Step 21** `README.md` at `packages/frontend/` - how to run against the mock and against real BE
- [x] **Step 22** `aidlc-docs/construction/fe/code/code-summary.md` - what was built, story traceability, PBT compliance table, what BE must confirm

### Deployment artifacts

- [x] **Step 23** **Vite build config only**, already in step 2. NFR-5.1 makes deployment conditional and NFR-5.2 makes a passcode gate a BE concern if it happens. No Dockerfile, no deploy script - INFRA owns deployment and FE producing one would duplicate it

---

## 7. Story traceability

Marked [x] in Part 2 as each becomes functional.

- [x] US-1.1 stats as character, clamp renders committed value, no control panel, failure keeps stats
- [x] US-2.1 level, exp and skills on one surface, in-place level-up, survives refresh
- [x] US-3.2 announcement bubble, badge off-screen, reason inspectable
- [x] US-3.3 invoke by id, immediately available, partial failure reported
- [x] US-3.4 card-initiated feedback with `skillId`, in-place update, retirement
- [x] US-4.1 voice capture, editable transcript, text-only reply, degrades to text
- [x] US-4.2 Korean default, English toggle, existing content not rewritten
- [x] US-5.1 roster with no login, visible stat change, discovery beat, judge correction beat

**US-5.1 qualification**: FE delivers every beat it owns. The discovery beat still
depends on BE making a run fire on cue, which is the open risk in section 7 of
`backend-mock-contract.md`. Against the mock the beat works; against real BE it
is unverified and not FE's to verify alone.

## Deviations from the plan as written

Three, all recorded rather than silently absorbed.

| Plan said | What was built | Why |
|---|---|---|
| `resolveLabel` in `pure.ts` | `resolveLabel` and `humanizeKey` in `pure.ts`, taking the label table as an argument; `attributeLabel` in `strings.ts` calls it with the dictionary | Keeps `pure.ts` importing nothing, so it stays trivially testable. Same function, one argument different |
| Mock "emits at least one failure and one connection drop" | Both are **triggerable** - a keyword in the message text, and `__mock.drop()` in the console - rather than scheduled | Scheduling means a rehearsal or a live demo can be sabotaged by a timer nobody remembers setting. Triggering exercises both presentations on demand, which was the actual purpose |
| `vite@5.4.10`, `vitest@2.1.4` | `vite@8.2.2`, `vitest@4.1.11`, `@vitejs/plugin-react@6.1.0`, plus `@types/node@22.20.1` | `npm audit` reported 6 advisories on the 5.x line, all tracing to `esbuild <=0.24.2`, including a critical Vitest RCE. All dev-only, but the upgrade cleared them: **0 vulnerabilities**, tests and build green. `@types/node` was pulled in because vite 8 needs it for `node:url` in the config |

One more thing found by a test rather than by review: `disableConsoleIntercept`
had to be set in the Vitest config. Vitest 4 attaches console output to a task,
which swallowed the PBT seed line written from the setup file - and PBT-08
requires that seed to be visible on every run.

---

## 8. What this plan does not build

| Not built | Why |
|---|---|
| Router | Q4 A |
| State library | Section 3 |
| UI component kit | Section 3 |
| `i18next` | Q11 A |
| WebSocket audio path | Q10 C |
| `jsdom`, testing-library | Section 5. The critical check is on a pure reducer |
| Per-level artwork | Q8 |
| Locked or empty skill slots | FE-R-14 |
| FE-side retry | NFR-2.1 belongs where the model call is |
| FE-side injection guard | NFR-1.4 is a trust-boundary control |
| Dockerfile or deploy script | INFRA owns deployment |
| Demo trigger for discovery | Open item with BE, not FE's to invent |

---

## 9. Scope

**23 steps, two of them deliberate N/A records.** Roughly 20 files. Estimated 4-6 hours, which sits inside FE's 8-9 hour allocation and leaves room for the hour-5.5 integration checkpoint and for the voice path being dropped if it comes to that.

## 10. PBT compliance, expected at completion

| Rule | Expected | Note |
|---|---|---|
| PBT-01 | Compliant | Testable Properties section added to `business-rules.md` |
| PBT-02 round-trip | **N/A** | FE decodes, never encodes. No inverse pair exists |
| PBT-03 invariant | Compliant | Four invariant properties in `pure.pbt.test.ts` |
| PBT-07 generators | Compliant | Constrained generators for the input cap, exp ranges and the label key space. No bare `fc.string()` for a domain-typed parameter |
| PBT-08 shrinking and seed | Compliant | Framework default shrinking, seed logged every run, included in CI at step 20 |
| PBT-09 framework | Compliant | fast-check, pinned in `devDependencies` |
| PBT-04, 05, 06, 10 | Advisory in Partial mode | PBT-06 stateful is N/A - the reducer is pure and its transitions are covered example-based. PBT-10 is satisfied in substance: the critical path has an example-based test |
---

## 11. What changed after this plan finished

**Added 2026-08-20T21:45:00Z.** The plan above is left as it was executed - all 23
steps did run, and rewriting them to match today's files would destroy the record
of what was planned versus what the screen turned out to need. This section is the
delta instead.

The trigger was a UI iteration pass on the running app plus real character art
arriving for one product. Both are outside what a code generation plan can
anticipate, which is why the delta is recorded rather than treated as a plan error.

### File-level

| Plan step | What actually stands |
|---|---|
| Step 13, `src/components/StatHeader.tsx` | **Split and the file is gone.** Progression became a pill in `CharacterView`'s HUD; device state became `src/components/DeviceStatStrip.tsx` |
| Step 14, `CharacterStage.tsx` - placeholder art, CSS level layer | Placeholder art only for `pral` and `shoecase`. `massagechair` plays real frame sequences. **The CSS level layer was removed from the stage** |
| Step 12, `CharacterView.tsx` - "four-layer layout" | A column of fixed strips around one growing stage, plus two sheets. The stage is what grows, not the speech area |
| — | Three files the plan did not have: `DeviceStatStrip.tsx`, `CharacterSwitcher.tsx`, `SpotlightCard.tsx` |
| — | `ConversationLog` was never built. Same list and same props as `ConversationSheet`, which absorbed it |

Components ended up in **9 files, not 7**. The mapping table in section 3 is
superseded by the one in `fe/code/code-summary.md`.

### Claims in this plan that no longer hold

- **"Per-level artwork" as a deliberate absence** (section 8). Real artwork exists
  for one product - 121 frames across a level-up and a discovery sequence. The
  literal phrase survives, since nothing changes per *level*, but reading that row
  as "there is no character art" would now be wrong.
- **"Demo trigger for discovery" as a deliberate absence** (section 8). The mock
  has one, `__mock.announce(n)`. The real risk is unchanged: making a real BE run
  fire on cue is still open with BE.
- **"Four invariant properties"** (section 10). Six shipped, over four of the seven
  functions in `pure.ts`. The plan said `pure.ts` held four functions; it holds
  seven.
- **Dependencies.** Three runtime, not two - `@prompthon/shared` is a workspace
  dependency and is the one entry not pinned exact, deliberately. Eight dev, not
  five: `@types/react` and `@types/react-dom` were missing from the plan's list,
  and `@types/node` was added during Part 2 because vite 8 needs it.

### One requirement moved backwards, and it is recorded rather than absorbed

Removing the level layer from the stage means **FR-2.5, cosmetic evolution driven
by level, is currently met on the roster tile ring and not on the character
screen.** The reason it was removed is sound - a ring around an illustration reads
as decoration stuck onto the character rather than the character advancing - but
the replacement was never built, so this is a regression against a requirement and
not a neutral swap. FE-R-10 in `business-rules.md` carries it as partly held.

It stays open on purpose: cosmetic evolution is second in the drop order, so it is
the correct thing to be missing if something has to be. Cheapest close is a
`data-level` tint on the stage floor or aura, both of which already exist as
elements.
