# FE Functional Design Plan

**Stage**: CONSTRUCTION - Functional Design
**Unit**: FE
**Created**: 2026-08-20T08:00:00Z
**Branch**: `aidlc/construction-fe`
**Sources**: `unit-of-work.md`, `unit-of-work-story-map.md`, `unit-of-work-dependency.md`, `application-design.md`, `requirements.md`, `stories.md`, `personas.md`

---

## 1. Unit scope, as inherited

**FE owns**: `packages/frontend`. Mobile-first browser app. Character screen, chat, stats-as-character, progression presentation, skill list, audio capture, i18n.

**Primary on 4 stories**: US-2.1 (level-up), US-4.1 (speak or type), US-4.2 (language), US-5.1 (demo run-of-show).
**Contributing on 6**: US-1.1, US-3.2, US-3.3, US-3.4, plus the two above that BE leads.

**FE depends only on BE, and can mock past it.** The dependency document names the backend mock, *including a fake SSE stream*, as the single most consequential item in the whole plan. Without it FE idles.

### Constraints that bind FE specifically

| Constraint | Source | What it means for FE |
|---|---|---|
| Stats render from structured device responses, never from reply text | FR-5.5, US-1.1 | The stats component reads a structured field of the response. It must not parse, scrape, or infer anything from the prose. Observable test: device clamps 30 min to 25, screen shows 25 |
| No device control panel anywhere | FR-1.4, US-1.1 | The character *is* the device UI. No sliders, no toggles for device state |
| Sensitive data never crosses to the client | FR-5.11, NFR-1.2 | FE never requests raw usage history, derived routines, or raw provenance. Provenance arrives as agent-produced summary text only |
| Nothing secret in the browser bundle | NFR-1.1, NFR-1.2 | No model keys, no AWS credentials, no direct Transcribe or model calls from the browser |
| Text-only replies | FR-4.3 | No audio playback path at all |
| Korean default, English toggle, covers reply language too | FR-8.1, FR-8.2 | Toggle changes interface strings and is passed to BE so replies switch language |
| Level, exp, skill list on one surface | US-2.1 | No navigating elsewhere to see any of the three |
| Progress survives refresh, scrollback does not | NFR-2.3, US-2.1 | FE refetches progression and skills on load. Conversation is not persisted client-side |
| Nothing slow or non-deterministic on a visible path | NFR-4.2 | Character art is a pre-generated asset, referenced not generated |
| Graceful fallback, never blank the screen | NFR-2.2, US-1.1 | On model failure, stats already on screen stay put |
| Voice degrades to text with no other loss | FR-4.4, US-4.1 | Mic unavailable or permission denied leaves everything else working |

---

## 2. Plan steps

- [x] **S1** Analyze unit context - unit definition, story map, dependency, application design, requirements, stories
- [x] **S2** Write this plan with embedded questions
- [x] **S3** Collect answers from the user - all 14 answered, plus three sub-decisions at Q5
- [x] **S4** Detect contradictions and ambiguities in the answers - **no contradictions found**, three interactions needed a stated resolution, see section 3.1
- [x] **S5** Produce `functional-design/domain-entities.md` - the client-side view model: Character, DeviceStats, Skill, ChatMessage, session state, and what each field is sourced from
- [x] **S6** Produce `functional-design/business-rules.md` - 31 rules in four groups, invariants first
- [x] **S7** Produce `functional-design/business-logic-model.md` - 12 flows end to end
- [x] **S8** Produce `functional-design/frontend-components.md` - component tree, props and state per component, component-to-request map
- [x] **S9** Produce `functional-design/backend-mock-contract.md` - FE's proposal to BE: routes, SSE events, errors, plus two structural asks and four open items
- [x] **S10** Present the completion message and wait for explicit approval

**Artifacts landed at** `aidlc-docs/construction/fe/functional-design/`.

