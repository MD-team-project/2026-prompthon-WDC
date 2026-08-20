# User Stories

**Stage**: INCEPTION - User Stories, Part 2
**Generated**: 2026-08-20T02:51:07Z
**Revised**: 2026-08-20T03:04:52Z - revision 2, six changes from user review
**Organization**: Epic-Based (plan Q2 = E)
**Acceptance criteria format**: Given / When / Then throughout (plan Q4 = A)
**Story count**: 9
**Source**: `requirements.md`, `personas.md`, `story-generation-plan.md`

## Revision 2 change log

| # | Change | Effect |
|---|---|---|
| 1 | Device state is displayed **as character stats**, not as a separate device panel | US-1.1 rewritten. The character *is* the device UI |
| 2 | US-1.2 (graceful failure story) **removed** | Model-failure criteria retained on US-1.1 rather than lost entirely - see note below |
| 3 | Level, exp, and skill list live on the **main character UI** | US-2.1 rewritten |
| 4 | Usage history tiered: **14 days for basic skills, 60 days for advanced** | US-3.1 rewritten. Introduces skill tiers |
| 5 | **Causality reversed**: discovery triggers a level-up presentation, rather than level gating skills | US-2.1 and US-3.3 rewritten. No locked skills |
| 6 | **Response always text. Request by voice or text** | US-4.1 rewritten. Speech synthesis removed from the response path |

## Revision 3 change log

Applied 2026-08-20T03:14:36Z.

| # | Change | Effect |
|---|---|---|
| 7 | **Amazon Transcribe added, Amazon Polly removed** | US-4.1. Speech-to-text moves from the browser Web Speech API to Transcribe streaming, keeping voice processing inside AWS. Polly stays removed - it was output-side and unrelated to voice input |
| 8 | **1:1:1 relation asserted, device reached over an API** | US-1.1. Agent, character, and device are bound one-to-one-to-one; the agent talks to its device through an API rather than sharing memory with it |
| 9 | **Asymmetric read and write paths** | US-1.1. Stats are read from DynamoDB; the device API buffers in memory, flushes to the app, and clears. All other actions connect directly to the device API |

**On change 8**: the API boundary is what makes the "stats are real, not claimed" guarantee enforceable. It also means three products require three agents, not one agent handling three devices - an architectural commitment recorded in `requirements.md` FR-5.4.

**On change 9**: the agent writes through the device API but cannot write to the read path, so displayed state is always state the device committed. FR-5.8 was added to stop the flush interval producing stale stats at the exact moment a user looks for confirmation.

**On change 2**: removing the story is honored, but NFR-2.2 and NFR-2.4 were the only user-visible resiliency items and deleting their sole home would silently drop them. One model-failure scenario is therefore retained on US-1.1, where it belongs anyway. Flagged for confirmation.

## How to read this document

**Story volume is deliberately uneven**, mirroring the pillar depth contract from `requirements.md`:

| Epic | Stories | Why this size |
|---|---|---|
| Skill Discovery | 4 | Deep pillar, flagged VERY IMPORTANT |
| Cross-Cutting | 2 | Voice input and language |
| Agentic Control | 1 | Baseline, deliberately plain |
| Character Progression | 1 | Thin and presentation-led |
| Demo | 1 | Run-of-show, not new functionality |

**Actor convention** (plan Q5 = C): inside the Skill Discovery epic, autonomous stories use the agent as actor, because those behaviours have no human trigger and an observer's phrasing would disguise the autonomy that is the point. User-initiated stories in that epic keep a human actor. All other epics use human actors.

**NFR treatment** (plan Q6 = B): non-functional requirements are cited as constraints, not written as stories.

---

# Epic 1: Agentic Control

Baseline depth. Must work convincingly and no more.

## US-1.1: Control a product by saying what I want, and see it in my character

**As** an LG product owner
**I want** to tell my product what to do in plain language and see the result in my character
**So that** I never have to find the right button or slider again

