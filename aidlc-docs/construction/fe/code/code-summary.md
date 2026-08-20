# FE Code Generation Summary

**Stage**: CONSTRUCTION - Code Generation, Part 2
**Unit**: FE
**Generated**: 2026-08-20T09:15:00Z
**Revised**: 2026-08-20T21:45:00Z, after a UI iteration pass and real character art
**Branch**: `aidlc/construction-fe`
**Plan**: `aidlc-docs/construction/plans/fe-code-generation-plan.md`, 23 steps, all complete

## What the revision covers

The first version of this summary described the code as generated. The screen was
then iterated on directly - the character got real art, the stat header split, the
speech area stopped being a chat column - and this document had drifted far enough
to be misleading, naming a `StatHeader.tsx` that no longer exists and omitting
three components that do.

Everything below is re-checked against the files on disk. The functional design
artifacts were corrected in the same pass; `frontend-components.md` and
`business-logic-model.md` carry the reasoning, and this file carries the inventory.

## Verification

Re-run for the revision, not carried over.

| Check | Result |
|---|---|
| `tsc --noEmit` | Clean, strict mode with `noUnusedLocals` and `noUnusedParameters` |
| `vitest run` | **26 passed** in 2 files - 8 property-based, 18 example-based |
| `vite build` | Succeeds. 29 modules. **175.28 kB JS / 56.19 kB gzipped**, **21.80 kB CSS / 5.20 kB gzipped**, 1.57 kB HTML |
| `npm audit` | **0 vulnerabilities** |
| Dev server | Starts, serves, every module transforms, the `shared` workspace resolves |

CSS roughly doubled over the first pass (805 to 1903 lines) and the gzipped
stylesheet grew by 2.5 kB. That is the cost of the layout rework and the sprite
stage, and it is paid in a file that gzips well.

Not counted in the bundle: **3.8 MB of character frames** under `public/`, served
as static files rather than bundled. That is the real weight added, and it is
worth stating plainly rather than hiding behind a JS figure that has not moved at
all. 2.1 MB of it became 3.8 MB when the frames were re-exported with a real alpha
channel - see the sprite transparency note below.

Tests are executed here as verification. Build and Test is where they become part
of the joint pipeline.

## Files created

**Shared surfaces** - created by FE because FE started first. All minimal, so a
merge conflict is a few lines. BE and INFRA should change what is wrong.

| Path | Lines |
|---|---|
| `package.json` | 13 |
| `.gitignore` | modified, added `node_modules/`, `dist/`, `*.tsbuildinfo`, `.DS_Store` |
| `.github/workflows/ci.yml` | 41 |
| `packages/shared/package.json` | 8 |
| `packages/shared/src/types.ts` | 139 |

**Frontend**

| Path | Lines | What |
|---|---|---|
| `packages/frontend/package.json` | 28 | Three runtime deps, eight dev |
| `packages/frontend/tsconfig.json` | 22 | |
| `packages/frontend/vite.config.ts` | 34 | Vite plus Vitest, shared alias, `/api` proxy |
| `packages/frontend/index.html` | 37 | |
| `packages/frontend/README.md` | 103 | How to run, mock controls, notes for BE |
| `src/main.tsx` | 15 | |
| `src/App.tsx` | 297 | All state, all network calls, the SSE connections opened once, plus `ConnectionBanner` |
| `src/state.ts` | 446 | Reducer, actions, selectors |
| `src/api.ts` | 372 | Client interface, HTTP implementation against BE's real contract, adapters for BE's wire shapes, per-character SSE, flag selection |
| `src/mock.ts` | 391 | Canned backend with a scripted SSE stream |
| `src/pure.ts` | 118 | Seven pure functions and the input caps |
| `src/strings.ts` | 186 | `ko`/`en` dictionaries, attribute labels |
| `src/components/CharacterView.tsx` | 268 | The character screen. HUD with the progression pill, stage, swipe, sheets |
| `src/components/CharacterStage.tsx` | 218 | Sprite playback, level-up and discovery effects, placeholder fallback |
| `src/components/SkillCompendium.tsx` | 181 | Sheet, cards, invoke and talk |
| `src/components/InputBar.tsx` | 173 | Text, mic, validation, feedback context |
| `src/components/SpeechArea.tsx` | 170 | Stage caption, plus `ConversationSheet` and `SpeechBubble` |
| `src/components/RosterView.tsx` | 124 | Roster, tiles, badges, language toggle |
| `src/components/SpotlightCard.tsx` | 106 | Latest-discovery toast, gated on a bare discovery reaction |
| `src/components/DeviceStatStrip.tsx` | 79 | Device state as one panel, generic renderer |
| `src/components/CharacterSwitcher.tsx` | 67 | Dots for the other characters |
| `src/styles.css` | 1903 | Mobile-first, per-product properties, keyframes, sprite stage |
| `tests/pure.test.ts` | 426 | Example-based, clamp check first |
| `tests/pure.pbt.test.ts` | 109 | Property-based |
| `tests/generators.ts` | 85 | Domain generators |
| `tests/setup.ts` | 22 | PBT seed configuration and logging |