**Note on S9**: this is an extra artifact beyond the four the stage normally produces. It exists because Application Design deliberately left route paths, payload shapes and SSE event names unfixed, to be settled by FE and BE directly during Construction. FE cannot mock a backend without writing down what it is mocking, and that written-down thing *is* FE's half of the negotiation. Keeping it separate from `frontend-components.md` means it can be handed to BE and revised without touching the component design.

---

## 3. Questions

Please answer by filling in the letter after each `[Answer]:` tag. If none of the options fit, pick the last option and describe what you want.

Fourteen questions. They are grouped, and the grouping is a rough priority order - Q1 through Q5 change the shape of the whole unit, Q6 through Q14 change one screen or one flow each.

### Group A: foundations

## Question 1
No stage has chosen an FE framework. Requirements fix TypeScript and a mobile-first responsive browser app, and nothing else. The build window is 1.5 days and there is no existing code to match.

A) React with Vite. Largest ecosystem, most familiar, heaviest for what this app does

B) Svelte with Vite. Less code for the same UI, built-in transitions which the level-up effect wants anyway, smaller bundle

C) Vanilla TypeScript with Vite, no framework. Fewest moving parts, but chat plus SSE plus stats plus skill list is enough state that hand-rolled reactivity starts costing more than it saves

D) Next.js. Rejected by default - server rendering adds a server FE does not own and BE already provides one

E) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 2
How should FE mock the backend? This is the item the dependency document flags as most consequential, and it has to include a fake SSE stream. The mock has to be switchable off cleanly at the hour-5.5 integration checkpoint.

A) In-app mock module behind the same client interface, selected by an env flag. One `apiClient.ts` with a real and a fake implementation; the fake emits scripted SSE events on a timer. Zero extra processes, zero extra dependencies

B) MSW (Mock Service Worker). Intercepts real `fetch` so no client-side branching exists, and the app never knows it is mocked. Costs a dependency and some setup; SSE support needs care

C) A tiny separate mock server in `packages/frontend` dev tooling. Closest to the real thing including real SSE over the wire, at the cost of a second process to run

D) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 3
FR-1.5 was revised so device state shape is **per-product, not fixed system-wide** - beyond power, each product exposes whatever attributes it actually has. Meanwhile the scaffolding phase defers product-authentic data entirely. So how should the stats view render?

A) Generic renderer. FE renders whatever key/value pairs the structured device response contains, with a label lookup for known keys and a readable fallback for unknown ones. Survives BE changing attributes without an FE change, and survives the later per-product phase

B) Per-product layouts. Three hand-designed stat panels, one per product, keyed on product id. Looks better, breaks every time the device response changes, and product-authentic attributes do not exist yet to design against

C) Generic renderer now, with a per-product layout override slot left empty. Adds an extension point for a phase that has not started

D) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 4
Navigation between the roster (FR-7.2, FR-7.3) and the per-character view.

A) No router. A single view-state variable swaps between roster and character view. Back is an in-app control, browser back does nothing useful

B) A router with real URLs (`/`, `/character/:id`). Browser back works, a character screen is linkable, which is handy when rehearsing one demo beat repeatedly

C) One continuous scroll - roster at the top, the selected character expanding below it. No navigation at all

D) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 5
US-2.1 requires level, exp and skill list to be reachable without navigating elsewhere, and the chat lives on the same screen. At a phone viewport that is a lot of surface. How should the character screen be arranged?

A) Vertical stack, one scroll. Character art and stats pinned at the top, chat below, skill list below that. Simple; the skill list is off-screen most of the time

B) Character art and stats pinned at the top, chat filling the rest, skill list in a bottom sheet that pulls up over the chat. Chat gets the most room and the skill list is one gesture away

C) Character art and stats pinned at the top, and a two-tab switch below it for Chat and Skills. Cheapest to build, but "tab away to see skills" is arguably the navigation US-2.1 forbids

