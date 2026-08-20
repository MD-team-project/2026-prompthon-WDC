# Requirements

**Project**: prompthon
**Stage**: INCEPTION - Requirements Analysis
**Generated**: 2026-08-19T08:49:33Z
**Depth**: Standard, with comprehensive treatment of Skill Discovery as the priority pillar
**Sources**: `requirement-verification-questions.md` (Round 1), `requirement-clarification-questions.md` (Round 2), `audit.md`

---

## 1. Intent Analysis Summary

| Attribute | Value |
|---|---|
| **User request** | "Use AI-DLC", followed by a product description gathered across two question rounds |
| **Request type** | New Project (greenfield) |
| **Scope estimate** | System-wide - a complete new application, no existing code |
| **Complexity estimate** | Moderate overall, Complex in the Skill Discovery pillar |
| **Project type** | Greenfield. Workspace contained no source, no build manifest, no prior state |
| **Quality bar** | Hackathon demo that must survive a live run, may evolve later |
| **Timeline** | 1-2 days |
| **Audience** | Hackathon judges and demo audience |

### Product vision

An AI-characterized companion layer over LG products. Every product is paired one-to-one-to-one with an AI agent and a character. Talking or typing to that character replaces the settings screens that today's ThinQ app is built from. As a product is used, its character gains experience, and the agent autonomously discovers personalized skills from accumulated usage data, producing the impression of a product that improves itself rather than one that waits to be configured.

### Problem statement

The current ThinQ app has no AI-native capabilities: no skills, no conversational interaction, and in the user's words, it is boring. Configuration is a grid of buttons and sliders. Nothing in it learns.

---

## 2. Scope

### 2.1 Products in scope

Three, chosen to span the categories named in the vision:

| Product | Category |
|---|---|
| Pra.L | Beauty |
| ShoeCase | Life / niche |
| Massage Chair | Wellness |

Each has exactly one agent and one character bound to it.

### 2.2 Pillar depth contract

This is the central scoping decision and it governs how build effort is allocated. It is not a suggestion; it is what "done" means for this project.

| Pillar | Depth | Meaning |
|---|---|---|
| **Skill Discovery** | **DEEP - primary** | Flagged VERY IMPORTANT by the user. Fully autonomous: once a discovery run starts it completes with no human intervention. Receives the largest share of build effort. |
| **Character Progression** | **THIN - presentation-led** | Exp, level, and visible growth as a UI and UX layer over simple counters. No personality engine, no memory system, no per-character divergence modelling. |
| **Agentic Control** | **BASELINE - deliberately plain** | Basic prompting, tools, and per-product state. Must work convincingly and no more. Should consume the least build time of the three. |

---

## 3. Functional Requirements

### FR-1: Agentic Control (baseline)

- **FR-1.1** A user shall control any in-scope product by stating intent in natural language, via text or voice, without using a settings form. Example: "dry my shoes for thirty minutes".
- **FR-1.2** The system shall expose a set of tools per product covering that product's primary capabilities, sufficient for the agent to satisfy ordinary requests.
- **FR-1.3** The agent shall resolve a stated intent into one or more concrete device commands and apply them through the device layer.
- **FR-1.4** *(REVISED 2026-08-20T03:04:52Z)* The UI shall reflect resulting device state after every command, so the effect of an instruction is visible rather than merely described. Device state shall be rendered **as character stats**, read from the device layer rather than from the agent's reply text. No separate device control panel shall exist anywhere in the interface.
- **FR-1.5** *(REVISED 2026-08-20T05:58:41Z)* Each product shall maintain its **own** device state independently, and state changes to one product shall not affect another. **The state shape is per-product and not fixed system-wide** - beyond power, which is common to all three, each product exposes whatever attributes it actually has. Superseded text: "power, mode, and any active timers", which implied a single shape across three products that do not share one.
- **FR-1.6** Multi-step planning, clarifying counter-questions, scheduling, conditional actions, and cross-device orchestration are explicitly **out of scope** for this pillar.