**Personas**: Min-seo, Do-yun
**Traces**: FR-1.1, FR-1.2, FR-1.3, FR-1.4, FR-1.5
**Constrained by**: NFR-1.3 (input validation and length caps), NFR-1.4 (prompt-injection guard), NFR-2.1 (timeout and one retry), NFR-2.2 (graceful fallback)

```gherkin
Given I am on my ShoeCase character's screen
  And the ShoeCase is currently idle
When I say or type "운동화 30분만 건조해줘"
Then the agent applies a dry command directly against the device API
  And the device's structured state response is passed through to the UI
  And the character's stats change to show the product is drying with 30 minutes remaining
  And the character replies confirming what it did

Given one agent, one character, and one device are bound in a 1:1:1 relation
When the character's stats are displayed
Then they carry values taken from the device API's structured response
  And not derived from the text of what the agent said it would do
  And there is no separate device panel anywhere in the interface

Given the device clamps my requested 30 minutes to its own limit of 25
When the command completes
Then the stats show 25 minutes
  And not the 30 minutes I asked for or the agent echoed

Given the device API accumulates usage events in memory
When a flush occurs
Then those events are persisted to DynamoDB for Skill Discovery to analyse later
  And the buffer is cleared
  And nothing about the currently displayed stats depends on that flush having happened

Given three products each have their own agent and character
When I act on one product
Then only that product's device and character change
  And no state is shared between the three

Given I have sent a message to a character
When the model call fails after its one permitted retry
Then the character shows a visible fallback message
  And the stats already on screen remain displayed rather than blanking
```

**Notes**: The character is the device UI. There is no appliance control panel, because a panel is the thing this product exists to remove - putting one on screen alongside a character would concede the argument. Device state is expressed as character stats instead.

Scenarios two and three guard against the failure mode that would quietly hollow out the whole demo: an agent that says "건조 시작했어요" while nothing actually changed.

**The invariant is about payload provenance, not storage.** *Revised 2026-08-20T04:11:47Z; earlier revisions located this guarantee in the storage path, which was the wrong place.* Stats reach the UI as **structured data returned by the device API**, passed through the agent rather than composed by it. A language model can write a confident sentence; it cannot fabricate a structured device response. That is the whole guarantee, and it holds regardless of where the value is later stored.

The third scenario is the sharp test of it. If the device clamps a 30 minute request to 25, the screen must say 25. A UI fed by model-generated text would say 30, because 30 is what the conversation was about. This is worth putting in front of judges deliberately - it is a five-second demonstration that the character is wired to the product rather than narrating over it.

**Two data flows now exist, separated by purpose rather than by direction.** Runtime state moves device to agent to UI synchronously. Usage events accumulate device to DynamoDB by flush, for Skill Discovery to analyse later. The display depends on the first and is entirely independent of the second, which is what removed the staleness window earlier revisions had to work around.

The third scenario asserts the **1:1:1 relation** from the original vision as a testable property. Three products means three agents and three characters, each with its own state. This is an architectural commitment, not just a UI arrangement: a single agent multiplexing three devices would break the premise that each character learns its own product.

The fourth scenario is what survives from the removed US-1.2, kept because a model timeout on venue wifi is a realistic stage failure and a blank screen is a worse outcome than an apology.

---

# Epic 2: Character Progression

Thin, presentation-led. This epic is where discovery is *celebrated*, not where it is gated.

## US-2.1: See my character level up when it learns something

**As** an LG product owner
**I want** my character to visibly level up when it has learned something new
**So that** growth feels earned and the product feels like it is improving itself

**Personas**: Min-seo, Do-yun
**Traces**: FR-2.1, FR-2.2, FR-2.3, FR-2.5, FR-2.7, FR-7.2
**Constrained by**: NFR-2.3 (progress survives refresh), NFR-4.2 (no slow or non-deterministic generation on a visible path)

