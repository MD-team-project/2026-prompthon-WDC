# Requirements Clarification Questions (Round 2)

**Stage**: INCEPTION - Requirements Analysis (Step 6, follow-up round)
**Created**: 2026-08-19T07:52:08Z
**Status**: COMPLETE - all questions answered as of 2026-08-19T08:49:33Z. Q1-Q16 answered by the user, Q17 and Q18 resolved by user directive to presume agent-autonomous discovery. Requirements Analysis proceeded to Step 7 and generated `requirements.md`.

## What I received

Round 1 is complete. Captured:

| Item | Answer | Reading |
|---|---|---|
| Section 0 | LG product characterization with AI | AI agent + character bound 1:1:1 to each LG product; chat/voice replaces settings UI; usage data drives skill discovery; exp/leveling makes it feel self-improving |
| Q1 | E and F, but in a web browser | AI agent app, mobile-shaped, running in a browser |
| Q2 | A - AWS central | Bedrock, storage, Polly, EC2 |
| Q3 | C | Hackathon judges and demo audience |
| Q4 | B | Hackathon demo, must survive a live run |
| Q5 | B | TypeScript / Node.js |
| Q6 | E | Persistence undecided |
| Q7 | D | Auth undecided |
| Q8 | B | A day or two |
| Q9 | B | Lean workflow |
| PBT extension | B - Partial | **Accepted as-is.** PBT will be enforced only for pure functions and serialization round-trips. No clarification needed. |

The vision is clear and it is a good one. The problems below are all about fitting it into a day or two without gutting the idea.

## How to answer

Same as before: letter after the `[Answer]:` tag, `X` plus free text if nothing fits. Options marked **(recommended)** are my suggestion given a 1-2 day hackathon demo. You are free to ignore every one of them.

---

# Contradiction 1: vision scope vs. available time

Section 0 describes replacing the entire ThinQ experience: agents for every product category, self-improving skill discovery from accumulated usage data, gamified character progression, and voice plus chat control. That is a multi-month platform.

Q8 says a day or two. Q4 says it must work reliably live in front of judges.

Both cannot be true for the full vision. The fix is not to shrink the vision, it is to pick which part of it the judges actually see running, and let the rest be narrative. So:

## Question 1
Which single idea must be **visibly working** during the demo? The other parts can still appear in the UI, just backed by fixtures rather than real logic.

A) **Agentic control** - judges talk or type to a character and a device actually changes state, no settings screens anywhere **(recommended: it is the most legible on stage and the least likely to fail)**

B) **Character progression** - exp, levels, personality shifting as the product is used; control and skill discovery are mocked

C) **Skill discovery** - the agent reads seeded usage history and proposes personalized skills the user never configured; control is mocked

D) **The 1:1:1 relationship** - a roster of several products each with its own distinct character and memory; depth per character stays shallow

E) A and C together, with progression as a visible-but-faked number

X) Other (please describe after [Answer]: tag below)

[Answer]: X - All of A, B and C, unified by a single LangGraph agent rather than picking one. Verbatim: "Agent with langgraph states should cover all the idea. create_agent(state->B covered, middleware or workflow integration: A and C covered)". Mapping: graph state holds character progression (B); tools plus middleware/workflow integration deliver agentic control (A) and skill discovery (C). Recorded via chat, 2026-08-19T08:03:41Z.

**Consequence**: LangGraph plus LangChain v1 `createAgent` with middleware is now a stated architectural decision, not just a scope answer. Verified available in TypeScript, so Q5 (TS/Node) is unaffected. See Q16 for the residual depth question this raises.

## Question 2
How many products and characters exist in the demo?

A) 1 - one product, one character, maximum depth

B) 2-3 - enough to show the 1:1:1 relation and contrast personalities **(recommended)**

C) 4-6 - shows category breadth across beauty, life, and niche

D) Many - a full catalog-style roster

X) Other (please describe after [Answer]: tag below)

[Answer]: B - 3 products. Verbatim: "3". Recorded via chat, 2026-08-19T08:03:41Z.

## Question 3
Section 0 mentions beauty, life, and niche products. Which concrete products should the demo use? This drives the character designs and the fake telemetry.

A) You pick for me based on what demos well **(recommended)**

B) Styler plus air conditioner plus refrigerator (mainstream, judges recognize them instantly)

C) Beauty-first: Pra.L derma device plus styler

D) Deliberately niche to make the point: shoe case, wine cellar, pet dryer

X) Other (please list the products after [Answer]: tag below)

[Answer]: X - Pra.L, ShoeCase, Massage Chair. Verbatim: "Pra.L, ShoeCase, Massage Chair". Recorded via chat, 2026-08-19T08:03:41Z. Covers the three categories from Section 0: beauty (Pra.L), life/niche (ShoeCase), wellness (Massage Chair). Consistent with Q2 = 3.