D) **Character-centric, four layers.** Added after the user reframed the screen: interaction with the character is the centre, chat is secondary but reachable. Stat header pinned at top (level, exp, device state) - character as the hero of the screen, where level-up and appearance change happen - the character's latest utterance as a speech bubble near it, with the full conversation log opening on demand - input bar (mic and text) pinned at the bottom. The skill list is a **game-compendium overlay** raised over this screen, not a separate route

X) Other (please describe after [Answer]: tag below)

[Answer]: D

### Why D rather than B

The demo's discovery beat decides this. An announcement arriving as one line in a chat log and a character speaking to you unprompted are the same data with different persuasive force. With D the level-up fires on the character and the speech bubble lands on top of it, so "this character made something by itself and is telling me" arrives in one frame. In a chat-centred layout that is a log line next to a separate animation.

**Cost, recorded honestly**: the conversation history is collapsed by default. US-3.2 requires multiple skills announced in one run to be individually attributable, so speech bubbles must queue and the full log must always be openable. US-4.1's "the transcribed text is visible to me" is satisfied by showing the user's own utterances in the same bubble area.

### Three sub-decisions settled with this answer

| Sub-decision | Settled | Note |
|---|---|---|
| **Intimacy stat (친밀도)** | **Removed. Exp only.** | Raised by the user as an example, not a requirement. FR-2.1 defines exp and level and nothing else. A second axis would need a rule for what raises it, a BE field, and a relationship to level - and level is already the presentation device for discovery (FR-2.4), so a second axis would dilute it. Explicit user instruction: do not over-read the example |
| **Header mixes two data classes** | **One component, two separate props, never merged into one array** | Progression (level, exp) comes from the character store. Device state comes from a structured device response and is bound by FR-5.5. Visually adjacent, structurally separate. Merging them into one list makes reading from the convenient field syntactically available, which is precisely the failure mode the execution plan names |
| **Compendium empty slots** | **No locked or empty slots** | N empty slots imply skills are drawn from a predetermined finite catalogue, which is the opposite of the product's claim, and FR-2.4 and US-3.3 state nothing is gated. Instead one non-enumerating line at the end of the list - "keep using it and more will be discovered". Anticipation without implying a count. The worst question a judge can ask here is "so it picks from a list?" |

### Group B: skills, discovery, progression

## Question 6
How does the user invoke a discovered skill (US-3.3) and give feedback on one (US-3.4)? The stories are not the same shape here - invoking says "when I invoke that skill", while feedback is explicitly natural language in chat.

A) Both through chat only. Skill cards are read-only; invoking means saying "그 스킬 실행해줘". Nothing new to build, but invoking a specific skill by name in speech is fragile on stage

B) Invoke is a button on the skill card, feedback is chat only. Matches how the two stories are written, and the button gives the demo a reliable beat

C) Both are controls on the skill card - an invoke button plus a feedback input on the card itself. Most discoverable, and it moves feedback out of the conversation where US-3.4's phrasing puts it

D) **Invoke is a button on the card. Feedback is a "talk about this" action on the card** that closes the compendium overlay and focuses the input bar with that skill bound as context. Feedback still lands in the conversation, but which skill it refers to is never ambiguous

X) Other (please describe after [Answer]: tag below)

[Answer]: D

### Why D

US-5.1's fourth beat decides it. Inviting a judge to correct a skill in one sentence is the strongest moment in the demo, and that person is looking at a card in the compendium when it happens. A and B make them dismiss the overlay and re-identify the skill by speech, and if that reference is vague BE cannot resolve which skill was meant. C keeps it on the card but takes the feedback out of the conversation, which removes the character's confirming reply - and US-3.4 requires that confirmation. It has to arrive as a speech bubble for the correction to read as the character having changed something.

In substance D means FE includes `skillId` in the feedback payload. The user still types or speaks only natural language; the UI already knows which skill is on screen.

**Cost, recorded**: unreferenced natural-language feedback ("아까 그거 너무 일러") remains a separate path BE has to resolve by interpretation. D does not remove that path, it removes the demo's dependence on it.

