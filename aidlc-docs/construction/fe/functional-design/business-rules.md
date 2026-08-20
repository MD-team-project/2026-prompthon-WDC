# FE Business Rules

**Stage**: CONSTRUCTION - Functional Design
**Unit**: FE
**Generated**: 2026-08-20T08:30:00Z

## What this document is

The rules that FE must hold regardless of how it is implemented. Each traces to a requirement or a story, or to a plan answer that created it. Rules with no trace are not here.

Rules are grouped by what breaking them costs. **Group A rules are invariants** - breaking one produces a demo that misrepresents the product. The rest are behavioural.

---

## Group A: invariants

### FE-R-1: Displayed stats originate in a structured device response

A stat value rendered on screen must come from the `deviceState` object of a BE response. It may never be parsed, inferred, or extracted from any message text.

**Traces**: FR-5.5, FR-1.4, US-1.1 scenarios 2 and 3.

**Enforcement is structural, not procedural.** `ChatMessage` carries one textual field and no state fields; no function accepts a string and produces stats. The unsafe path is absent from the type surface.

**Observable check**: with the device clamping a 30-minute request to 25, the screen shows 25. A UI fed from reply text shows 30, because 30 is what the conversation was about. This is one runnable check, and it is the check worth having.

### FE-R-2: Progression and device state never merge

`level` and `exp` come from the character store. `attributes` come from the device response. They render adjacently in one header but are held as two separate values and are never combined into a single list or object.

**Traces**: FR-5.5 provenance, Q5 sub-decision.

**Why a rule and not a preference**: merging them makes "read the value from whichever field is convenient" syntactically available. The execution plan names precisely this - a display wired to the same object the agent mutates, showing intent rather than committed state. Ownership separation never prevented it; keeping the two shapes apart does.

### FE-R-3: No predicted stat values, ever

While a request is in flight, FE shows a neutral in-flight marker on the stats block. It shows no value that has not been returned by a device response.

**Traces**: FR-5.5, Q13 B.

The marker attaches to the **block**, not to individual attributes. A generic renderer cannot know which attribute a request will affect, and guessing which one to mark would reintroduce prediction through the back door.

### FE-R-4: The in-flight marker always clears

The marker clears on one of three events: a response arrives, the request fails after NFR-2.1's timeout and single retry, or the request is abandoned. There is no fourth case.

**Traces**: NFR-2.1, Q13 B, Q12 C.

Without this rule a failed request leaves a marker spinning forever, which is a worse failure than no marker at all because it is indistinguishable from slowness.

### FE-R-5: Sensitive data is never requested

FE issues no request for accumulated usage history, derived routines, or raw skill provenance. A skill's `reason` is agent-authored prose and is the only form in which motivation reaches the client.

**Traces**: FR-5.11, NFR-1.2.

### FE-R-6: No credential and no model call in the browser

No model key, no AWS credential, no direct call to a model or to Transcribe. Audio goes to BE, which holds the credentials.

**Traces**: NFR-1.1, NFR-1.2.

### FE-R-7: No device control panel

No slider, toggle, stepper or form that sets device state. Device state is expressed only as character stats, and it changes only as a result of what the user says.

**Traces**: FR-1.4, FR-1.6, US-1.1 notes.

This is an invariant rather than a style rule because a control panel is the thing the product exists to remove. Putting one on screen concedes the argument the demo is making.

---

## Group B: presentation

### FE-R-8: Level-up plays in place on the character

A level change plays as an in-place effect on the character, plus a `LEVEL UP` status line on the stage. The level number and the exp bar change in the HUD pill at the same time. No full-screen overlay.

**Traces**: US-2.1 scenario 1, Q9 B.

**Two implementations, one rule.** A product with real art plays its `levelup/` frame sequence and ends when the frames run out. A product without art plays a CSS scale-and-glow pop on a fixed timer. The rule is "in place, on the character", and both satisfy it.

Duration is 2.2s frame-driven (56 frames at 40ms) or 1.5s timed, so an announcement arriving over SSE tends to land while the effect is still running. The overlap is deliberate and replaces sequencing logic - see FE-R-9.