## Question 16 (follow-up to Q1)

Choosing "all three pillars via one LangGraph agent" settles the architecture but not the budget. One graph is the right container for all three, and it does remove the duplicated plumbing that picking three separate approaches would have cost. What it does not remove is that each pillar still needs building. Three products multiplied by three pillars in one to two days is the residual risk.

### The three pillars, defined

**Pillar 1 - Agentic Control.** The claim from Section 0 that there are no more little buttons or bars. The user states an intent in chat or voice, the agent resolves it to concrete device actions, and the UI reflects the new device state. This is the pillar that makes the product feel like a product rather than a chatbot.

- *Thin*: three or four tools per device, single-turn commands, mock device layer. "Start a 30 minute shoe dry" works. Roughly the cost of writing nine to twelve tool definitions plus a device state reducer.
- *Deep*: multi-step plans, the agent asking a clarifying question when intent is underspecified, scheduling and conditional actions, cross-device orchestration, confirmation before anything destructive or expensive.

**Pillar 2 - Character Progression.** The gaming layer. Graph state carries exp, level, and personality for each character, and using the product visibly advances it.

- *Thin*: exp increments per interaction, level derived from exp, one threshold crossing visible during the demo, and the character's tone shifts because level is injected into the prompt. Roughly a reducer, a threshold table, and a prompt variable.
- *Deep*: several levels with genuinely distinct personality profiles, memory of past interactions shaping later replies, characters diverging in personality based on how each product was used, cosmetic or visual evolution.

**Pillar 3 - Skill Discovery.** The actual differentiator against today's ThinQ, and the source of the self-improving impression from Section 0. Accumulated usage is analysed and the agent proposes a personalized skill the user never configured.

- *Thin*: one batch analysis pass over the seeded history, the model picks one or two skills per device out of a fixed candidate pool, the user accepts, and the accepted skill becomes a callable tool. Bounded and predictable, which also makes it safe to demo.
- *Deep*: open-ended skill synthesis where the agent composes new skill definitions rather than selecting from a pool, continuous re-analysis as new usage arrives, skills refined across iterations, and conflict detection between overlapping skills.

### The tradeoff

All three thin is comfortably inside one to two days. Any one of them deep is roughly the same cost again as the other two thin combined, because depth in each case means either planning loops, real memory, or open-ended generation, and all three of those bring their own failure modes to debug on a deadline.

Which allocation?

A) Thin but real across all three - nothing deep, but no pillar is faked **(safest inside the clock)**

B) One pillar deep, the other two thin but real - name which one. **If choosing B, Skill Discovery is the one worth the depth**: it is what separates this from the existing ThinQ app, Control is table stakes that only needs to work, and Progression reads on screen from a number and a tone change without needing depth **(recommended)**

C) All three deep - accept the overrun past one to two days

X) Other (please describe after [Answer]: tag below)

[Answer]: B - Skill Discovery deep, the other two not deep, with per-pillar refinements. Verbatim: "Character Progression -> thin, more focused on UI/UX than actual agent implementation. Skill Discovery -> Deep, should be able to control the agents to discovery meaningful skill by itself with no human intervention once it runs. VERY IMPORTANT Agentic Control -> This is just simple GPT like features so nothing thin or deep just plain it is, just basic prompting, tools, states for products." Recorded via chat, 2026-08-19T08:16:44Z.

### Resulting per-pillar depth contract

**Skill Discovery - DEEP, and explicitly autonomous. Flagged by the user as VERY IMPORTANT, so this is the primary pillar of the build.** Once a discovery run starts it completes without human intervention: no approve-this-skill prompt, no human-in-the-loop gate. The agent decides what is meaningful on its own. Note that this supersedes the *thin* definition drafted above, which had included a user-accepts step - that step is now removed by explicit instruction.

**Character Progression - THIN, and re-scoped toward presentation.** The user's emphasis is UI and UX rather than agent internals. Exp, level, and the visible sense of growth are a presentation layer over simple counters. Progression logic stays minimal: increment, derive level, render well. No personality engine, no memory system, no divergence modelling.

**Agentic Control - BASELINE, deliberately unremarkable.** The user's words: simple GPT-like features, basic prompting, tools, and states per product. Not thin as a compromise, but plain by intent. It needs to work convincingly and nothing more, so it should consume the least build time of the three.

### Skill lifecycle: autonomous creation, human-guided revision

Refined by user directive at 2026-08-19T08:21:30Z: "But there can be a help or guide(feedback) from an user for revision".

The autonomy applies to **creation**, not to the whole lifecycle. There is no gate in front of a skill being born, but the user can steer it afterwards. Settled lifecycle:

1. **Discover** - the agent decides, unprompted and without human intervention, that a skill is worth creating, based on accumulated usage. Nothing blocks this.
2. **Announce** - the character tells the user in chat what it made and why, and the skill appears in that character's skill list.
3. **Revise (optional)** - the user can give natural-language feedback such as "too early in the morning", "only on weekdays", or "stop suggesting this", and the agent revises the skill's composition or trigger, or retires it.
4. **Refine over iterations** - later usage plus any accumulated feedback informs the next discovery pass, which is the "refined in every iteration" line from Section 0.

Two things follow. First, feedback is **optional and post-hoc**: if no one says anything, the skill stands as created, so the autonomy claim holds and an unattended demo still works. Second, this is a strong demo beat and a cheap one: the agent invents something on its own, a judge pushes back in one sentence, and the skill visibly changes. It exercises the deep pillar without needing a planning loop.

### Consequence for Q7

Autonomously synthesized skills become callable tools that act on devices, and step 3 means user-authored feedback text now also shapes what those tools do. That makes the input-validation and prompt-injection items on the Q7 list load-bearing rather than box-ticking. The Q18 answer contains most of the risk already, since a skill can only reference tools that exist, but the guard on feedback text still matters.

## Question 17
With no human approval step, how do judges actually witness a discovery happening? Previously the accept prompt was what made it visible. Something has to replace it, and this is where Progression's UI focus and Skill Discovery's autonomy meet.

A) The character announces it in chat, unprompted - "I noticed you always dry your running shoes after evening runs, so I made an Evening Run Care routine"

B) A skills list on the character screen that visibly grows, judges watch the count change

C) A discovery run is triggered live on stage and results stream in as they are found

D) A and B together - announced in chat, and permanently visible in the character's skill list **(recommended: the announcement makes it legible in the moment, the list makes it durable for the rest of the demo)**

E) A, B and C together

X) Other (please describe after [Answer]: tag below)

[Answer]: D - resolved by assumption, not asked. User directive at 2026-08-19T08:19:02Z: "I meant you should presume that skills are discovered by agents itself". Taken as an instruction to stop querying this pillar and presume agent-autonomous discovery. Default applied: the character announces each discovery unprompted in chat, and the skill persists in that character's skill list. Override at any time.

## Question 18
What is a discovered skill, concretely? This matters because an autonomously generated skill has to be executable. If the agent invents a skill referring to a capability that does not exist, invoking it fails, and that failure lands live on stage.

A) A composition over the existing device tool vocabulary plus a trigger condition. Open-ended in what it composes, bounded in what it can reference, so every generated skill is executable by construction **(recommended)**

B) A free-form natural language instruction that the agent re-interprets each time it runs. Maximum flexibility, but the same skill can behave differently on different runs

C) Generated code that gets executed. Most powerful and least safe, and needs a sandbox

D) A parameterized selection from a fixed skill template library. Safest, but arguably not genuine discovery, and probably too weak given this pillar is the priority

X) Other (please describe after [Answer]: tag below)

[Answer]: A - resolved by assumption, not asked, per the same directive as Q17. A discovered skill is a composition over the existing device tool vocabulary plus a trigger condition. Open-ended in what it composes, bounded in what it can reference, so every generated skill is executable by construction and nothing hallucinated can reach a device call. This representation also happens to be the one that survives revision cleanly, which matters given the feedback loop recorded below: a composition can be edited in place, whereas free-form text or generated code would have to be regenerated wholesale.

---

# Contradiction 2: "decide during design" vs. lean workflow

Q6 (persistence) and Q7 (auth) were both answered "decide during design". But Q9 chose Lean, which skips the conditional design stages. If I honor both answers literally, nothing ever decides them and Code Generation improvises. Two ways out: decide now, or keep one design stage. Questions 4 and 5 decide now. Question 6 offers the alternative.

## Elaboration, written after the Conflict 1 answers

Expanded on request, 2026-08-19T08:26:15Z. The Conflict 1 answers changed this conflict materially, so this section restates it against what is now known rather than against the original vague version.

### What actually needs storing

Seven distinct things, and they do not all want the same treatment:

| # | Data | Volatility | Size | Notes |
|---|---|---|---|---|
| 1 | Conversation thread state | Written every turn | Small | This is LangGraph checkpointer territory. Three threads, one per character. |
| 2 | Character progression: exp, level | Written every interaction | Tiny | Hot path. Read on every screen render. |
| 3 | **Discovered skills**: composition, trigger, provenance, revisions | Written on discovery and on revision | Small | **The crown jewel.** This is the output of the deep pillar. |
| 4 | Device state: power, mode, timers for the three products | Written on every control action | Tiny | Mock device layer's current state. |
| 5 | Seeded usage history | Written once, read many | Moderate, roughly 60 days times 3 products | Fixture data, not runtime state. Belongs in the repo, not a database. |
| 6 | Feedback log: user revision instructions | Written occasionally | Tiny | Feeds the next discovery pass per the lifecycle. |
| 7 | Polly audio output | Per utterance | Large-ish blobs | Can be streamed to the client and never stored at all. |