## Question 7
US-3.2 requires a skill's reason for existing to stay inspectable after the announcement scrolls away. FR-5.11 forbids raw provenance reaching the client, so what FE shows is an agent-produced summary, not the underlying observations.

A) Inline on the skill card, always visible. One or two lines of summary under the skill name

B) Collapsed on the card, expanded by tapping. Keeps the list scannable; costs a tap at the exact moment a judge is curious

C) A separate detail view per skill. Most room, most navigation, and the most likely to be skipped during a 15-second demo beat

D) Other (please describe after [Answer]: tag below)

[Answer]: A

### Why A

The compendium-card metaphor settles it. The reason anyone opens a card in a game compendium is to read the entry, and a compendium whose entries are collapsed is a list, not a compendium.

More importantly, here that summary is not decoration - it is the evidence. A sentence like "화요일과 목요일 저녁에 운동화를 넣으시는 걸 14일간 봤어요" is what converts autonomous discovery from a claim into evidence, and behind a tap half the audience never sees it.

**Scaling note**: always-expanded summaries make a long scroll once there are five or six skills. This demo has two or three per product and the compendium is a near-full-screen overlay, so that count is not reached. If it is, clamping the summary to two lines with a "more" affordance inside A is cheaper than switching to B.

## Question 8
Character art. NFR-4.2 forbids generating it at level-up, so it must be pre-generated - but no art exists yet, and producing three products times N levels of illustration is not FE work that fits in the window.

A) One base illustration per product, with level expressed through a frame, aura, colour shift or accessory rendered in CSS. Cosmetic evolution (FR-2.5) is satisfied, N levels cost nothing, and no art pipeline is needed

B) One distinct illustration per product per level. Best-looking, but the assets do not exist and someone has to make 3 x N of them

C) Placeholder art now - a simple shape or emoji per product, with the same CSS level treatment - and swap in real assets if any arrive. Unblocks FE completely

D) Other (please describe after [Answer]: tag below)

[Answer]: C

### What C means structurally

C and A are not exclusive and the design follows both. **A is the structure**: one illustration per product, level expressed as a CSS layer over it - frame, aura, colour shift, accessory. **C is what occupies that structure now**: a placeholder shape per product. The image reference comes from config, so swapping a placeholder for a real illustration is a config change and zero code change.

**Why not B**: the drop order in the execution plan is voice, then **cosmetic evolution**, then the English toggle. Cosmetic evolution is the second thing to be cut, and B pays its entire cost up front - 3 x N assets authored, then discarded. A's CSS layer costs almost nothing to discard and delivers most of B's effect if it survives.

Practical note: generating one illustration per product is about 30 minutes of image-model work. 3 x N is not. So "one per product" is the only reachable point on this axis.

## Question 9
The level-up effect (US-2.1, and the visual half of the discovery announcement). What does it actually consist of?

A) A full-screen overlay for a couple of seconds - "LEVEL UP", the new level, the appearance change revealed behind it. Unmissable, and it briefly covers the chat where the announcement is arriving

B) An in-place effect on the character - scale and glow animation, exp bar filling, level number ticking over, appearance changing - with no overlay. The announcement message stays readable throughout

C) Both, sequenced: brief in-place effect, then the announcement message lands in chat, then a small badge on the exp bar. More timing to get right, better as a demo beat

D) Other (please describe after [Answer]: tag below)

[Answer]: B

### Why B

Choosing D at Q5 settles this. The argument for D was that the level-up effect and the speech bubble must arrive in the same frame for it to read as the character having made something and telling you. A full-screen overlay covers exactly that frame - in a character-centric layout it covers the character.

**Why not C**: its cost is not animation time, it is **synchronisation**. The in-place effect and the announcement come from different sources - a level change is a progression update, the announcement is an SSE event. Making them appear sequenced means queueing one and holding it, and if SSE ordering or timing slips the sequence inverts on stage. With B the two arrive independently and overlap naturally.

