# Story Generation Plan

**Stage**: INCEPTION - User Stories, Part 1 (Planning)
**Created**: 2026-08-20T02:22:47Z
**Status**: All questions answered. Awaiting plan approval before Part 2 generation begins.
**Role**: Written as product owner
**Inputs**: `requirements.md`, `user-stories-assessment.md`

---

## 0. Approved decisions

All 8 questions answered as of 2026-08-20T02:44:18Z. Answer analysis found no vague, contradictory, or ambiguous responses, so no follow-up round is required.

| # | Topic | Decision |
|---|---|---|
| 1 | Personas | Two: **newcomer** and **established user**. Power user excluded - unreachable in a 1.5-day build |
| 2 | Breakdown | **Epic-Based**. Epics: Agentic Control, Character Progression, Skill Discovery, Cross-Cutting, Demo |
| 3 | Granularity | Coarse, **8-10 stories**. Timeline corrected to **1.5 days** |
| 4 | Acceptance criteria | **Given / When / Then throughout**, 3-5 criteria per story |
| 5 | Actor convention | **Hybrid** - agent-as-actor inside Skill Discovery, human elsewhere |
| 6 | NFR treatment | **Constraints cited on affected stories**, no NFR epic. User-visible resiliency items become failure-path criteria |
| 7 | Demo stories | **Small Demo epic**, doubles as run-of-show |
| 8 | Language / depth | **English documents**, **brief personas** |

Story volume will be weighted to the depth contract: Skill Discovery heaviest, Agentic Control lightest, Progression thin and focused on what is seen rather than computed.

## 1. Approach

Convert `requirements.md` into user-centered stories with acceptance criteria, plus personas. The 8 functional requirement groups and 5 non-functional groups already define *what the system does*. Stories restate that as *what a person experiences*, which is where the primary pillar most needs sharpening: autonomy is easy to state as a rule and hard to state as a moment.

Two constraints shape this plan:

- **Timeline is 1-2 days.** Stories must be tight enough to be worth writing. This plan therefore asks about granularity up front rather than defaulting to exhaustive coverage.
- **The depth contract is already settled.** Skill Discovery deep, Progression thin, Control baseline. Story volume should mirror that allocation rather than treating the three pillars evenly.

---

## 2. Story breakdown options

Presented with trade-offs, as required. Question 2 in section 3 selects one.

| Approach | How it organizes | Benefit here | Cost here |
|---|---|---|---|
| **User Journey-Based** | Stories follow workflows end to end: onboarding, first command, first discovery | Reads naturally as a demo script | Autonomous behaviour has no user-initiated journey, so discovery fits awkwardly |
| **Feature-Based** | Stories grouped by capability: chat, voice, skills, progression | Maps cleanly to implementation order | Loses the narrative that makes the demo persuasive |
| **Persona-Based** | Stories grouped by user type | Weak fit - essentially one human user type in this product | Would manufacture personas that do not really differ |
| **Domain-Based** | Stories grouped by business domain | Overkill at this size | Adds ceremony without adding clarity |
| **Epic-Based** | Hierarchical epics with sub-stories, epics being the three pillars plus cross-cutting concerns | Mirrors the depth contract exactly, so story volume naturally reflects effort allocation. Also survives being read out of order | Slightly more structure than a project this size strictly needs |

**Recommendation: Epic-Based**, with epics being Agentic Control, Character Progression, Skill Discovery, and one cross-cutting epic. The reason is fit rather than convention: the depth contract already divides this work into three unequal parts, and an epic structure is the only option that makes that inequality visible instead of flattening it. A hybrid is available - epics for structure, with the Skill Discovery epic's stories sequenced as a journey internally, since that is the one pillar where order genuinely matters to comprehension.

---

## 3. Questions

Answer with the letter after each `[Answer]:` tag. Use `X` plus free text if nothing fits. Answer here in the file, or in chat and I will transcribe.

### Question 1 - Personas

Who are the personas? Note that Progression means the same human has a meaningfully different experience at low and high level, which is persona-like without being a different person.

A) One persona: the LG product owner

B) Two: the product owner, and the hackathon judge evaluating the demo

C) Three behavioural stages of the same owner: **newcomer** (low exp, no skills yet, unsure what to say), **established user** (mid level, a few skills, has given feedback), **power user** (high level, rich skill set, expects the agent to pre-empt them) **(recommended: captures what progression actually changes, without inventing people who do not exist)**

D) One persona per product category: beauty-focused, life and niche, wellness

E) You propose personas from the requirements and I will review

X) Other (please describe after [Answer]: tag below)

[Answer]: C, minus the power user. Verbatim: "C 그 중에 파워는 제외". Recorded via chat, 2026-08-20T02:36:41Z. **Two personas**: the newcomer (low exp, no skills yet, unsure what to say to a character) and the established user (mid level, a few discovered skills, has given revision feedback at least once).

Dropping the power user is consistent with the timeline. A 1.5-day build will not reach a state where a high-level character with a rich skill set can be demonstrated, and a persona whose experience cannot be shown is a persona whose stories cannot be validated. The two retained personas map exactly onto what the demo can actually put on screen: the cold-start experience, and the state after discovery has run.