### FR-2: Character Progression (thin, presentation-led)

- **FR-2.1** Each character shall hold an experience value and a level derived from it.
- **FR-2.2** Interacting with a product shall increase its character's experience.
- **FR-2.3** Crossing a level threshold shall be visible in the UI at the moment it happens, not merely on a later screen.
- **FR-2.4** *(REVISED 2026-08-20T03:04:52Z - causality reversed)* Discovery of a skill shall trigger a level-up presentation on the main character UI. Level shall **not** gate availability of skills; a discovered skill is usable the moment it exists. From the user's perspective the level-up appears to be what earned the skill, and that reading is the intended effect. Original text, superseded: "Level shall gate availability of discovered skills, per FR-3.7."
- **FR-2.5** Level shall drive cosmetic evolution of the character's appearance.
- **FR-2.6** Level shall **not** alter the character's personality or conversational tone. Explicitly excluded by the user (Q15 chose A and C, not B).
- **FR-2.7** Progression state shall survive process restart.

### FR-3: Skill Discovery (deep, autonomous - primary pillar)

- **FR-3.1** The agent shall analyse a product's accumulated usage history and decide, on its own, which skills are worth creating. No human proposes candidates and no human approves the result.
- **FR-3.2** A discovery run, once started, shall complete without human intervention. There is no approval gate, no confirmation prompt, and no human-in-the-loop step in the creation path.
- **FR-3.3** A discovered skill shall be represented as a composition over the device capability vocabulary plus a trigger condition.
- **FR-3.4** A discovered skill shall only reference capabilities that the device layer actually exposes, so that every generated skill is executable by construction and no hallucinated capability can reach a device call.
- **FR-3.5** Each discovered skill shall record its provenance: which observations in the usage history motivated it.
- **FR-3.6** On discovery, the character shall announce the new skill unprompted in chat, stating what it made and why.
- **FR-3.7** Discovered skills shall persist in that character's skill list and remain visible for the remainder of the session and across restarts.
- **FR-3.8** A discovered skill shall be invocable, and invoking it shall apply its composed device commands.
- **FR-3.9** A user shall be able to give natural-language feedback on a discovered skill, for example "too early in the morning", "only on weekdays", or "stop suggesting this".
- **FR-3.10** On receiving feedback, the agent shall revise the skill's composition or trigger, or retire the skill.
- **FR-3.11** Feedback shall be optional and post-hoc. If no feedback is given, the skill stands exactly as created, and the system shall remain fully functional with no user input beyond ordinary interaction.
- **FR-3.12** Accumulated feedback shall inform subsequent discovery runs, so that repeated passes refine rather than repeat.

### FR-4: Voice

- **FR-4.1** A user shall be able to speak to a character and hear it reply.
- **FR-4.2** *(REVISED 2026-08-20T03:14:36Z)* Speech shall be captured in the browser and streamed server-side to **Amazon Transcribe**, and the resulting text submitted to the agent identically to typed input. The agent shall be text-in and text-out, and shall never handle audio. Original text, superseded: "Speech shall be transcribed to text in the browser".
- **FR-4.3** *(REMOVED 2026-08-20T03:04:52Z)* Agent replies shall always be presented as **text**. Speech synthesis is removed from the response path, which removes Amazon Polly from the runtime. Input remains flexible (voice or text); output is text only. Original text, superseded: "Agent text output shall be rendered to speech and played back to the user."
- **FR-4.4** Voice shall degrade to text without loss of capability. If speech input or audio output is unavailable, the text path shall remain fully functional, since text is the primary path.

### FR-5: Device layer