### FE-R-9: Level-up and announcement are not synchronised

The level change and the announcement arrive from different sources and are rendered independently. Neither waits for the other.

**Traces**: Q9 B rationale.

Queueing one to hold for the other means an SSE timing slip inverts the sequence on stage. Independent rendering plus a generous effect duration gets the same impression without the failure mode.

### FE-R-10: Character appearance advances by CSS layer, not by artwork

Level is expressed through a layer over one illustration per product - frame, aura, colour shift, accessory. The illustration itself does not change per level.

**Traces**: FR-2.5, NFR-4.2, Q8.

Satisfies FR-2.5 at any art fidelity, which is why a placeholder can occupy the slot now and a real illustration can replace it with no code change. Also survives the drop order: cosmetic evolution is the second thing cut, and a CSS layer costs almost nothing to discard.

**Revised 2026-08-20, and this rule is now only partly held.** When real art arrived the level layer was removed from the character stage: a halo ring and a level-shaped border both read as decoration stuck onto an illustration rather than as the illustration advancing, so progression moved to the HUD pill instead and the stage now carries no level-derived treatment at all. The layer survives in one place only - the roster tile ring, which brightens at levels 2-3 and again at 4-5 (`.tile-art[data-level]`).

**So FR-2.5 is currently satisfied on the roster and not on the character screen.** Recorded as a known gap rather than reworded to sound met. The cheap close is to reinstate a level-derived treatment on the stage that is part of the composition rather than a ring around it - a floor or aura tint keyed on `data-level`, which the stage already has the elements for. It is cosmetic evolution, second in the drop order, so it is legitimately the thing to leave open.

### FE-R-10b: The character reacts when it discovers something

A genuinely new skill plays a one-shot reaction on the character, independent of the level-up effect and independent of the announcement text.

**Traces**: US-3.2, FR-2.5 in spirit, added 2026-08-20 with the real art.

Level-up outranks it when both fire at once, because levelling up is the rarer event. Both clear themselves - by frame count where there are frames, by timer where there are not.

**The spotlight toast waits for a bare discovery and deliberately does not wait for a level-up.** A discovery on its own is a small reaction the toast would cover, so the toast holds until it finishes: the character reacts, then the label explains it. A level-up is loud enough to share the frame, and "you levelled up **and** found something" reads better as one moment than as two staggered ones. So the wait is conditioned on `discovery && !levelUp`, not on either being true.

### FE-R-11: Art is referenced, never generated

`artRef` resolves through configuration to a static asset. Nothing on a visible path generates an image.

**Traces**: NFR-4.2.

**Implementation note, 2026-08-20**: the "never generated" half holds absolutely - every frame is a static `.webp` under `public/`. The "resolves through configuration" half does **not** yet: `artRef` reaches the DOM as a `data-art-ref` attribute and nothing reads it, while the massage chair's frame paths are hardcoded template literals in `CharacterStage`. That is fine for one product with art and becomes wrong at two, so it is recorded here rather than left for whoever adds the second set.

### FE-R-12: Skill tier is visible without reading

`basic` and `advanced` are distinguishable at a glance on the skill card.

**Traces**: US-3.1 scenario 2, FR-6.1.

The tiering is part of the argument being made - more usage yields deeper personalization - so it has to be legible, not merely present in the data.

### FE-R-13: A skill's reason is always visible on its card

The `reason` renders inline on the card, expanded by default, not behind a tap.

**Traces**: US-3.2 scenario 2, Q7 A.

That sentence is the evidence that converts autonomous discovery from an assertion into something witnessed. Behind a tap, half an audience never sees it.

### FE-R-14: The compendium shows no empty or locked slots

The skill list contains exactly the skills that exist. No placeholder slots, no locked entries, no count of what is yet to come. One non-enumerating line may sit at the end of the list.

**Traces**: FR-2.4, US-3.3 scenario 2, Q5 sub-decision.

N empty slots imply skills are drawn from a predetermined finite catalogue, which is the opposite of what the product claims. The worst question a judge can ask at this screen is "so it picks from a list?"

### FE-R-15: A retired skill leaves the active list