**Assets** - real character art, not placeholders:

| Path | Files |
|---|---|
| `public/characters/massagechair/levelup/frame-{0..55}.webp` | 56 |
| `public/characters/massagechair/surprise/frame-{0..64}.webp` | 65 |

`pral` and `shoecase` have no art directory and render the CSS placeholder.

### How this differs from the first pass

Components live in **9 files**, not 7. The first pass planned `StatHeader.tsx`
holding progression and device state as two separate props; it was split instead,
which is the more interesting outcome:

| Then | Now |
|---|---|
| `StatHeader.tsx` | **Gone.** Progression became a pill inside `CharacterView`'s HUD; device state became `DeviceStatStrip.tsx` |
| — | `CharacterSwitcher.tsx`, so switching characters no longer means returning to the roster |
| — | `SpotlightCard.tsx`, so a discovery leaves a trace the next line of speech cannot push away |
| `ConversationLog` planned as its own component | Never built. It was the same list with the same props as `ConversationSheet`, which absorbed it |

**The split made FE-R-2 stronger, which is why it is worth recording rather than
just noting.** One component holding both data classes as separate props relies
on nobody merging them later. Two components that cannot reach each other's data
removes the option: `DeviceStatStrip` has no prop that could carry a level, and
`CharacterStage` takes no progression at all - only booleans saying whether an
effect is playing.

Four behavioural changes came with it:

1. **The flex budget inverted.** The speech area had `flex: 1` with the character
   fixed at 176px, which made the screen a chat client with an avatar on top - the
   opposite of what Q5 D decided. The stage grows now and the utterance is a
   caption beneath it. This is the change that makes an announcement read as the
   character speaking.
2. **A discovery reaction exists**, driven by new `discovery` state per character
   alongside `levelUp`, with a `discovery/done` action. Recorded as FE-R-10b.
3. **The spotlight waits for a bare discovery and not for a level-up.** The one
   place anything is sequenced, and cheap because the effect reports its own
   completion rather than being raced against a timer. The condition is
   `discovery && !levelUp`: a small surprise reaction is worth not covering, a
   level-up is loud enough to share the frame, and making the toast wait for it
   splits one moment into two.
4. **Characters switch without leaving the screen**, by dot or by swipe, with the
   wrap-around in the pure `neighbourId` so it is a unit test rather than something
   found by swiping past the last character on stage.

### Sprite transparency, fixed in the asset rather than in CSS

Worth recording because the first fix was wrong in an instructive way.

The frames were exported near-white (254,254,254) instead of transparent, so each
frame's own canvas occluded the aura tint and the floor shadow behind it and left a
visible rectangle on the stage. The first fix was CSS: two intersecting
linear-gradient edge fades on `.stage-sprite`, fading the outer ~3% on each axis
independently. It could not be made safe. Several `levelup` frames put real content
- the top edge of the chair - flush against the frame boundary with no margin, so
any fade wide enough to hide the seam clipped the character on exactly those
frames.

**The CSS was being asked to infer where the character ended from position alone,
and the asset already knew.** All 121 frames were re-exported with real alpha,
flood-filled inward from the four borders so only background actually connected to
an edge became transparent and the fill stopped at the character's outline. The
mask and its `-webkit-` pair are gone; `.stage-sprite` is a plain `object-fit:
contain`.

Cost is 2.1 MB to 3.8 MB. That buys a correct silhouette on every frame instead of
an approximation that failed on some, and it makes frame preloading more worth
doing than it was.