- **FR-5.1** *(REVISED 2026-08-20T03:14:36Z)* All device interaction shall pass through a single `DeviceAdapter` interface exposing capability enumeration, state retrieval, and command application. The adapter shall be a **client of a device API** rather than an in-process module sharing memory with the agent. For the local build the device API may be served by routes within the same application, but the boundary shall be a real request boundary.
- **FR-5.2** A mock adapter shall be the only implementation built. No ThinQ adapter shall be written, and none shall be stubbed.
- **FR-5.3** The capability vocabulary used by skill generation shall be enumerated through the adapter rather than hardcoded, satisfying FR-3.4.
- **FR-5.9** *(NEW 2026-08-20T05:26:03Z)* **Agentic Control and Skill Discovery shall be separate layers.** Control is interactive and live, on the request path. Discovery is **background and asynchronous**, off the request path entirely. A discovery run shall never block a user interaction.
- **FR-5.10** *(NEW 2026-08-20T05:26:03Z)* A discovery run shall be triggered by **accumulated data volume** crossing a threshold, rather than by a user action, a page load, or a wall-clock timer. The threshold shall be low enough that a few interactions can cross it during a demo, since "the more you use it, the more it learns" is the claim being demonstrated.
- **FR-5.11** *(NEW 2026-08-20T05:26:03Z)* Data shall be classified into two access classes, enforced by separate modules rather than by convention:
  - **Sensitive** - accumulated usage history, derived routines and preferences, and discovered-skill provenance. Reachable **only through EXAONE**. Never logged, never sent raw to the client.
  - **Open** - current device state, capability list, character level and experience. Reachable **directly by the Bedrock control agent**.
  The boundary is sensitivity, not kind: one reading of current state reveals little, while accumulated history reveals a person's schedule.
- **FR-5.4** *(NEW 2026-08-20T03:14:36Z)* Agent, character, and device shall be bound in a strict **1:1:1** relation. Three products means three agents and three characters, each holding its own state. A single agent multiplexing multiple devices is not permitted, because it would break the premise that each character learns its own product.
- **FR-5.5** *(REVISED 2026-08-20T04:11:47Z - the invariant is relocated, not weakened)* Character stats shown in the UI shall be delivered as **structured data originating from a device API response**, and shall never be derived from model-generated text. Runtime state travels device API to agent to UI directly; it does **not** round-trip through DynamoDB. Superseded twice: originally "read from the device over its API", then "read from DynamoDB".
  - **Why this wording**: the earlier versions located the guarantee in the *storage path*, which was the wrong place. What actually prevents an agent reporting success while nothing changed is the **provenance and type of the payload** - a structured device response cannot be produced by a model writing a confident sentence. Where that payload is stored is irrelevant to the guarantee.
- **FR-5.6** *(REVISED 2026-08-20T04:11:47Z - purpose changed)* The device API shall hold usage events in memory and periodically **flush** them to the application, which persists them to DynamoDB, then **clear** its buffer. The purpose of the flush is **accumulating usage history for Skill Discovery**, not serving the display. Superseded reasoning: the flush previously existed to make DynamoDB the source of truth for displayed state.
- **FR-5.7** *(REVISED 2026-08-20T04:11:47Z)* Two distinct data flows exist, separated by purpose rather than by read versus write:
  - **Runtime flow**: device API to agent to UI, synchronous. Current device state, command results.
  - **Accumulation flow**: device API to DynamoDB via flush, asynchronous. Usage history that Skill Discovery later analyses.
  All actions - commands, capability enumeration, skill invocation - connect directly to the device API.
- **FR-5.8** *(REMOVED 2026-08-20T04:11:47Z)* Flush-before-read is no longer required and the requirement is withdrawn. It existed solely to stop the display showing stale flushed state, and the display no longer reads flushed state. Removing it also removes a staleness window and a synchronisation concern from the demo's most visible moment.

### FR-6: Usage history fixture