**How B gets most of C's benefit for free**: give the in-place effect a generous duration, around 1.5 seconds. The announcement then tends to arrive while it is still running, so the character is mid-effect when it speaks. Overlap alone produces an impression close to sequencing, with no synchronisation code.

### Group C: voice, language, failure

## Question 10
Voice input transport. Application Design fixed REST for user-initiated calls and SSE for server pushes, and said nothing about audio - a streaming transcription path does not fit either. Amazon Transcribe streaming is server-side, so this is FE's proposal to BE.

A) WebSocket. Browser captures with `MediaRecorder` and streams chunks up; partial transcripts come back down the same socket. Matches Transcribe streaming properly and shows interim text as the user speaks. Third transport to build

B) Record then POST once. Capture the whole utterance, `POST` the blob, get the final transcript back. Stays inside the fixed transport set, no interim text, and the user waits after they stop speaking

C) Record then POST, and show the final transcript as a confirmable draft in the text input before it goes to the agent. Same cost as B, and it makes stage misrecognition recoverable rather than merely legible

D) Other (please describe after [Answer]: tag below)

[Answer]: C

### Why C

**Voice is the first thing dropped.** The execution plan's drop order starts with voice. A builds a WebSocket server, a chunk protocol, partial-transcript handling and reconnection on both sides - the largest investment in the item most likely to be cut.

**C over-satisfies US-4.1 scenario 2 for the same cost as B.** The story requires only that the transcribed text be visible, and its note gives the reason: when misrecognition happens on stage, showing the transcript makes the failure legible rather than mysterious. C goes one step further and makes it *recoverable* - a wrong transcript can be edited and sent, and the demo does not stall. The implementation difference from B is whether the transcript is dispatched immediately or placed in the input, and the input already exists.

**Cost, recorded**: latency. The user waits after finishing speaking, then confirms. A's "words appear as you speak" is genuinely more impressive on stage, but buying that impression with hours spent on the first drop candidate is not a trade this schedule supports.

**Transport consequence for BE**: one REST route accepting an audio blob, returning a transcript. No third transport. This is FE's proposal, per the interface evolution policy.

## Question 11
Localization. FR-8.3 pins agent output language by prompt instruction, so FE's job is interface strings plus telling BE which language to reply in.

A) A plain TypeScript dictionary keyed by string id, with a `lang` value in app state. No dependency, roughly 40 strings, one function

B) `i18next` with a framework binding. Pluralization, interpolation, namespaces - none of which 40 static strings need

C) Other (please describe after [Answer]: tag below)

[Answer]: A

### Why A

What `i18next` solves is managing hundreds of strings, collaborating with translators, plural rules and lazy loading. Here there is one screen plus a roster, roughly 40 strings, and no translator.

Implementation: one `strings.ts` holding `{ ko: {...}, en: {...} }`, one `t(key)` function, one context carrying `lang`. React is settled, so putting `lang` in context makes the toggle re-render everything for free.

**The English toggle is third in the drop order.** With A, dropping it means leaving the `en` keys unfilled and hiding the toggle. With B, configuration and initialisation are wired into app bootstrap and stay behind.

### One design point settled here

`lang` travels on **every** BE request, not just the UI. FR-8.2 covers reply language too. So `apiClient` reads the current `lang` and attaches it automatically rather than each call site passing it - otherwise one call site gets missed and that one screen answers in the wrong language.

## Question 12
NFR-2.2 requires a visible graceful fallback that never blanks the screen. Where does a failure appear?

A) As a system message in the chat stream, styled differently from character speech. Failures appear where the user is already looking, and scroll away naturally

B) As a dismissible banner above the chat. Harder to miss, and stays until dismissed even after the situation recovers

C) Both, by kind: request-level failures as chat system messages, connection-level failures such as SSE dropping as a persistent banner

D) Other (please describe after [Answer]: tag below)

[Answer]: C

### Why C, and what the split actually is

Q5=D forces the split. With the conversation log collapsed by default, A alone means failures happen inside something the user is not looking at.