```gherkin
Given my character has discovered a new skill
When the discovery completes
Then a level-up effect plays on the main character UI
  And the character's appearance changes to its next-level artwork
  And the artwork is served from a pre-generated asset rather than produced on demand

Given I am on the main character UI
When I look at it
Then level, experience, and the skill list are all shown on this one surface
  And I do not need to navigate elsewhere to see any of them

Given I interact with a product
When the interaction completes
Then experience increases and the progress indicator moves
  And no page reload is required

Given my character has levelled and unlocked skills
When I refresh the browser
Then level, experience, and skill list are unchanged
  And only the conversation scrollback is absent
```

**Notes**: The first scenario carries change 5, and it inverts what the earlier revision said. **Discovery is the cause; the level-up is the presentation.** From the user's seat it reads the other way round - they see a level-up and conclude that levelling earned them a skill - and that misreading is the intended effect, because it makes autonomous discovery feel like a reward rather than a system event.

Practically this is also the cheaper design. There are no thresholds to tune, no locked-skill state to build, and the level-up effect doubles as the visual half of the discovery announcement.

Level still does not change personality or tone. That exclusion (Round 2 Q15 chose A and C, not B) is unaffected.

---

# Epic 3: Skill Discovery

Deep pillar, primary. Heaviest epic by design. US-3.1 and US-3.2 use the agent as actor.

## US-3.1: Discover a skill from usage history without being asked

**As** a product's AI agent
**I want** to analyse accumulated usage and create a skill on my own initiative
**So that** the owner receives personalization they never configured

**Actor**: The agent. No human initiates this.
**Personas**: None directly. Do-yun experiences the outcome.
**Traces**: FR-3.1, FR-3.2, FR-3.3, FR-3.4, FR-3.5, FR-6.1, FR-6.2, FR-6.3, FR-5.3
**Constrained by**: NFR-4.1 (deterministic given the same fixture and feedback state)

```gherkin
Given a product has 14 days of usage history
  And that history contains a simple recurring pattern
When a discovery run executes
Then a basic skill is created without any human approval step
  And no confirmation is requested from the user at any point
  And the skill records which observations motivated it

Given a product has 60 days of usage history
  And that history contains a pattern only visible over a longer span
When a discovery run executes
Then an advanced skill is created
  And it is distinguishable from a basic skill in the skill list

Given a discovery run is composing a skill
When it selects the actions the skill will perform
Then every action references a capability enumerated from the device adapter
  And no action references a capability that does not exist

Given the same usage history and the same accumulated feedback
When a discovery run executes twice
Then both runs produce the same skills
  And the demo behaves identically on every rehearsal

Given a product's usage history contains no discernible pattern
When a discovery run executes
Then no skill is fabricated
  And the absence is reported rather than filled with an invented result
```

**Notes**: Change 4 introduces **skill tiers**. Fourteen days is enough for a simple repeated behaviour; sixty days is what it takes to see something a person would not notice themselves. This is a better demo than a flat sixty-day fixture, because the tiering itself is the argument: more usage genuinely yields deeper personalization, which is the "self-improving" claim made visible rather than asserted.

The last scenario is the honest counterpart to the first. An agent that always finds something regardless of the data is generating, not discovering. Restraint is what makes the successful case credible.

The third scenario is the safety property that keeps this pillar demo-safe: bounded vocabulary means a generated skill cannot fail at invocation by referring to something imaginary.

## US-3.2: Tell the owner what I made and why

**As** a product's AI agent
**I want** to announce a newly discovered skill unprompted and explain my reasoning
**So that** the owner witnesses the discovery instead of merely finding it later

**Actor**: The agent.
**Personas**: Do-yun observes this
**Traces**: FR-3.6, FR-3.7
**Constrained by**: NFR-1.5 (no personal data in logs)

```gherkin
Given I have just created a skill from an observed pattern
When the owner is on that character's screen
Then I state in chat what the skill does
  And I state the usage pattern that led me to create it
  And the message appears without the owner having sent anything

Given a skill has been announced
When the owner navigates away and returns
Then the skill is present in the character's skill list
  And the reason it was created remains inspectable

Given multiple skills are discovered in one run
When I announce them
Then each is announced distinctly
  And the owner can tell which pattern produced which skill
```