### Question 2 - Breakdown approach

Which organization from section 2?

A) User Journey-Based

B) Feature-Based

C) Persona-Based

D) Domain-Based

E) Epic-Based, epics being the three pillars plus cross-cutting **(recommended)**

F) Hybrid: Epic-Based structure, with the Skill Discovery epic sequenced internally as a journey **(recommended if you want the demo narrative preserved inside the structure)**

X) Other (please describe after [Answer]: tag below)

[Answer]: E - Epic-Based, plain. Verbatim: "E". Recorded via chat, 2026-08-20T02:36:41Z. Epics: Agentic Control, Character Progression, Skill Discovery, Cross-Cutting, and Demo (the last per Q7). Story volume per epic will reflect the depth contract rather than being spread evenly. The internal journey sequencing offered in F is not applied.

### Question 3 - Granularity

How many stories, and how large?

A) Coarse, roughly 8-12 stories, each a substantial capability **(recommended for a 1-2 day build: enough to specify, not enough to become a second requirements document)**

B) Medium, roughly 15-20 stories

C) Fine, 25 or more, each small and independently testable

X) Other (please describe after [Answer]: tag below)

[Answer]: A - coarse, roughly 8-12 stories. Verbatim: "A(2일 일정으로 정확히는 1.5일)". Recorded via chat, 2026-08-20T02:36:41Z.

**Timeline correction recorded: 1.5 days, not 1-2 days.** This is tighter than the figure `requirements.md` was written against and it tightens this stage further. Target the low end of the range, 8-10 stories, weighted toward Skill Discovery. Every story must earn its place by specifying something a person sees; anything that only restates an FR gets dropped rather than written.

### Question 4 - Acceptance criteria format

A) Given / When / Then, one scenario per criterion **(recommended: the demo is a live acceptance test, and this format converts directly into a rehearsal checklist and into test cases for the property-based testing scope)**

B) Plain bullet checklist - faster to write, looser to verify

C) Both: Given/When/Then for the Skill Discovery epic where precision matters most, bullets elsewhere

X) Other (please describe after [Answer]: tag below)

[Answer]: A - Given / When / Then throughout, all epics. Verbatim: "A". Recorded via chat, 2026-08-20T02:44:18Z. Chosen over the C compromise that was offered as the timeline-conscious option, so every story in every epic carries structured criteria. Accepted cost: roughly 2-3x the writing time of bullets. Mitigation, given 1.5 days: hold story count at the low end, 8-10, and keep criteria to 3-5 per story rather than exhaustively enumerating. Precision per story is preferred over breadth of coverage.

### Question 5 - Is the agent an actor?

This is the one genuinely awkward question in this stage. FR-3.1 and FR-3.2 describe behaviour with **no human trigger at all**. Conventional user-story form assumes a human subject, which does not fit an autonomous discovery run. Three ways to handle it:

A) Human actors only. Autonomous behaviour is phrased from the user's perspective as something they observe: "As an owner, I see my character announce a skill it made on its own"

B) The agent or character is a first-class actor for autonomous behaviour: "As the ShoeCase character, I analyse usage history and create a skill without being asked". Unconventional, but it states the autonomy directly instead of hiding it behind an observer

C) Hybrid: agent-as-actor inside the Skill Discovery epic only, human actors everywhere else **(recommended: keeps convention where convention works, and drops it precisely where it obscures the thing that matters most)**

X) Other (please describe after [Answer]: tag below)

[Answer]: C - hybrid. Verbatim: "C". Recorded via chat, 2026-08-20T02:36:41Z. Inside the Skill Discovery epic the agent or character is written as the actor, so the absence of a human trigger is stated rather than disguised. Everywhere else the human is the actor. Where a discovery story has a user-visible consequence, that consequence appears in the acceptance criteria rather than being split into a separate observer story.

### Question 6 - Non-functional coverage

The 10 lite NFRs from `requirements.md`. How should stories treat them?

A) Their own epic, one story per NFR

B) Referenced as constraints inside the stories they affect, not stories in their own right **(recommended: most of them are invisible to users, and a story with no user-visible outcome is not really a story)**

C) Only the user-visible ones become stories - graceful fallback on model failure, no blank screen, progress surviving refresh - and the rest stay constraints

X) Other (please describe after [Answer]: tag below)

[Answer]: B - referenced as constraints inside the stories they affect. Verbatim: "B". Recorded via chat, 2026-08-20T02:44:18Z. No NFR epic and no NFR stories. Each NFR is cited on the stories it constrains, by identifier, so traceability survives without manufacturing stories that have no user-visible outcome.

One consequence to handle deliberately during generation: the three user-visible resiliency items (NFR-2.2 graceful fallback, NFR-2.3 progress surviving refresh, NFR-2.4 fixture fallback when cloud calls fail) would have become stories under option C. Under B they must instead appear as **failure-path acceptance criteria on the stories they affect**, not merely as citations. Otherwise choosing B would quietly drop the failure paths the execution checklist requires, and the model-failure path in particular is one that can genuinely occur on stage.