- **FR-6.1** *(REVISED 2026-08-20T03:04:52Z - now tiered)* The system shall ship a seeded synthetic usage history per product, committed to the repository as fixture data, structured in two tiers: **14 days sufficient to yield basic skills, and 60 days required to yield advanced skills.** Skill tier shall be distinguishable in the skill list. The tiering is itself part of the argument, since it demonstrates that more usage yields deeper personalization rather than merely asserting it.
- **FR-6.2** The fixture shall be deterministic, so that a discovery run behaves identically on every execution.
- **FR-6.3** **The fixture shall contain deliberate latent behavioural patterns for the agent to find.** This is a functional requirement rather than a data-preparation note: autonomous discovery can only surface structure that exists in the data, so uniformly random usage would cause the agent to correctly find nothing and the primary pillar to produce no visible result.

### FR-7: Interface and navigation

- **FR-7.1** The application shall be a responsive browser application designed mobile-first and comfortable at phone viewport widths. No native application.
- **FR-7.2** The application shall present a roster of the three characters, and a per-character view combining chat, that character's progression, and its skill list.
- **FR-7.3** The application shall open directly into the roster with no login step.

### FR-8: Localization

- **FR-8.1** *(REVISED 2026-08-20T03:04:52Z)* The interface shall default to Korean. Speech-output clause removed, since FR-4.3 no longer produces audio.
- **FR-8.2** *(REVISED 2026-08-20T03:04:52Z)* A toggle shall switch interface strings and agent reply language to English. Speech-voice clause removed.
- **FR-8.3** Agent output language shall be pinned by prompt instruction rather than by maintaining duplicate persona documents.

---

## 4. Non-Functional Requirements

### Extension configuration

Both AWS baseline extensions are **disabled** and their rule files are never loaded. The user asked for a balanced, lite posture, which the binary extension mechanism cannot express, so the substance was captured as ordinary numbered requirements below. Property-based testing is enabled at **Partial** scope.

| Extension | Enabled | Effect |
|---|---|---|
| Security Baseline | No | Not blocking. Substance captured as NFR-1.x |
| Resiliency Baseline | No | Not blocking. Substance captured as NFR-2.x |
| Property-Based Testing | Partial | NFR-3.1 |

### NFR-1: Security (lite guardrails)

- **NFR-1.1** AWS credentials and API keys shall exist only in environment variables, never in source and never in the client bundle.
- **NFR-1.2** *(AMENDED 2026-08-20T06:24:50Z to match FR-5.11)* All model calls shall be made server-side, so no model credentials reach the browser. This covers both `FRIENDLI_API_KEY` and AWS model access. Second obligation: **the browser shall have no direct data endpoint for the sensitive class** as defined in FR-5.11. Sensitive data reaches the client only as a summary produced through EXAONE.
  - **Superseded wording**: "no direct data endpoint for device **or usage** data". That was written before FR-5.11 split data by sensitivity, and read literally it forbade serving current device state to the browser - which FR-5.11 classifies as open precisely because one current reading reveals nothing about behaviour. A read endpoint for current state is therefore permitted.
- **NFR-1.3** Every chat and voice payload shall be validated and length-capped.
- **NFR-1.4** User free text shall pass a prompt-injection guard before reaching the model. This applies to both ordinary chat and skill-revision feedback, because both shape what an agent that controls devices will do.
- **NFR-1.5** Logs shall contain no personal data and no raw chat content.
- **NFR-1.6** `.env` shall remain gitignored, with `.env-example` documenting the expected shape.

### NFR-2: Resiliency (lite guardrails)

- **NFR-2.1** *(REVISED 2026-08-20T03:04:52Z)* Every model call shall have a timeout and a single bounded retry. The speech-synthesis clause no longer applies, per FR-4.3.
- **NFR-2.2** A failed model call shall produce a visible graceful fallback. It shall never blank the screen.
- **NFR-2.3** Progression and discovered skills shall be persisted at each change, so a mid-demo refresh loses no progress. Satisfied by the storage split in section 5.2.
- **NFR-2.4** Seeded fixtures shall remain available as a fallback path if live cloud calls fail, so that venue network conditions cannot render the application inert.

### NFR-3: Testing