**Notes**: This story is why the autonomy is legible at all. Without the announcement, fully autonomous discovery is indistinguishable from nothing happening. Stating *why* is what converts a feature into evidence of learning.

## US-3.3: Use a skill my character discovered

**As** an established LG product owner
**I want** to invoke a skill my character created
**So that** the discovery has practical value rather than being a notification

**Actor**: Human. User-initiated, so it keeps a human actor despite sitting in this epic.
**Personas**: Do-yun
**Traces**: FR-3.8
**Constrained by**: NFR-1.3 (input validation), NFR-2.1 (timeout and retry)

```gherkin
Given my character has a discovered skill in its skill list
When I invoke that skill
Then its composed device commands are applied in order
  And the character's stats update to reflect the result

Given a skill has just been discovered and announced
When I look at the skill list
Then the skill is immediately available to invoke
  And it is not locked behind a level requirement

Given I invoke a discovered skill
When one of its composed commands cannot be applied
Then the failure is reported clearly
  And commands already applied are not silently reverted
```

**Notes**: The second scenario carries change 5 from the other direction. Every discovered skill is usable the moment it exists. Nothing is gated by level, because level is now an effect of discovery rather than a precondition for it. FR-2.4 in `requirements.md` states the opposite and needs amending.

## US-3.4: Correct a skill instead of deleting it

**As** an established LG product owner
**I want** to give my character feedback on a skill that is nearly right
**So that** it improves rather than being abandoned

**Actor**: Human initiates, agent revises.
**Personas**: Do-yun
**Traces**: FR-3.9, FR-3.10, FR-3.11, FR-3.12
**Constrained by**: NFR-1.4 (prompt-injection guard on feedback text), NFR-1.3 (input validation)

```gherkin
Given a discovered skill triggers at a time I dislike
When I tell the character "너무 일러, 평일 저녁으로 바꿔줘"
Then the skill's trigger condition is revised
  And the skill retains its identity and history rather than being replaced
  And the character confirms what it changed

Given a discovered skill I do not want at all
When I tell the character to stop suggesting it
Then the skill is retired
  And it no longer appears as active in the skill list

Given I have given feedback on a skill
When a later discovery run executes
Then that feedback informs the run
  And a skill previously retired is not recreated unchanged

Given I give no feedback on a discovered skill
When time passes and I continue using the product
Then the skill remains exactly as created
  And the system continues to function with no input from me
```

**Notes**: The fourth scenario protects the autonomy claim. Feedback is optional and post-hoc; if it were required, discovery would not be autonomous, and an unattended demo would not work.

The third scenario is the "refined in every iteration" line from the original vision, expressed as something testable.

---

# Epic 4: Cross-Cutting

## US-4.1: Speak or type, and read the reply

**As** an LG product owner
**I want** to reach my character by voice or by typing, and read what it says back
**So that** controlling the product is as easy as speaking, without depending on audio playback

**Personas**: Min-seo, Do-yun
**Traces**: FR-4.1, FR-4.2, FR-4.4
**Constrained by**: NFR-1.2 (calls server-side - now covers Transcribe as well as the model), NFR-2.1 (timeout and retry, applied to Transcribe too)

```gherkin
Given I am on a character's screen
When I speak a command aloud
Then my audio is streamed server-side to Amazon Transcribe
  And the returned text is submitted to the agent identically to typed input

Given I have spoken a command
When the transcription completes
Then the transcribed text is visible to me
  And I can tell what the system understood me to say

Given the agent has produced a reply
When it is presented to me
Then it is always displayed as text
  And no audio playback is required to understand it

Given speech recognition is unavailable in my browser
When I open a character's screen
Then the text input remains fully functional
  And no capability is lost other than speaking
```

**Notes**: The channels are asymmetric on purpose. **Input flexible, output always text.** Speech synthesis is gone from the response path, which drops Amazon Polly and removes a moving part from the most visible moment of the demo.