A request-level failure suits the character voice - a failed model call *is* the character not managing to answer, and having it say so is the natural presentation. A dropped SSE connection is a different kind of thing entirely: not the character having nothing to say, but the character being **unable to speak to you from now on**. The demo's central beat depends on that channel, so if it disappears as one bubble that scrolls away, the failure is experienced on stage as "why is no announcement coming" with no visible cause.

| Failure class | Presentation |
|---|---|
| **Request-level** - message send, skill invoke, transcription | Character speech bubble plus a system entry in the log. Stats already on screen stay put, per US-1.1 scenario 4 |
| **Connection-level** - SSE dropped | Persistent top banner with reconnection state. Clears itself when reconnected |

**The banner is not dismissible**, which is the difference from B. If the user can dismiss it they will dismiss it absent-mindedly on stage and lose the cause. It disappears when the situation recovers and stays while it has not.

Cost: one banner component and one piece of state holding SSE connection status - which the reconnection logic needs regardless.

### Group D: two smaller decisions with sharp edges

## Question 13
While waiting for a reply, does FE show anything optimistic? This touches FR-5.5 directly - the failure mode named in the execution plan is a UI that shows *intent* rather than committed state.

A) Nothing optimistic. The user's message appears, a typing indicator appears, and stats do not move until a structured device response arrives. Slower-feeling, and structurally incapable of showing a state that never happened

B) Stats show a neutral "changing" indicator - no predicted values, just a marker that something is in flight, cleared when the real response lands. Feels responsive, shows no invented value

C) Optimistic stat values predicted from the request, corrected on response. Rejected by default - this is exactly the failure FR-5.5 exists to prevent

D) Other (please describe after [Answer]: tag below)

[Answer]: B

### Why B rather than A

A and B are **equally compliant** with FR-5.5. Neither shows a predicted value; in both, a structured response is the only source of a stat. The difference is only whether the stat area looks dead while waiting.

B wins on one specific demo moment. US-1.1 scenario 3 - the device clamping 30 minutes to 25 - is the five-second proof put in front of judges. What that moment needs is for the change to be *visible as it happens*. With A the stats sit unchanged and then jump to 25. With B a marker lights, then resolves to 25, so "I asked, the device handled it, this is the result" appears as a timeline on screen, and the fact that a clamp occurred reads more clearly on that timeline.

B also fails in a safer direction. If no response ever arrives, A shows a screen where nothing happened and B shows a screen with a pending marker. The second is diagnosable.

**Mandatory pairing**: the marker must be cleared when NFR-2.1's timeout and single retry are exhausted, handing over to Q12's request-level failure presentation. Without that rule a marker spins forever. This is carried into `business-rules.md` as an explicit rule rather than left to implementation.

## Question 14
An unprompted announcement (US-3.2) arrives over SSE for a character the user is not currently looking at. What should happen?

A) Nothing visible. The announcement is in that character's history when the user opens it. Simplest, and an autonomous discovery can go completely unnoticed - which undercuts the pillar

B) A badge on that character in the roster, and on the in-app back control. The user learns something happened and can go look

C) A toast that appears wherever the user is, tappable to jump to that character. Strongest for the demo, most intrusive, and it can fire mid-sentence during another beat

D) Other (please describe after [Answer]: tag below)

[Answer]: B

### Why B

C being "strongest for the demo" can invert in practice. The demo runs four beats in order, but discovery fires when accumulated data volume crosses a threshold (FR-5.10), so its timing is outside the presenter's control. If a discovery for another product completes while the control beat is being demonstrated, a toast crossing the screen spends the strongest beat at the weakest moment. On stage this actually happens - all three characters are live and being interacted with throughout.

B avoids that without A's problem. A badge is a signal the presenter can point at when they choose - "ah, something was discovered over there" - and it never takes the screen.

### The structural consequence, which affects BE

For B to work at all, **SSE must be one connection for the whole app, not one per character.** A connection opened when a character screen mounts and closed when it unmounts cannot receive events for a character the user is not viewing. So: open once on app mount, receive events for all three characters, route by the character id carried on the event.

