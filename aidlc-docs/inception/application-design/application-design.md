# Application Design

**Stage**: INCEPTION - Application Design
**Rewritten**: 2026-08-20T07:14:09Z - collapsed to a short decision record
**Supersedes**: the detailed interface contract that previously lived across four files

## What happened to the detailed contract

Earlier versions of this stage produced a full interface specification - shared TypeScript types, route-by-route request and response shapes, a DynamoDB single-table schema, SSE event unions, error envelopes. **That has been deliberately discarded.**

Two reasons. First, product-specific data and tools are deferred to a later phase, so most of those shapes were placeholders being negotiated as though they were real. Second, this stage repeatedly over-specified: an audit against "do two or more owners actually exchange this?" found violations in all five documents, and the corrections kept shrinking the binding surface. Taking it to the minimum is the consistent end of that process rather than a reversal of it.

Files removed: `components.md`, `component-methods.md`, `services.md`, `component-dependency.md`. `be-reference-discovery-workflow.md` is retained as BE's own non-binding notes.

---

## 1. Scope: this is a scaffolding phase

Build three components, the seams between them, and enough behaviour to prove the seams work.

**Skill Discovery over raw device data is the core deliverable.** Device data is raw data, and discovering skills from it is the point of the product. The stub supplies generic raw usage events, which is all discovery needs to find patterns, synthesise skills, validate them, persist them and announce them.

Deferred is product *authenticity*, not usage data: what a real Pra.L or ShoeCase session looks like, real capability vocabularies, real attribute keys, event vocabularies, and the device time model.

---

## 2. Components and ownership

| Component | Owner | What it is |
|---|---|---|
| `frontend` | FE | Mobile-first browser app. The character **is** the device UI - no appliance control panel |
| `backend` | BE | Three agents (1:1:1), Skill Discovery, skill lifecycle, the API FE calls |
| `device-stub` | BE | **Canned-response server.** No clock, no timers, no lifecycle events. Serves device data and generic raw usage events |
| IaC and environment | INFRA | Provisioning and configuration |

---

## 3. The only interface decisions made here

**FE to BE: REST API plus SSE.** REST for everything the user initiates. SSE for what the agent pushes unprompted - a discovered skill announcement is not a response to a request, so it needs a server-push channel.

**Stubbing: `device-stub` serves device data.** BE builds it, it returns fixed responses, and it is the source of the raw usage events discovery analyses.

**Route names, payload shapes, SSE event names and the storage schema are settled by FE and BE between themselves during Construction.** They are not fixed here. That is two people agreeing, not three-way coordination, and it does not need an Inception artifact.

---

## 4. INFRA scope

Provide what BE needs, and prepare IaC so that deploying later is easy.

- Provision and configure what BE asks for: DynamoDB, Bedrock access, Transcribe access, IAM, credentials
- Own the environment contract: variable names, local run procedure
- Write IaC now so deployment is a small step later rather than a scramble

**INFRA slack: option A.** IaC and environment come first because they unblock the other two streams. Once done, INFRA joins whichever stream is behind - likely FE or BE's discovery work.

---

## 5. Constraints that still bind, from requirements

These are not interface decisions and are not up for local negotiation.

| Constraint | Source |
|---|---|
| **EXAONE** for Skill Discovery and sensitive-data access; **Bedrock** for Agentic Control | Hackathon requirement |
| EXAONE wrapped as `ChatOpenAI` with an overridden `baseURL`; `chat_template_kwargs` must travel via `modelKwargs` | Friendli is OpenAI-compatible; that field is not an OpenAI parameter |
| Thinking output never rendered as the character's speech | User-visible |
| Displayed stats come from structured device responses, never from model-generated text | FR-5.5 |
| Sensitive data - accumulated usage, derived routines, provenance - never crosses to the client | FR-5.11 |
| Discovery runs off the request path and never blocks an interaction | FR-5.9 |
| Model credentials server-side only; nothing secret in the browser bundle | NFR-1.1, NFR-1.2 |
| Text-only replies. Voice in via Transcribe, no speech output | FR-4.x |
| Korean default with an English toggle, including reply language | FR-8.x |

---

## 6. First-hour verification, before construction

Cheap, and each one invalidates part of the design if it fails.

1. **Tool calling on the *dedicated* Friendli endpoint.** If this fails the agent cannot call device tools and the architecture needs rework. The documentation found covers serverless endpoints only.
2. **`modelKwargs` passthrough** actually reaches Friendli rather than being silently dropped.
3. **Thinking output shape** - inline in content, or a separate field. Determines the sanitiser.
4. **Whether `seed` is honoured.** If it is, discovery reproducibility gets much easier.

---

## 7. Phase structure

```
NOW:    Scaffolding
        Inception (this) -> Construction
        Three components, seams, discovery pipeline over generic data

LATER:  Per product
        Inception -> Construction, per product
        Product-specific state, capabilities, tools, authentic usage data
```

The scaffolding phase exists to make the later per-product phases cheap: once the pipeline runs end to end, adding a product should be data and tools rather than architecture.

---

## 8. Interface evolution policy

**Decision**: fix the transport only. Everything above the transport is developed incrementally by FE and BE as construction proceeds.

### Fixed now, at this stage

| | |
|---|---|
| **FE to BE, user-initiated** | **REST API** over HTTP, JSON bodies |
| **BE to FE, server-initiated** | **SSE**. Required because an agent announcement is not a response to any request |
| **BE to `device-stub`** | HTTP, JSON |
| **`device-stub` content** | Canned responses. Serves device data and generic raw usage events |

That is the entire interface commitment from Inception.

### Not fixed, and deliberately so

- Route paths and method choices
- Request and response payload shapes
- SSE event names and their payloads
- Storage schema, keys and access patterns
- Error and failure response shapes

### How these get settled

FE and BE agree them **directly, incrementally, during Construction**, and revise as they learn. No Inception artifact, no change-control process, no sign-off. Two people talking is the mechanism.

This is a deliberate choice rather than an omission. Fixing payload shapes in Inception means guessing them before either side has written code, and every guess then costs a renegotiation to correct. Agreeing them while building means each shape is decided by whoever has just discovered what it needs to be.

### What this does not loosen

Section 5 constraints are unaffected. They come from requirements rather than from convenience, so they hold regardless of how the payloads evolve:

- Displayed stats originate in structured device responses, never in model-generated text
- Sensitive data - accumulated usage, derived routines, provenance - never crosses to the client
- Discovery stays off the request path
- Model credentials stay server-side; nothing secret in the browser bundle
- EXAONE for discovery and sensitive data, Bedrock for control

A payload shape can change freely. Which class of data is allowed to be in it cannot.

### The one practice that keeps this cheap

**Integrate thinly and early.** The hour-5.5 checkpoint exists for exactly this: connect FE to real BE before either is finished, so a mismatched assumption surfaces while it is still an hour of work rather than a rewrite. With shapes evolving rather than frozen, that checkpoint stops being a formality and becomes the mechanism that makes the whole approach work.