The useful observation is that rows 1 to 4 and 6 are runtime mutable state that needs a store, row 5 is a fixture that wants to be a committed JSON file, and row 7 probably wants no persistence whatsoever. Treating all seven as one storage problem is what makes this question feel harder than it is.

### Why the stakes went up

Two of the Conflict 1 answers bear directly on this.

**Skill Discovery is now the deep, VERY IMPORTANT pillar.** That means the demo's value accumulates in row 3. If storage is in-memory and anybody restarts the process, the discovered skills evaporate, which is precisely the thing the demo is built to show. That materially weakens the in-memory option that would otherwise be the fastest path.

**Progression lives in LangGraph state.** That is what pulls the checkpointer into the question. In TypeScript the first-party checkpoint savers are the in-memory one plus SQLite and Postgres; DynamoDB exists as a community package. So "DynamoDB for everything" quietly implies either adopting a community saver or writing one, on a 1-2 day clock.

The clean way out is to stop conflating the two. Let the checkpointer handle conversation threads only, where losing history on restart is tolerable, and put rows 2, 3, 4 and 6 in a plain domain store that you control. That decouples the storage decision from LangGraph entirely and leaves Q4 answerable on its own merits.

### Q5 depends on Q12

Auth is close to meaningless if Q12 lands on localhost, since there is nothing exposed to protect. It becomes real the moment there is a public URL. So Q5 is best read as conditional on Q12, and the honest framing is: what is the minimum that stops a public demo URL being wide open, if there even is one.

There is a second, quieter question hiding inside Q5, which is whether a user identity concept exists at all. Character state is per-user in principle. For a three-character demo a single hardcoded user id is sufficient, and that is the assumption unless auth says otherwise.

### Q6: the evidence has moved

When Lean was chosen, the project looked like a chat app over three mock devices. It no longer does. Deep autonomous skill discovery brings a genuine data-modelling problem with it: the skill representation, the trigger vocabulary, how provenance is recorded, how a revision mutates an existing skill, what the discovery pass actually reads and emits, and how graph state is shaped so progression and skills coexist. That is exactly the class of work Functional Design exists to do, and improvising it during Code Generation is how the crown-jewel pillar ends up incoherent.

NFR Design and Infrastructure Design remain fair to skip. A localhost demo with the lite NFR lists from Conflict 3 does not need either. So the recommendation on Q6 has shifted from A to B since it was first written, and the reason is the change in evidence, not a change of heart about Lean.

**Knock-on from the Q1 answer**: putting character progression in LangGraph state turns Q4 partly into a checkpointer question. In TypeScript the maintained checkpoint savers are the in-memory one plus SQLite and Postgres; DynamoDB support exists but as a community package rather than a first-party JS one. That does not rule out DynamoDB, it just means either a community saver or a hand-rolled one. The cleaner split, and my recommendation, is to keep the LangGraph checkpointer for conversation thread state only and hold character, exp, and skills in a plain domain store, which leaves Q4 free to be answered on its own merits.

## Question 4
Persistence. What stores character state, exp, unlocked skills, chat history, and seeded usage data?

Options revised after the elaboration above. Option E is new and is now the recommendation, replacing the original A.

A) DynamoDB for everything including LangGraph checkpointing, plus S3 for generated audio - keeps the AWS-central story, but inherits the community-checkpointer problem

B) In-memory plus JSON files on disk - fastest to build, but a restart wipes discovered skills, which is the one thing this demo cannot afford to lose

C) DynamoDB plus S3 plus a vector store for retrieval over usage history - only worth it if the seeded history is large enough that the discovery pass cannot just read it all, which at 3 products it almost certainly is not

D) Postgres or Aurora - has a first-party LangGraph saver in TypeScript, but is the heaviest thing to stand up for a two-day build

E) **Split by purpose (recommended)**: seeded usage history as committed JSON fixtures in the repo; DynamoDB for the domain store holding character progression, discovered skills, device state, and the feedback log; the in-memory checkpointer for conversation threads, since losing chat scrollback on restart is tolerable while losing skills is not; Polly audio streamed to the client and never persisted. Preserves the AWS-central narrative for the parts that matter, avoids the community-checkpointer detour, and needs no S3 bucket

X) Other (please describe after [Answer]: tag below)