This goes into `backend-mock-contract.md` because it is a BE-facing decision - whether the stream is per-character or unified determines FE's structure.

It also simplifies Q12: one connection means one piece of connection state, so the SSE-dropped banner has a single source.

---

## 3.1 Answer set: consistency check (Step 4)

**Answers**: Q1 A, Q2 A, Q3 A, Q4 A, Q5 D, Q6 D, Q7 A, Q8 C, Q9 B, Q10 C, Q11 A, Q12 C, Q13 B, Q14 B.

**No contradictions found.** Three pairs interact in ways that need a resolution stated rather than left to implementation, and one answer changed an earlier one's reasoning.

| Interaction | Resolution |
|---|---|
| **Q13 B pending marker x Q3 A generic renderer** | The marker attaches to the **stats block as a whole**, not to individual keys. A generic renderer does not know which key a request will affect, and guessing would reintroduce prediction - the thing Q13 rejected |
| **Q8 C placeholder art x Q9 B in-place appearance change** | With placeholder art the "appearance change" is the CSS level layer alone - frame, aura, colour. FR-2.5 is satisfied by that layer, not by the artwork, which is why Q8's structure holds at any art fidelity |
| **Q14 B badge x Q2 A in-app mock** | The mock's fake SSE stream must emit events for **all three characters**, not only the one on screen. A mock that only fires for the visible character would make the badge untestable, which is the one thing Q14 exists to produce |
| **Q5 D superseded Q9's framing** | Q9's options were written against a chat-centred layout. Choosing D made A (full-screen overlay) self-defeating rather than merely worse - it covers the character that D put at the centre. Recorded because the reasoning changed, not just the answer |

**Q5 also retired one thing from the requirements' own list of open items.** Section 7 item 3 of `requirements.md` - "character art strategy: per-level illustration versus a single base illustration with level expressed through frame, aura, colour or accessory" - is now decided as the latter, via Q8. Noted so the open-decisions list does not stay stale.

---

## 4. Defaulted without asking

Small enough to default, and cheap to reverse. Say so if any of these is wrong.

| Decision | Default | Why not a question |
|---|---|---|
| Language preference persistence | `localStorage`, single key | The only thing NFR-2.3 leaves to the client, and no reasonable alternative |
| Chat scrollback persistence | None. Refetch progression and skills on load, conversation starts empty | US-2.1 states this outright: "only the conversation scrollback is absent" |
| Client-side input validation | Trim, reject empty, cap length, and show the cap. Server validates independently | NFR-1.3. Client-side caps are UX; the trust boundary is BE's |
| Prompt-injection guard location | BE only. FE does not attempt one | NFR-1.4 is a trust-boundary control and the browser is not a trust boundary |
| Styling approach | Plain CSS with custom properties, no UI kit | One screen and a roster. A component library would be larger than the app |
| Demo trigger for discovery | None built unless BE needs one. FR-5.10 triggers discovery on accumulated data volume, so ordinary demo interactions should cross the threshold | If rehearsal shows it does not fire reliably on cue, that becomes a real question - flagged as a risk rather than pre-solved |

---

## 5. Risks carried into design

| Risk | Note |
|---|---|
| **Discovery not firing on cue** | The demo's strongest beat depends on a volume threshold crossing during the show. FE has no control over it and no fallback if it stays silent. Needs to be settled with BE early, not at rehearsal |
| **Voice is the first drop** | Drop order is voice, then cosmetic evolution, then the English toggle. Whatever Q10 chooses should be built so removing it leaves the text path untouched |
| **SSE through dev proxy** | SSE tends to break in unexpected places - dev server proxies, buffering intermediaries. The fake stream in the mock will not surface those. Worth a real SSE connection before hour 5.5 rather than at it |
| **Stats provenance drift** | The invariant is easy to honour on day one and easy to break under time pressure by reading a convenient field. Worth one runnable check: a clamped response renders the clamped value |