- **NFR-3.1** Property-based tests shall be applied to pure functions and serialization round-trips. Other areas are covered by conventional tests. Candidate targets: experience-to-level derivation, skill composition serialization, trigger evaluation, and usage-history parsing.

### NFR-4: Demo robustness

- **NFR-4.1** *(RESTATED 2026-08-20T05:34:18Z)* Discovery shall be **reproducible in shape**: the same fixture and feedback state shall yield skills of the same kind and trigger, though names and phrasing may vary. Model temperature shall be 0.1 to 0.3, not the sample call's 1.0. A previously computed run shall be retained and replayable if a live run produces a weak result during a demo.
  - **Superseded text**: "Discovery shall be deterministic given the same fixture and feedback state." Unachievable once EXAONE became mandatory for discovery reasoning, since a language model offers no reproducibility guarantee even at temperature 0.
  - **Note on cost**: the replay reserve is nearly free. FR-5.9 makes discovery background and asynchronous, so a run already persists its result - a retained run and a fresh run are the same artifact, and replay is a stored read rather than a mechanism built specially for the demo.
- **NFR-4.2** No slow or non-deterministic generation shall sit on the critical path of a visible interaction. This is why character art is pre-generated rather than produced on level-up.

### NFR-5: Deployment (conditional)

- **NFR-5.1** The committed build shall run locally. Deployment is optional and attempted only if time permits.
- **NFR-5.2** **If** the application is deployed to any publicly reachable URL, a shared passcode gate shall be required before it accepts requests. The reason is cost and abuse rather than privacy: an open endpoint that invokes a model on demand can be run up by anyone who finds it.

---

## 5. Technical Decisions

### 5.1 Stack

| Concern | Decision |
|---|---|
| Language | TypeScript / Node.js |
| Agent framework | LangGraph with LangChain v1 `createAgent` and middleware. Graph state carries character progression; tools and middleware deliver control and discovery |
| Model | **Two models, split by responsibility** *(revised 2026-08-20T05:14:22Z)*. **Amazon Bedrock** for Agentic Control - conversation and device commands, via `ChatBedrockConverse` from `@langchain/aws`. **EXAONE via Friendli** for Skill Discovery and product-stat governance - mandatory hackathon requirement, OpenAI-compatible chat/completions at `api.friendli.ai/dedicated/v1`, accessed with `ChatOpenAI` and an overridden `baseURL`, text input only. Bedrock returns to the runtime, so the AWS surface is Bedrock, DynamoDB and Transcribe |
| Speech synthesis | ~~Amazon Polly~~ **REMOVED 2026-08-20T03:04:52Z** - replies are text only |
| Speech recognition | **Amazon Transcribe** (streaming, server-side). *Revised 2026-08-20T03:14:36Z from browser Web Speech API* |
| Device access | HTTP API. `DeviceAdapter` is its client. 1:1:1 agent-character-device binding |
| Cloud posture | AWS-central |
| Hosting | Local first. EC2 only if time remains |
| Auth | None. One hardcoded demo user owning all character state |

**AWS deviation resolved 2026-08-20T03:14:36Z.** The stack previously sent speech audio to Google's recognition service via the browser Web Speech API, which was the one non-AWS element. Switching to Amazon Transcribe removes that deviation, so all speech, model, and storage processing now stays within AWS. Cost of the change is roughly 1-3 hours for browser audio capture plus a server-side streaming path, contained by FR-4.4 which keeps text as the primary path so a failure in the audio pipeline degrades the demo rather than ending it.

### 5.2 Storage split

Storage is deliberately split by purpose rather than unified, because the seven kinds of data here have genuinely different needs.