### Question 7 - Demo-specific stories

The audience is judges, and the demo is effectively the deliverable. Should that be represented?

A) Yes, a small Demo epic covering what a judge witnesses and in what order **(recommended: it is honest about what is actually being built, and it doubles as the run-of-show)**

B) No. Stories describe the product only; the demo is a separate concern

C) No separate epic, but each story notes whether it appears in the demo path

X) Other (please describe after [Answer]: tag below)

[Answer]: A - a small Demo epic. Verbatim: "A". Recorded via chat, 2026-08-20T02:36:41Z. Covers what a judge witnesses and in what order, doubling as the run-of-show for the live demo. Kept deliberately small given the 1.5-day timeline: the judge is an audience member rather than a system user, so these stories describe the sequence and what must be visible at each beat, not new functionality.

### Question 8 - Document language and persona depth

Two small choices bundled, since they travel together.

Language of `stories.md` and `personas.md`:

A) English, consistent with all existing AI-DLC documents **(recommended)**

B) Korean

C) Both

[Answer]: A - English. Verbatim: "한국어로 대화하고 document는 영어로 작성해봐". Recorded via chat, 2026-08-20T02:29:15Z. This establishes a standing project convention rather than a one-off choice: **all AI-DLC documents and artifacts are written in English, while conversation with the user is conducted in Korean.** Note this is a documentation-language decision only and is unrelated to Round 2 Q14, which set the *product's* UI language to Korean with an English toggle. The two are independent: English specs describing a Korean-first product.

Persona depth:

D) Brief: name, role, goals, frustrations **(recommended given the timeline)**

E) Rich: adds behavioural traits, technology comfort, representative quotes, and a scenario each

[Answer]: D - brief. Verbatim: "D". Recorded via chat, 2026-08-20T02:36:41Z. Each persona gets name, role, goals, and frustrations. Frustrations will be grounded in the ThinQ problem statement from `requirements.md` rather than invented, since that problem statement is the reason the product exists.

---

## 4. Execution checklist

To be executed in Part 2 after this plan is approved. Nothing here is started yet.

**Executed 2026-08-20T02:51:07Z following plan approval.**

### Preparation
- [x] Load `requirements.md` and confirm every FR group is accounted for in the story set
- [x] Confirm the approved breakdown approach from Question 2 - Epic-Based
- [x] Confirm persona set from Question 1 - newcomer and established user, power user excluded

### Personas
- [x] Generate `aidlc-docs/inception/user-stories/personas.md`
- [x] Include archetypes and characteristics at the depth chosen in Question 8 - brief
- [x] State each persona's goals and frustrations, grounded in the ThinQ problem statement from `requirements.md`

### Stories
- [x] Generate `aidlc-docs/inception/user-stories/stories.md` - 10 stories
- [x] Organize per the approved breakdown approach - 5 epics
- [x] Write stories for the Agentic Control pillar, sized to its baseline depth - 2 stories
- [x] Write stories for the Character Progression pillar, sized to its thin depth and weighted toward what the user sees - 1 story, kept whole rather than split
- [x] Write stories for the Skill Discovery pillar, sized to its deep priority, covering discover, announce, revise, retire, and refine across iterations - 4 stories, heaviest epic
- [x] Write cross-cutting stories: voice, roster navigation, language toggle - 2 stories, roster folded into US-2.1 and US-5.1 criteria
- [x] Write demo stories if Question 7 selects A - 1 story, US-5.1 as run-of-show
- [x] Include acceptance criteria for every story in the format chosen in Question 4 - Given/When/Then, 3-4 scenarios per story
- [x] Cover the failure paths NFR-2.2 requires, so graceful fallback has a defined user-visible shape - US-1.2 dedicated to this, plus criteria on US-2.1 and US-5.1

### Quality gates
- [x] Verify every story satisfies INVEST - table included in `stories.md`. Four independence warnings and two size warnings recorded rather than engineered away, with reasoning
- [x] Map each persona to the stories it applies to - table in `personas.md`
- [x] Trace every story back to at least one FR, and flag any FR with no story covering it - coverage table plus an explicit Deliberate Gaps section naming FR-5.1, FR-5.2, FR-1.6, FR-2.6, FR-6.1, FR-6.2 and why each is intentionally unstoried
- [x] Confirm story volume across the three pillars reflects the depth contract - Discovery 4, Control 2, Progression 1
- [x] Validate content per `common/content-validation.md` before writing files - markdown, tables, and gherkin fenced blocks only; no Mermaid; no ASCII diagrams

### Close-out
- [x] Mark each step above `[x]` as completed
- [x] Update `aidlc-docs/aidlc-state.md`
- [x] Log completion in `aidlc-docs/audit.md`

---

## 5. Out of scope for this stage

Per the stage rules, this plan deliberately excludes prioritization, sprint or timeline planning, technical design of any story, and implementation detail. Those belong to Workflow Planning, Functional Design, and Code Generation respectively.