[Answer]: E - split by purpose. Verbatim: "E". Recorded via chat, 2026-08-19T08:34:02Z. Settled storage layout: seeded usage history as committed JSON fixtures in the repo; DynamoDB as the domain store for character progression, discovered skills with provenance and revisions, device state, and the feedback log; LangGraph in-memory checkpointer for conversation threads, accepting that chat scrollback is lost on restart while skills and progression survive; Polly audio streamed to the client and never persisted, so no S3 bucket is needed.

## Question 5
Auth and access control.

Read this together with Q12. If the demo runs on localhost, A is the only sensible answer and B and C are solving a problem that does not exist. A single hardcoded user id is assumed either way, so that character state has an owner.

A) None - one hardcoded demo user, the app opens straight into the roster **(recommended, and effectively forced if Q12 is localhost)**

B) A shared passcode on entry so a public demo URL is not wide open - the answer if Q12 deploys anywhere public

C) Cognito hosted login with real accounts

X) Other (please describe after [Answer]: tag below)

[Answer]: A - no auth, one hardcoded demo user. Verbatim: "A". Recorded via chat, 2026-08-19T08:34:02Z. The app opens straight into the character roster. A single fixed user id owns all character state, so the DynamoDB partition key still has a real owner and the data model does not need reshaping if auth is added later.

**Note**: this answer presumes Q12 lands on localhost. If Q12 turns out to be EC2 or Lambda with a public URL, revisit - a public URL with no auth exposes an endpoint that makes Bedrock calls on demand, which is a cost and abuse surface, not just an access one.

## Question 6
Given that Q4 and Q5 are now decided here, is the Lean workflow still what you want?

Recommendation changed from A to B after the Conflict 1 answers, for the reason in the elaboration above: deep autonomous skill discovery carries a real data-modelling problem, and Lean would leave it to improvisation during Code Generation.

A) Yes, stay Lean - skip Functional Design, NFR Design, and Infrastructure Design; go from Workflow Planning to Code Generation

B) Keep Functional Design only, still skipping NFR Design and Infrastructure Design - the skill representation, trigger vocabulary, provenance, revision semantics, and graph state shape get designed before any code is written **(now recommended)**

C) Switch to full rigor after all

X) Other (please describe after [Answer]: tag below)

[Answer]: B - keep Functional Design only. Verbatim: "B". Recorded via chat, 2026-08-19T08:41:19Z. Workflow shape: Requirements Analysis, User Stories (assessment pending), Workflow Planning, Functional Design, Code Generation, Build and Test. NFR Design and Infrastructure Design skipped. This resolves Contradiction 2 completely: Q4 and Q5 were decided here rather than deferred, and Functional Design now exists as the stage that designs the skill model before code is written.

---

# Contradiction 3: extension opt-ins are not yes or no

Your answers were "Balanced approach, simple guardrail and security that can be easily implemented should exist (LITE)" and "Balanced, code should follow YAGNI".

I cannot record those directly. The extension mechanism is binary: enabled means every rule in the baseline becomes a blocking constraint that must be satisfied before any stage completes, disabled means the ruleset is never loaded. There is no built-in lite mode.

There is a way to get what you asked for, which is option B in both questions below: leave the baseline off, and instead write a short, explicit, named set of guardrails into `requirements.md` as ordinary non-functional requirements. They then get implemented like any other requirement, without turning 15 practice areas into blocking gates on a two-day build.

## Question 7
Security.

A) Enable the full security baseline as blocking constraints - thorough, and it will add review gates at every stage

B) Disable the baseline, and instead commit to this explicit lite guardrail list as normal NFRs **(recommended, and closest to what "LITE" sounded like)**:
   - AWS credentials and API keys in environment variables only, never in source or the client bundle
   - Bedrock calls go through a server-side route, so no model credentials ever reach the browser
   - Input validation and length caps on every chat and voice payload
   - A prompt-injection guard on user text before it reaches the model, since users are typing free text into an agent that controls devices
   - No PII or raw chat content in logs
   - `.env` stays gitignored, `.env-example` documents the shape

C) Disable, and skip security NFRs entirely

X) Other (please describe after [Answer]: tag below)

[Answer]: B - security baseline DISABLED, the six lite guardrails carried as ordinary NFRs. Verbatim: "B". Recorded via chat, 2026-08-19T08:41:19Z. `security-baseline.md` will not be loaded and its rules are not blocking constraints. The six items above become numbered non-functional requirements in `requirements.md` and are implemented like any other requirement. The prompt-injection guard now also covers the skill-revision feedback text, per the Conflict 1 lifecycle.

## Question 8
Resiliency. Note that "code should follow YAGNI" is already enforced independently by the ponytail rules in this workspace, so answering B here does not lose you that.

A) Enable the full resiliency baseline, all 15 practice areas, as blocking constraints