Speech recognition moved from the browser Web Speech API to **Amazon Transcribe streaming** (revision 3). Polly and Transcribe are opposite directions and are not substitutes: Polly is text-to-speech and belongs to output, Transcribe is speech-to-text and belongs to input. Removing Polly never affected voice input; switching to Transcribe is a separate decision, taken so that speech processing stays inside AWS rather than being sent to Google's recognition service, which is what the browser API does.

Cost accepted: browser audio capture plus a server-side streaming path is the single most expensive change in this revision set relative to demo value, roughly 1-3 hours including debugging. The risk is contained by the fourth scenario - text is the primary path, so a failure in the audio pipeline degrades the demo rather than ending it.

The second scenario is small but load-bearing live. When misrecognition happens on stage, showing the transcript makes the failure legible rather than mysterious.

## US-4.2: Use the app in my own language

**As** an LG product owner
**I want** the interface and my character to use Korean, with English available
**So that** the product fits me, and can also be shown to others

**Personas**: Min-seo
**Traces**: FR-8.1, FR-8.2, FR-8.3
**Constrained by**: None specific

```gherkin
Given I open the application for the first time
Then the interface is in Korean
  And character replies are in Korean

Given I am using the application in Korean
When I switch the language toggle to English
Then interface strings change to English
  And subsequent character replies are in English

Given a skill was discovered while the interface was in Korean
When I switch to English
Then the skill remains present and usable
  And its name is not retroactively rewritten
```

**Notes**: The voice-output half of FR-8.1 and FR-8.2 no longer applies after change 6, since there is no speech output to switch. Language now affects interface strings and reply text only.

The third scenario records a deliberate limit. Skill names stay in the language they were generated in, avoiding a translation pass that would cost time and add a failure mode for no demo benefit.

---

# Epic 5: Demo

Not new functionality. This is the run-of-show, expressed as what must be visible at each beat.

## US-5.1: Follow the demo as a judge

**As** a hackathon judge
**I want** to see the premise proven in a short sequence
**So that** I can evaluate whether this changes the product experience

**Personas**: None. A judge is an audience member, not a system user.
**Traces**: FR-7.1, FR-7.2, FR-7.3
**Constrained by**: NFR-4.1 (deterministic), NFR-4.2 (nothing slow on a visible path), NFR-2.4 (fixture fallback)

```gherkin
Given the application is opened for the demo
When the roster appears
Then three characters are visible, one per product
  And no login step was required

Given the demo has reached the control beat
When a command is spoken or typed
Then the character's stats change visibly within a few seconds
  And the point that no settings panel exists anywhere is self-evident

Given the demo has reached the discovery beat
When a discovery run executes
Then a character announces a skill it created unprompted
  And states the usage pattern behind it
  And a level-up effect plays, so the discovery reads as a reward

Given the demo has reached the feedback beat
When a judge is invited to correct the discovered skill in one sentence
Then the skill visibly changes
  And the change is attributable to what the judge said
```

**Notes**: The fourth beat is the strongest available and the cheapest to build, needing no planning loop. An agent inventing something unprompted, a stranger pushing back in one sentence, and the thing visibly changing is the whole thesis in about fifteen seconds.

The third beat now pairs the announcement with the level-up effect, per change 5. Those two firing together is what makes autonomous discovery feel like an achievement rather than a log entry.

---

# Traceability

## Functional requirement coverage

| FR group | Covered by |
|---|---|
| FR-1 Agentic Control | US-1.1 |
| FR-2 Character Progression | US-2.1 |
| FR-3 Skill Discovery | US-3.1, US-3.2, US-3.3, US-3.4 |
| FR-4 Voice | US-4.1 |
| FR-5 Device layer | US-3.1 (FR-5.3 only) - see gaps |
| FR-6 Usage history fixture | US-3.1 |
| FR-7 Interface and navigation | US-2.1, US-5.1 |
| FR-8 Localization | US-4.2 |

## Requirements that revision 2 invalidates

These need amending in `requirements.md`. Listed here rather than silently diverging:

| Requirement | Current text | Needs to become |
|---|---|---|
| **FR-2.4** | "Level shall gate availability of discovered skills" | Reversed. Discovery triggers a level-up presentation; nothing is gated by level |
| **FR-4.2** | Transcription happens "in the browser" | Now Amazon Transcribe streaming, server-side |
| **FR-4.3** | "Agent text output shall be rendered to speech and played back" | Removed. Output is text only |
| **FR-5.1** | `DeviceAdapter` as an in-process interface | Device is reached over an API; the adapter is the client of that API |
| **New FR-5.4** | - | 1:1:1 binding of agent, character, and device asserted as a requirement |
| **New FR-5.5 to FR-5.8** | - | Asymmetric paths: stats read from DynamoDB, commands direct to device API, device buffers in memory and flushes then clears, action forces a flush |
| **FR-6.1** | "roughly sixty days per product" | Tiered: 14 days yields basic skills, 60 days yields advanced |
| **FR-8.1, FR-8.2** | Include Korean and English speech voices | Voice-output clauses removed; interface strings and reply text only |
| **Section 5.1 stack** | Lists Amazon Polly | Polly removed from the runtime |
| **NFR-2.1** | "every model and speech-synthesis call" | Speech synthesis clause no longer applies |

## Deliberate gaps

- **FR-5.1, FR-5.2** (the `DeviceAdapter` interface, mock as sole implementation) have **no story, intentionally**. Internal structural requirements with no user-visible outcome. A story claiming "as an owner I want an interface" would be fiction. FR-5.3, which constrains what the agent may generate, is covered via US-3.1.
- **FR-1.6, FR-2.6** are exclusions rather than capabilities. Their absence is asserted in the notes on US-1.1 and US-2.1.
- **FR-6.1, FR-6.2** are preconditions and appear as Given clauses on US-3.1, which is the correct place for them.

## Non-functional requirement citation

| NFR | Cited on |
|---|---|
| NFR-1.2 model calls server-side | US-4.1 |
| NFR-1.3 input validation | US-1.1, US-3.3, US-3.4 |
| NFR-1.4 prompt-injection guard | US-1.1, US-3.4 |
| NFR-1.5 no personal data in logs | US-3.2 |
| NFR-2.1 timeout and one retry | US-1.1, US-3.3, US-4.1 |
| NFR-2.2 graceful fallback | US-1.1 (third scenario) |
| NFR-2.3 progress survives refresh | US-2.1 (fourth scenario) |
| NFR-2.4 fixture fallback | US-5.1 |
| NFR-4.1 deterministic | US-3.1, US-5.1 |
| NFR-4.2 nothing slow on visible path | US-2.1, US-5.1 |

NFR-1.1 and NFR-1.6 (credentials in environment variables, `.env` gitignored) have no story citation. They are build and repository hygiene with no runtime user-visible surface, satisfied at Code Generation.

## INVEST verification

| Story | I | N | V | E | S | T | Note |
|---|---|---|---|---|---|---|---|
| US-1.1 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Absorbed the model-failure scenario from the removed US-1.2 |
| US-2.1 | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | ✅ | Largest story. Now coupled to discovery by design, since the level-up presents it |
| US-3.1 | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | Grew with the basic/advanced tiering. Five scenarios, the most of any story |
| US-3.2 | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | Depends on US-3.1 producing a skill. Sequencing, not coupling |
| US-3.3 | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | Same dependency |
| US-3.4 | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | Same dependency |
| US-4.1 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Simplified by change 6 |
| US-4.2 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | |
| US-5.1 | ⚠️ | ✅ | ✅ | ✅ | ⚠️ | ✅ | Depends on all epics by nature. Acceptable: a run-of-show, not a unit of work |

Independence warnings are recorded rather than engineered away. Three Discovery stories genuinely require a skill to exist first, and splitting them differently to score better on independence would produce less honest stories.

US-2.1 gained a negotiability warning in this revision: its first scenario is now bound to discovery, so it can no longer be renegotiated independently of the Skill Discovery epic. That is the direct consequence of change 5 and is accepted rather than worked around.