**Traces**: US-3.4 scenario 2.

### FE-R-16: A revised skill keeps its identity

After feedback, the same skill id remains, with `revisedAt` set. It is not removed and re-added.

**Traces**: US-3.4 scenario 1, FR-3.10.

The story is explicit that the skill "retains its identity and history rather than being replaced". A remove-and-add would render identically and would be wrong.

---

## Group C: failure and degradation

### FE-R-17: Failures are classified before they are presented

| Class | Examples | Presentation |
|---|---|---|
| **Request-level** | message send, skill invoke, transcription | Character speech bubble, plus a `system` entry in the log |
| **Connection-level** | SSE dropped | Persistent top banner with reconnection state |

**Traces**: NFR-2.2, Q12 C.

A failed model call is the character not managing to answer, and having it say so is the natural presentation. A dropped SSE connection is different in kind - the character becomes unable to speak unprompted at all, and the demo's central beat depends on that channel.

### FE-R-18: The connection banner is not dismissible

It appears while the connection is down and disappears when it recovers. The user cannot close it.

**Traces**: Q12 C rationale.

A dismissible banner gets dismissed absent-mindedly on stage, and then the cause of a missing announcement is gone.

### FE-R-19: Failure never blanks the screen or clears stats

Stats already displayed remain displayed through any failure.

**Traces**: NFR-2.2, US-1.1 scenario 4.

### FE-R-20: Voice degrades to text with nothing else lost

If the microphone is unavailable, permission is denied, or transcription fails, every other capability keeps working. Only the voice affordance disappears or reports itself.

**Traces**: FR-4.4, US-4.1 scenario 4.

Voice is first in the drop order, so it is built as a removable addition to the text path rather than as a second input path.

### FE-R-21: A transcript is confirmable before it is sent

A returned transcript is placed in the text input as an editable draft. It is not dispatched to the agent automatically.

**Traces**: US-4.1 scenario 2, Q10 C.

The story requires the transcript be visible; the reason given is that stage misrecognition should be legible rather than mysterious. Making it editable at the same cost makes it recoverable.

### FE-R-22: There is no audio output path

Replies are text. Nothing plays audio.

**Traces**: FR-4.3, US-4.1 scenario 3.

---

## Group D: input, language, and lifecycle

### FE-R-23: Input is trimmed, non-empty, and length-capped

Empty or whitespace-only input is not sent. Length is capped and the cap is visible as the user approaches it.

**Traces**: NFR-1.3.

Client-side validation here is user experience. The trust boundary is BE's and BE validates independently - FE's cap is not a security control and is not treated as one. FE attempts no prompt-injection guard for the same reason (NFR-1.4 is a trust-boundary control, and a browser is not a trust boundary).

### FE-R-24: `lang` travels on every BE request

The API client reads current `lang` and attaches it to all requests, not only those that render strings.

**Traces**: FR-8.2, FR-8.3, Q11.

Per-call-site passing means one site gets missed and that one interaction replies in the wrong language. Attaching centrally makes the omission impossible.

### FE-R-25: Language switching does not rewrite existing content

Interface strings change. Skill names, existing messages, and any already-generated text stay as they are.

**Traces**: US-4.2 scenario 3.

### FE-R-26: A refresh preserves progression and skills, and only scrollback is lost

On load, FE fetches characters and skills. The conversation starts empty.

**Traces**: NFR-2.3, US-2.1 scenario 4.

The story states this outright, so an attempt to preserve scrollback would be building against the specification rather than beyond it.

### FE-R-27: One SSE connection serves the whole app

Opened once on app mount, carrying events for all three characters, routed by the `characterId` on each event. Not opened per character screen.

**Traces**: US-3.2, Q14 B.

A per-screen connection cannot receive an event for a character the user is not viewing, which makes FE-R-28 impossible. It also gives the connection banner a single source of truth.

### FE-R-28: An announcement for an off-screen character raises a badge

The badge appears on that character in the roster and on the in-app back control. No toast, no forced navigation.

**Traces**: US-3.2 scenario 1, Q14 B.