B) Disable the baseline, and instead commit to this lite list as normal NFRs **(recommended)**:
   - Timeout and a single bounded retry on every Bedrock and Polly call
   - A visible graceful fallback when a model call fails, so a failed call never blanks the screen mid-demo
   - Character state persisted after each interaction, so a mid-demo refresh does not lose progress
   - Seeded fixtures always available as a fallback path if live AWS calls fail on venue wifi

C) Disable, and skip resiliency NFRs entirely

X) Other (please describe after [Answer]: tag below)

[Answer]: B - resiliency baseline DISABLED, the four lite items carried as ordinary NFRs. Verbatim: "B". Recorded via chat, 2026-08-19T08:41:19Z. `resiliency-baseline.md` will not be loaded and its 15 practice areas are not blocking constraints. The four items above become numbered non-functional requirements. Note that the third item, persisting state after each interaction, is already satisfied by the Q4 = E storage split, since progression and skills live in DynamoDB rather than in the volatile checkpointer.

---

# Ambiguities

## Question 9
Voice. You listed Polly, which is text-to-speech, so the character can speak. Voice *input* needs a separate speech-to-text path, and you did not mention one.

A) Browser Web Speech API for input, Polly for output - zero infrastructure, works in Chrome, which is almost certainly the demo browser **(recommended)**

B) Amazon Transcribe streaming for input, Polly for output - fully AWS-native, more setup and a websocket to babysit

C) Text input only, Polly voice output - the character speaks but does not listen

D) Text only both ways, no Polly

X) Other (please describe after [Answer]: tag below)

[Answer]: A - Web Speech API in, Polly out. Verbatim: "A(meaning polly will handle voice and text goes into agent right? like voice mode, if not explain if yes continue)". Recorded via chat, 2026-08-19T08:41:19Z.

**Your reading is correct.** The agent itself is text-in, text-out and never touches audio. Voice is a shell wrapped around it:

1. Browser Web Speech API transcribes the user's speech to text in the client.
2. That text is posted to the agent exactly as if it had been typed. The graph, tools, and state are identical either way.
3. The agent returns text.
4. Polly converts that text to audio, which the client plays.

The consequence worth stating explicitly: **voice mode adds no agent complexity at all.** It is a presentation concern on both ends, which is why it is affordable here. It also degrades cleanly - if the microphone fails or the browser lacks support, the text path is already the real path, so the fallback is simply the input box.

**One caveat, flagged not blocking**: Chrome's Web Speech API performs recognition server-side on Google infrastructure, so user audio leaves the machine and does not stay within AWS. Given Q2 said AWS-central, this is the one place the stack is not AWS. For a hackathon demo this is almost certainly irrelevant, but if AWS-native purity matters for judging, switching input to Amazon Transcribe streaming (option B) is the consistent choice at the cost of a websocket to manage. Staying with A unless told otherwise.

## Question 10
"Accumulated user data from products" is central to skill discovery, but there are no real LG devices attached to this workspace. Where does that data come from?

A) Pre-seeded synthetic history committed to the repo, for example sixty days of plausible usage per product **(recommended: deterministic, so the demo behaves identically every run)**

B) A simulator that emits usage events live while the demo runs, so judges watch exp accumulate in real time

C) Real ThinQ API data - you have credentials and can share them

D) A and B together: seeded history for depth, plus a simulator button to trigger a live event on stage

X) Other (please describe after [Answer]: tag below)

[Answer]: A - pre-seeded synthetic history committed to the repo. Verbatim: "A". Recorded via chat, 2026-08-19T08:41:19Z. Roughly 60 days of plausible usage per product for Pra.L, ShoeCase, and Massage Chair, as committed JSON fixtures per the Q4 = E split. Deterministic, so the discovery pass behaves identically on every run, which matters a great deal given discovery is the deep pillar and is being demoed live.

**This fixture is load-bearing.** Autonomous discovery can only find patterns that the seeded data actually contains. If the fixture is generated as uniform random usage, the agent will correctly find nothing interesting and the headline pillar will fall flat. The fixture therefore has to be authored with deliberate latent patterns for the agent to find - for example evening-clustered ShoeCase runs following a recurring weekday routine, Pra.L sessions concentrated on particular weekdays, Massage Chair use spiking after those same evenings. The agent discovers these unaided; the point is only that they must be there to be discovered. Treating this as throwaway test data would undermine the pillar the whole build is organised around.

## Question 11
Device control. When a character is told "dry my shoes for thirty minutes", what actually happens?

A) A mock device layer, in-process, and the UI reflects the new state **(recommended)**

B) A mock device layer behind a clean interface, so a real ThinQ adapter could be dropped in later without touching agent code

C) Real ThinQ API calls against real hardware

X) Other (please describe after [Answer]: tag below)