## The one check that matters most

`tests/pure.test.ts`, "renders the clamped value, not the number the conversation
was about".

A response whose `deviceState` says 25 minutes and whose `text` mentions both 30
and 25 goes through the reducer. The test asserts the stats carry 25, and that no
attribute anywhere carries 30. A second test applies a response with prose
claiming 40 and no `deviceState`, and asserts nothing changed.

That is FR-5.5 as an executable statement, and it is the five-second proof the
demo puts in front of judges.

**It is a unit test on a pure reducer, with no DOM.** The rule lives at the state
layer, so testing it there needed no `jsdom` and no testing-library - two
dependencies the unit does not have as a result.

## How the invariants are enforced

Structurally, not by discipline. The unsafe path is absent from the type surface
rather than discouraged.

| Rule | Enforcement |
|---|---|
| FE-R-1, stats never from text | `ChatMessage` has one textual field and no state fields. `DeviceStats` is only ever constructed from a response's `deviceState`. No function anywhere takes a string and returns stats |
| FE-R-2, no merging | Progression renders from `character` in `CharacterView`'s HUD. `DeviceStatStrip` takes `deviceStats` and has no prop that could hold a level. `CharacterStage` takes no progression at all. No component can reach both |
| FE-R-3, no prediction | `pending` is `Record<string, boolean>`. There is no shape that could carry a predicted value. The marker renders on the stats block, not per attribute |
| FE-R-7, no control panel | `DeviceStatStrip` renders a `<section>` wrapping a `<dl>` and nothing interactive |
| FE-R-24, `lang` everywhere | Attached in `api.ts`, read through a ref. No call site passes it, so no call site can forget |
| FE-R-27, SSE not owned by a screen | Three connections, one per character, since BE's route is per-product. All opened in `App`'s single mount effect keyed on the client instance, and `connectEvents` returns one disconnect for all of them. No character screen can open or close a connection, which is the part of the rule that carries the badge |

## Ponytail review

Two review-fix cycles ran before this summary, per the dispatcher. The
`ponytail-reviewer` sub-agent is **not registered in this environment**, so its
definition and `review.md` were read and the review applied directly. Recorded
because it is a deviation from the configured mechanism, not because the review
was skipped.

**Cycle 1, seven findings, all applied:**

| Finding | Action |
|---|---|
| `api.ts` `delete:` `ApiError` and its `code` field, read by nobody | Removed the class and the JSON error-body parsing. FE picks wording by which call failed, not by code |
| `api.ts` `native:` hand-rolled exponential backoff over `EventSource` | Removed. EventSource reconnects on its own and honours the server's `retry:`. A fixed retry remains for the one case the platform does not cover - `readyState === CLOSED`, which is what a dev-server proxy failure produces |
| `mock.ts` `native:` `clone()` as a JSON round-trip | `structuredClone` |
| `RosterView.tsx` `delete:` `lang` prop declared and never used | Removed from the props and the call site |
| `SpeechArea.tsx` `shrink:` `length === 0 ? null : map()` | Mapping an empty array already yields nothing |
| `strings.ts` `delete:` `StringKey` exported, imported nowhere | Removed |
| `vite.config.ts` `delete:` `port: 5173`, which is the default | Removed |

**Cycle 2, three findings, two applied:**

| Finding | Action |
|---|---|
| `InputBar.tsx` `shrink:` `maxLength={INPUT_MAX_LENGTH * 2}` | Collapsing whitespace only ever shortens, so the doubling bought nothing |
| `mock.ts` `shrink:` two module-level `let`s used only inside `__mock` | Call `handlers` directly |
| `types.ts` `delete:` `SendMessageRequest` unused by FE | **Not applied.** Typed `postJson` against it instead, so the request body is checked against the contract BE reads rather than only described in it |

Net effect: roughly 45 lines removed, one dependency-free platform feature
adopted in place of hand-rolled logic.

## PBT compliance

Partial enforcement: PBT-02, 03, 07, 08, 09 are blocking.