Discovery fires on accumulated volume (FR-5.10), so its timing is outside the presenter's control. A toast can therefore cross the screen during a different beat, spending the strongest moment at the weakest time.

### FE-R-29: A badge clears only when that character's screen is opened

**Traces**: Q14 B.

### FE-R-30: Feedback carries the skill it refers to

Feedback started from a skill card sends `skillId` alongside the user's natural-language text.

**Traces**: US-3.4, Q6 D.

The user writes or says only natural language. The UI already knows which skill is on screen, so making BE re-derive it from prose is work that can fail for no benefit. Unreferenced feedback remains possible; the demo does not depend on it.

### FE-R-31: A skill is invoked by id, never by name

**Traces**: US-3.3, Q6 D.

Invoking by spoken name is the fragile path on stage. The button on the card carries the id.

---

## Rules deliberately absent

| Not a rule | Why |
|---|---|
| FE-side prompt-injection guard | NFR-1.4 is a trust-boundary control. The browser is not a trust boundary, so a guard here is theatre that also implies BE can relax |
| Client-side level threshold calculation | BE owns the curve. Two sources can disagree |
| Optimistic stat prediction | Explicitly rejected at Q13. Listed so its absence reads as a decision |
| Retry logic in FE | NFR-2.1's timeout and single retry live where the model call lives. FE retrying too would produce two retries |
| Demo trigger for discovery | FR-5.10 triggers on accumulated volume. Flagged as a risk to settle with BE rather than pre-solved in FE |

---

## Testable Properties (PBT-01)

**Added 2026-08-20T08:45:00Z** during Code Generation planning, when the PBT extension rules were loaded. Property-Based Testing is enabled at **Partial** scope, and NFR-3.1 confines it to **pure functions and serialization round-trips**.

FE has no serialization - it decodes responses and never encodes domain objects - so **round-trip properties are N/A for this unit** (PBT-02). What FE does have is a `pure.ts` module of seven pure functions - `normalizeInput`, `isSendable`, `inputLength`, `progressRatio`, `neighbourId`, `humanizeKey`, `resolveLabel` - four of which carry properties worth generating inputs for. The other three are covered example-based: `isSendable` and `inputLength` are thin wrappers over `normalizeInput`, and `neighbourId`'s interesting cases are its two wrap-around ends, which are examples rather than a population.

| Function | Category | Property | Rule |
|---|---|---|---|
| `normalizeInput` - trim, collapse, cap | **Idempotence** | `normalize(normalize(x)) === normalize(x)` | FE-R-23 |
| `normalizeInput` | **Invariant, range** | output length never exceeds the cap, for any input | FE-R-23 |
| `progressRatio(exp, expToNext)` | **Invariant, range** | result always within `[0, 1]`, including `expToNext === 0` | FE-R-8 |
| `resolveLabel(key, lang)` | **Invariant** | never returns an empty string for a non-empty key. An unknown key yields a readable fallback rather than nothing | FE-R-1 renderer |
| `strings` dictionary | **Invariant, structural** | the `ko` and `en` key sets are identical, so no language has a missing string | FE-R-25 |

### The one property that is not a pure-function property

**FE-R-1 is checked as an example-based test on the state reducer, not as a property.**

The invariant - a stat value never originates in message text - is not quantified over generated inputs. It is a claim about which field a specific transition reads. The check is: apply a response whose `deviceState` says 25 minutes and whose `text` mentions 30, then assert the resulting state carries 25.

This lands as an example-based test rather than a PBT because there is exactly one interesting case and generating variants of it adds nothing. PBT-10 is the relevant rule and it is satisfied in the right direction: the project's most business-critical path gets an explicit example-based test pinning expected behaviour.

Making the reducer the site of this check rather than a rendered component is deliberate. The rule lives at the state layer, so testing it there needs no DOM, no `jsdom`, and no testing-library - and it tests the rule where it actually holds.

### Components with no PBT properties

React components, the API client, and the SSE handler. They are I/O and rendering, and NFR-3.1 scopes PBT to pure functions. Marked "no PBT properties identified" rather than left unmentioned, per PBT-01's verification criteria.