[Answer]: Pending - definition requested. Verbatim: "define swappable interface". Recorded via chat, 2026-08-19T08:41:19Z. Definition below; answer still needed.

### What "swappable interface" means concretely

One TypeScript interface that everything device-related goes through, with exactly one implementation today:

```typescript
interface DeviceAdapter {
  // What can this device do? Returns the vocabulary skills are composed from.
  listCapabilities(deviceId: string): Promise<Capability[]>;

  // Current state: power, mode, timers, whatever the device exposes.
  getState(deviceId: string): Promise<DeviceState>;

  // Apply one command, return the resulting state.
  applyCommand(deviceId: string, command: Command): Promise<DeviceState>;
}
```

`MockDeviceAdapter` implements it now, holding state in DynamoDB per the Q4 split. A `ThinQDeviceAdapter` could implement it later. Agent code, tools, and the discovery pass depend only on the interface, never on the mock.

### The honest case for B over A

If the only argument were "we might connect real ThinQ someday", YAGNI says pick A and don't build the seam. Speculative future-proofing is not a good enough reason.

The actual reason is `listCapabilities`. Skill discovery generates compositions over the device tool vocabulary, and per the Q18 answer that vocabulary must be bounded so generated skills are executable by construction. That vocabulary has to be enumerable from somewhere at runtime. Once it is enumerable, the seam already exists whether or not you call it an interface, because the agent is no longer reaching into a hardcoded tool list. So the difference between A and B collapses to roughly one file and a constructor argument.

Put plainly: the capability-enumeration part is needed regardless because the deep pillar depends on it. B just names the thing that is already there. A is fine if you would rather not name it.

### Revised options

A) Mock device layer, tools hardcoded against it, capability list also hardcoded

B) Mock device layer behind `DeviceAdapter`, capability vocabulary enumerated through `listCapabilities` and fed to skill generation **(recommended, and the increment over A is about one file)**

C) Real ThinQ API against real hardware

X) Other (please describe after [Answer]: tag below)

[Answer]: B - mock device layer behind the `DeviceAdapter` interface, capability vocabulary enumerated via `listCapabilities` and fed to skill generation. Verbatim: "B". Recorded via chat, 2026-08-19T08:49:33Z. `MockDeviceAdapter` is the only implementation built. No ThinQ adapter is written, and none is stubbed either - the interface exists because skill generation needs an enumerable capability vocabulary, not to reserve space for a future adapter.

## Question 12
Hosting. Q2 mentioned EC2, which conflicts a little with a 1-2 day build, since deploying and debugging on EC2 usually costs a meaningful slice of that time.

A) Runs locally on localhost, calling Bedrock, Polly, and DynamoDB over the AWS SDK **(recommended: no deploy risk, and localhost demos fine from a laptop)**

B) Deployed to EC2 as originally planned

C) Serverless: Lambda, API Gateway, and static hosting

D) Local first, deploy to EC2 only if time is left over

X) Other (please describe after [Answer]: tag below)

[Answer]: D - local first, EC2 only if time remains. Verbatim: "D". Recorded via chat, 2026-08-19T08:41:19Z.

**Consequence for Q5**: deployment is now conditional rather than planned, so it sits outside the committed scope and localhost is the assumed demo target. That keeps Q5 = A (no auth) valid for the committed build. But because deployment is possible rather than excluded, one conditional NFR is added rather than leaving it implicit: *if the application is deployed to any publicly reachable URL, a shared passcode gate is required before it accepts requests.* The reason is cost and abuse rather than privacy - an open endpoint that invokes Bedrock on demand can be run up by anyone who finds it. This keeps the fast path fast without leaving an unauthenticated Bedrock proxy on the internet if the deploy does happen late at night.

## Question 13
Confirming my reading of Q1: "E and F, but using Web browser".

A) A mobile-viewport web app, phone-shaped, opened in a desktop browser for the demo; no native app **(my reading)**

B) A responsive web app shown full-width on a desktop

C) A real native mobile app after all

D) A web app opened on an actual phone browser during the demo

X) Other (please describe after [Answer]: tag below)

[Answer]: A - browser app with mobile-friendly UI/UX. Verbatim: "browser app with mobile friendly UI/UX". Recorded via chat, 2026-08-19T08:41:19Z. A responsive web application, designed mobile-first and comfortable at phone viewport widths, running in a normal browser. No native app, no app store, no React Native. It will demo fine either in a desktop browser at a narrow viewport or on an actual phone, so the choice of demo device stays open rather than being baked into the build.

## Question 14
Demo language. This affects the Polly voice, the character personalities, and every prompt.

A) Korean throughout, Korean Polly voice

B) English throughout, English Polly voice

C) Korean UI and voice, with an English toggle for judges who need it

D) English UI, Korean voice