| Rule | Status | Note |
|---|---|---|
| PBT-01 property identification | **Compliant** | Testable Properties section added to `business-rules.md` during planning, when the gap was found |
| PBT-02 round-trip | **N/A** | FE decodes responses and never encodes domain objects, so no inverse pair exists. Recorded with the reason rather than left unexplained |
| PBT-03 invariant | **Compliant** | 6 invariant properties over 4 of the 7 pure functions: `normalizeInput` idempotence, cap, no edge whitespace; `progressRatio` range; `resolveLabel` non-empty; dictionary key parity. The other three - `isSendable`, `inputLength`, `neighbourId` - are covered example-based, the first two being thin wrappers and the third having two interesting cases rather than a population |
| PBT-04 idempotency | Advisory | Covered anyway - `normalizeInput` idempotence is tested |
| PBT-05 oracle | **N/A** | No reference implementation exists to compare against |
| PBT-06 stateful | **N/A** | The reducer is pure. Its transitions are covered example-based |
| PBT-07 generator quality | **Compliant** | `tests/generators.ts` holds domain generators - message-like text with realistic whitespace, exp pairs constrained to real ranges plus boundaries, attribute keys in the shapes BE actually produces. No bare primitive generator stands in for a domain-typed parameter |
| PBT-08 shrinking and seed | **Compliant** | Default shrinking. Seed logged every run, replayable with `PBT_SEED`. Runs in CI. Required setting `disableConsoleIntercept` - Vitest 4 attaches console output to a task, which swallowed the seed line from the setup file |
| PBT-09 framework | **Compliant** | fast-check 3.23.1, pinned exact in `devDependencies` |
| PBT-10 complementary | **Compliant** | The critical path has an explicit example-based test. PBT is not the sole coverage for anything |

**No blocking PBT findings.**

## Security notes

| Item | State |
|---|---|
| Credentials in the bundle | None. Audio goes to BE, which holds the Transcribe credential (NFR-1.2) |
| Sensitive data endpoints | None requested. A skill's `reason` is agent-authored prose, never raw provenance (FR-5.11) |
| Input validation | Client-side is UX. BE owns the trust boundary and validates independently (NFR-1.3) |
| Prompt-injection guard | Deliberately absent from FE. NFR-1.4 is a trust-boundary control and a browser is not a trust boundary |
| Dependency advisories | 0. Required upgrading vite 5 to 8 and vitest 2 to 4 - six advisories on the 5.x line all traced to `esbuild <=0.24.2`, including a critical Vitest RCE. All dev-only, all now cleared |
| Dependency versions | All pinned exact, with one intended exception: `@prompthon/shared` is `"*"` because it is a workspace package resolved from the repo, not from the registry |

## Dependencies as they now stand

**Runtime, three**: `react` 18.3.1, `react-dom` 18.3.1, `@prompthon/shared` `*`.

**Dev, eight**: `vite` 8.2.2, `@vitejs/plugin-react` 6.1.0, `typescript` 5.6.3,
`vitest` 4.1.11, `fast-check` 3.23.1, `@types/node` 22.20.1, `@types/react`
18.3.12, `@types/react-dom` 18.3.1.

The first pass said "two runtime, seven dev" and omitted the workspace dependency
and the two React type packages. Corrected rather than left as a number nobody
would re-count.

## What is deliberately absent

Router, state library, UI kit, `i18next`, `jsdom`, testing-library, React context,
WebSocket audio path, locked skill slots, FE-side retry, FE-side injection guard,
Dockerfile, deploy script.

Each is recorded with a reason in the plan's section 8, so the absences read as
decisions rather than omissions. `jsdom` and testing-library stayed out because
the FR-5.5 check lives on a pure reducer; context stayed out because the tree is
two levels deep and `CharacterView` was the only consumer.

**Two items left this list**, and pretending otherwise would be the kind of stale
claim that makes a summary worth less than no summary:

- **Character artwork.** The massage chair now has 121 real frames across two
  sequences. Still not *per-level* artwork - the sequences are per-reaction, and
  no illustration changes with level - but "placeholder art everywhere" is no
  longer true, and `types.ts` still says "Placeholder art for now" against
  `artRef`, which is now only true of two products out of three.
- **A demo trigger for discovery.** `__mock.announce(n)` is exactly that, for the
  mock. It does not touch the real risk, which is making a *real* BE run fire on
  cue - see below.

## What the revision left open