| Data | Store | Rationale |
|---|---|---|
| Seeded usage history | Committed JSON fixtures | Written once, read many, deterministic. Fixture data, not runtime state |
| Character progression | DynamoDB | Must survive restart |
| Discovered skills, provenance, revisions | DynamoDB | The primary pillar's output. Losing it would erase what the demo exists to show |
| Current device state | **Not persisted.** Device API memory, delivered to the UI through the agent | *Revised 2026-08-20T04:11:47Z.* Runtime state, no storage requirement |
| Accumulated usage events | DynamoDB, appended by flush | **Primary purpose of DynamoDB.** Input to Skill Discovery, alongside the seeded fixture |
| Feedback log | DynamoDB | Feeds subsequent discovery passes |
| Conversation threads | LangGraph in-memory checkpointer | Losing chat scrollback on restart is tolerable; losing skills is not |
| Speech audio | Not persisted | Streamed to the client |
| Character art | Static files, referenced indirectly | See 5.3 |

The reason progression and skills are not held in the LangGraph checkpointer is that in TypeScript the first-party checkpoint savers are in-memory, SQLite, and Postgres, with DynamoDB available only as a community package. Separating the domain store from the conversation checkpointer avoids adopting or writing a saver on a two-day clock, and is the better separation regardless.

### 5.3 Character art

Art is pre-generated per product per level and referenced by an asset reference stored on the character-level record, resolved by configuration to either a local static path or an object-storage URL. Object storage is unnecessary for the local build and becomes correct if the optional deployment happens, if art is regenerated often enough to churn the repository, or if total asset size grows uncomfortable to commit.

---

## 6. Out of Scope

- Native mobile application
- Real ThinQ API integration, and any ThinQ adapter implementation or stub
- User accounts, login, and multi-user support
- Multi-step planning, clarifying counter-questions, scheduling, conditional actions, cross-device orchestration
- Personality or tone changing with level
- Open-ended runtime code generation for skills
- Live usage simulation during the demo
- Vector store or retrieval infrastructure over the usage history
- Guaranteed deployment

---

## 7. Open Decisions Deferred to Functional Design

Recorded rather than resolved, since Functional Design is the stage that will handle them:

1. **Skill representation schema** - concrete shape of a composition, trigger vocabulary, provenance record, and revision semantics.
2. **Graph state shape** - how progression and skill state coexist in LangGraph state alongside conversation.
3. **Character art strategy** - pre-generated illustration per level versus a single base illustration with level expressed through frame, aura, colour, or accessory. Runtime generation is rejected per NFR-4.2.
4. **Fixture pattern design** - which latent behavioural patterns are authored into the seeded history, satisfying FR-6.3.
5. **Bilingual authoring scope** - string dictionary, single-language personas with output language pinned by instruction, one voice per language.
6. **Level thresholds and experience curve.**

---

## 8. Traceability

| Requirement group | Source |
|---|---|
| Product vision, problem statement | Round 1 Section 0 |
| Application category, UI shape | Round 1 Q1; Round 2 Q13 |
| AWS posture | Round 1 Q2 |
| Audience, quality bar, timeline | Round 1 Q3, Q4, Q8 |
| Language and stack | Round 1 Q5 |
| Pillar selection and depth contract | Round 2 Q1, Q16 |
| Products in scope | Round 2 Q2, Q3 |
| Storage split | Round 2 Q4; Round 1 Q6 |
| Auth | Round 2 Q5; Round 1 Q7 |
| Workflow shape | Round 2 Q6; Round 1 Q9 |
| NFR-1.x security | Round 2 Q7; Round 1 security opt-in |
| NFR-2.x resiliency | Round 2 Q8; Round 1 resiliency opt-in |
| NFR-3.1 testing | Round 1 PBT opt-in |
| Voice architecture | Round 2 Q9 |
| Usage history fixture | Round 2 Q10 |
| Device layer | Round 2 Q11 |
| Deployment | Round 2 Q12; NFR-5.x |
| Localization | Round 2 Q14 |
| Progression rewards | Round 2 Q15 |
| Skill lifecycle, autonomy, announcement, representation | Round 2 Q17, Q18 and the autonomy and revision directives |