X) Other (please describe after [Answer]: tag below)

[Answer]: C - Korean primary with an English toggle. Verbatim: "C". Recorded via chat, 2026-08-19T08:41:19Z. Korean UI and Korean Polly voice as the default, with a toggle switching UI strings, agent output language, and Polly voice to English.

**Cost flag, not a challenge to the answer.** This is the one answer in the set that adds build cost without adding demo capability, since it duplicates authoring rather than creating a new behaviour: UI strings in two languages, character personas written twice or written once and translated at runtime, prompt instructions that pin output language, and a Polly voice per language. On a 1-2 day clock with Progression already scoped as UI-heavy, that competes directly for the same hours.

Suggested scoping to keep C affordable, to be confirmed during Functional Design rather than re-asked here:
- UI strings: a small key-value dictionary for both languages. Cheap and worth doing properly.
- Character personas: authored once in Korean, with the output language pinned by a prompt instruction rather than maintaining two persona documents. Avoids the duplication that makes bilingual expensive.
- Polly: one voice per language, for example a Korean neural voice as default and an English one behind the toggle.
- Seeded fixture data: language-neutral. Timestamps and device events carry no prose, so nothing to duplicate.
- Discovered skill names and descriptions: generated in whichever language is active at discovery time, and left as generated rather than translated retroactively.

## Question 15
Character progression is the mechanic that makes this feel like a game rather than a settings app. What does "exp gained" concretely reward?

A) Exp unlocks new skills the agent can perform, at thresholds **(recommended: most legible on stage)**

B) Exp changes the character's personality and tone, so it talks differently at higher levels

C) Exp unlocks cosmetic evolution, the character's appearance changes

D) All three, shallowly

X) Other (please describe after [Answer]: tag below)

[Answer]: A and C - exp unlocks skills at thresholds, and exp drives cosmetic evolution. Verbatim: "A and C". Recorded via chat, 2026-08-19T08:41:19Z. Explicitly excludes B, so personality and tone do not change with level, which is consistent with Progression being scoped as thin and presentation-focused rather than as an agent-behaviour concern.

This pairing is coherent with the earlier answers. A ties progression directly to the deep pillar, since levelling is what gates discovered skills becoming available. C is the visible reward, and it belongs to the UI/UX emphasis chosen for Progression in Q16.

**Open item: cosmetic evolution needs an asset strategy.** C is the only answer in the set that implies visual assets, and three products times several levels is a meaningful number of character images with no designer in the loop. This does not need re-asking now, but it does need deciding in Functional Design, so it is recorded here as an open decision with the options as I see them:

- **Pre-generated static assets (favoured)**: generate character art per product per level ahead of time with an image model, commit the results, and select by level at render time. Deterministic, zero runtime cost, zero live-demo risk, and it looks the most polished.
- **CSS-tier evolution**: one base illustration per character, with level expressed through frame, aura, colour, badge, or accessory. Cheapest by a wide margin and still legible on stage.
- **Runtime generation**: generate on level-up. Rejected as a default - it puts a slow, non-deterministic image call on the demo's critical path at the exact moment the audience is watching.

### S3 for character assets

User note, 2026-08-19T08:49:33Z: "cosmetic evolution -> might need S3". This revises the Q4 = E line that said no S3 bucket was needed, which was reasoned only from Polly audio being streamed. Character art is a second, unrelated candidate for object storage.

Where this lands: **S3 is optional for the committed build and becomes correct if the demo deploys.** For a localhost demo with art pre-generated once, the images are ordinary static files served by the web app, and putting them in a bucket adds a credential path and a network hop to something that could be a local file read. Three products at a handful of levels is roughly a dozen images, which is unremarkable to commit.

S3 becomes the right answer in three cases, and one of them is already live:
1. **The EC2 deploy from Q12 happens.** Then serving assets from a bucket rather than the app instance is the better shape. Q12 = D makes this conditional, not hypothetical.
2. Art gets regenerated often enough that committing each pass churns the repository.
3. Total asset size grows past the point where committing it is comfortable.

Decision recorded, to be implemented in Functional Design: store an **asset reference** on each character-level record in DynamoDB rather than deriving the image path in render code. Resolution of that reference is configuration - a local static path by default, an S3 URL when deployed. That is one field and one resolver, it keeps the fast local path fast, and it means adding the bucket later touches configuration rather than components. Same reasoning as the `DeviceAdapter` answer in Q11: the indirection earns its place because something has to resolve per-level art anyway, not because a bucket might appear one day.

---

## After this round

Once these are answered I will generate `aidlc-docs/inception/requirements/requirements.md` with functional requirements, the lite NFRs you selected, and the intent analysis summary, then present it for approval. I do not expect a third question round unless something here surfaces a genuine conflict.