| Item | State |
|---|---|
| FR-2.5, cosmetic evolution by level | **Partly met.** The level layer survives on the roster tile ring and was removed from the character stage when real art arrived, because a ring around an illustration reads as decoration rather than as the character advancing. Cosmetic evolution is second in the drop order, so this is a legitimate thing to leave open - recorded in FE-R-10 rather than reworded to sound met |
| `artRef` resolution | Carried and passed down, but nothing reads it. The massage chair's frame paths are hardcoded. Fine at one art set, wrong at two |
| Frame preloading | None. Frames are plain `<img src>` swaps, so a cold first playthrough can stutter. **3.8 MB total now that the frames carry alpha**, which makes this more worth doing than it was at 2.1 MB. A warm cache still hides it - trigger both effects once before presenting - and a preload pass is the fix if it looks bad on stage |

## Open items for BE

One ask settled, one standing, two gaps BE raised itself, and one risk. Updated
after BE's review on PR #8.

1. ~~**One SSE stream for all three characters**, each event carrying `characterId`.~~
   **SETTLED on PR #8, and the ask was wrong.** BE serves per-character routes
   (`GET /api/characters/:productId/events`), one dedicated agent behind each,
   which FR-5.4's 1:1:1 binding requires - no single agent could have served a
   combined stream. FE's stated reason, that a per-character stream "cannot
   deliver an announcement for a character the user is not viewing", confused
   the number of connections with their *ownership*: what breaks the badge is a
   connection opened by a character screen. `connectEvents` opens all three at
   app mount, so nothing about the badge changed. **No BE change needed.**
2. **`deviceState` always a separate field from reply text.** FE's FR-5.5
   enforcement is that no function turns a string into stats, which only holds if
   the response separates them.
3. **`/invoke` returns no `deviceState`, even when the skill calls a device tool.**
   Raised by BE on PR #8: `/invoke` uses a plain `agent.invoke()` rather than the
   streamed tool-call parsing `/chat` does, so the state change happens and is
   never reported. BE offered to fix it.

   **Worth taking, and it is the one of these two that is visible on stage.** FE
   cannot paper over it: FR-5.5 forbids reading stats out of the reply prose, so
   the panel has nothing to update from and holds its previous values until the
   next chat turn happens to mention the device. The demo beat is "invoke a
   discovered skill, watch the device respond" - a stat panel that sits still
   through it reads as the skill not working, which is the opposite of the point.

   FE needs no change if the fix lands: `invokeSkill` already returns an
   `ActionResponse` with a `deviceState` field, currently hardcoded `null` with a
   comment saying why. It becomes `body.deviceState ? toDeviceStats(...) : null`,
   the same one-line shape `sendMessage` already uses.

4. **No roster or progression endpoint** (`FR-2` is not implemented on BE).
   Raised by BE on PR #8, and it matches what `api.ts` already documents as gap 1.
   `listCharacters` returns `CHARACTER_DEFAULTS` from `./characters.ts` and
   `state.ts` applies a local cosmetic exp bump.

   **Not asking BE to build it.** Progression is cosmetic in the drop order, and a
   client-side simulation is honest as long as it is not presented as server
   state. The thing to avoid is a demo claim that levels persist - they do not
   survive a refresh. Recorded here rather than only in a source comment so it is
   a known gap at the team level.

5. **RISK - how discovery is made to fire on cue for the demo.** FR-5.10 triggers
   on accumulated data volume, so timing is outside the presenter's control. FE
   has no lever and no fallback if it stays silent. Against the mock the beat
   works; against real BE it is unverified. This needs settling early rather than
   at rehearsal.

Everything else in `backend-mock-contract.md` is a proposal and expected to change.
For BE's real shapes, `aidlc-docs/construction/be/code/api-examples.md` on PR #7 is
a capture of BE running, which is a better source than FE's proposal document.

## Note for the hour-5.5 checkpoint

The mock's SSE stream is in-process, so it cannot prove real SSE behaviour through
a dev-server proxy or a buffering intermediary - which is where SSE actually
breaks. An SSE route that emits one hardcoded event is enough to find out, and it
is worth doing **before** the checkpoint rather than at it.

The `api.ts` retry path was written against exactly this failure: a proxy that
kills the stream fatally puts `EventSource` into `CLOSED`, where the browser stops
retrying on its own.
