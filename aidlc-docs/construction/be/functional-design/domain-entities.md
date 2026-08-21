# BE Domain Entities

**Stage**: CONSTRUCTION - Functional Design, unit BE
**Created**: 2026-08-20T09:38:00Z
**Status**: COMPLETE. Stage approved 2026-08-20T09:41:52Z
**Source of decisions**: `construction/plans/be-functional-design-plan.md` sections 2A, 3 and 4A (S1-S7)

Technology-agnostic. Storage shapes and route payloads are deliberately absent - the interface evolution policy leaves them to be settled with FE during Construction.

---

## 1. How small this model is, and why that is the design

Four entities. Three of them are almost data-free.

The scope note in the plan's section 2A is load-bearing here: **the structure gets built first, domain behaviour gets decided against real code.** A domain model written to be complete at this point would be a set of guesses, and the two most expensive guesses available were the ones deliberately not made:

- **A skill is a Markdown document, not a structured rule.** No trigger DSL, no condition tree, no parameter schema. Discovery writes prose; the control agent reads prose.
- **There is no progression entity in BE at all.** No level, no exp, no `Character` record. FE derives level from the length of the skill list.

Both are recorded as decisions rather than omissions. Section 5 states what each one costs.

---

## 2. Entities

### 2.1 Skill

The only entity BE persists.

| Field | Type | Notes |
|---|---|---|
| `id` | identifier | **Server-generated.** Never a client-supplied value. INFRA's runtime contract makes this binding, not just preferred |
| `productId` | one of three products | `pral`, `shoecase`, `massagechair`. The 1:1:1 binding means this also identifies the owning agent and character |
| `title` | short text | What FE shows on a card |
| `content` | **Markdown document** | The skill itself. Describes a new feature or mode in prose, including why it was proposed |
| `status` | `active` / `retired` | Retirement leaves `content` untouched |
| `createdAt` | timestamp | |

**Lifecycle**

```
      discovery run finds a pattern
                  |
                  v
             [ active ] ------ feedback rewrites content ------> [ active ]
                  |
                  '--------- user rejects the skill -----------> [ retired ]
```

- Only discovery creates a skill. There is no authoring path and no seeding path.
- Revision does not create a new entity and does not change `id`. **The skill keeps its identity across feedback** - that is what makes "the character corrected itself" legible rather than "the character replaced the thing".
- `retired` is terminal. Nothing un-retires.
- **How feedback rewrites the document is parked** (plan Q5). The lifecycle above is the part that had to be settled now, because it decides whether revision is an update or an insert.

### 2.2 UsageEvent

Raw device activity. The input to discovery and nothing else.

| Field | Type | Notes |
|---|---|---|
| `productId` | one of three products | |
| `type` | short text | Placeholder vocabulary, `<capability>_invoked`. Product-neutral by decision, so it cannot be mistaken for real product design |
| `params` | free-form | Whatever the capability took |
| `at` | timestamp | |

- **Generic and product-neutral on purpose.** Authentic per-product event vocabulary is deferred to the per-product phase. Discovery needs *a* pattern to find, not a realistic one.
- Events arrive in batches from `device-stub`'s flush cycle. They are not written one at a time by the request path.
- **Sensitive data class.** Accumulated usage history is the canonical example of what FR-5.11 keeps away from the client and away from the Bedrock control path.

### 2.3 Capability

The device's action vocabulary. Read-only from BE's point of view - the device declares it.

| Field | Type |
|---|---|
| `name` | short text |
| `params` | parameter names and types |

Placeholder set: `power`, `start`, `stop`, `setMode`, `setDuration`, shared by all three products.

**What this entity is for changed during planning** (plan note, 2026-08-20T08:04:36Z). With skills as prose, the capability list is no longer a validation bound on what discovery may invent. It is now the **control agent's tool set**, which is what bounds execution instead. Same list, different job. FR-3.4 was relocated for this reason: prose cannot be validated, so execution is bounded by the tool set the agent is given.

### 2.4 DeviceState

Current device readings. **Not persisted anywhere.**

| Field | Type | Notes |
|---|---|---|
| `attributes` | ordered list of key / value / unit | Order is display order and BE owns it |
| `observedAt` | timestamp | |

- Read from the device on demand, forwarded to FE, discarded.
- `attributes` is a **list, not a map**, because an object would drop the ordering and force FE to invent one.
- **Open data class.** Current state may reach Bedrock and may reach the client.

---

## 3. Relationships

```
ProductId  (exactly three, fixed)
    |
    | 1:1:1  agent : character : device        (strict, no multiplexing)
    |
    +---- 1:N ----> Skill          persisted, DynamoDB
    +---- 1:N ----> UsageEvent     accumulated, input to discovery
    +---- 1:1 ----> DeviceState    read on demand, never stored
    +---- 1:N ----> Capability     declared by the device
```

There is no user entity. One hardcoded demo user, no auth.

There is no conversation entity. Conversation lives in the agent's in-memory checkpointer (S6) and is lost on restart, which is acceptable for a demo and is recorded so that nobody looks for it in storage.

---

## 4. Data classification, as an entity-level property

The boundary is **sensitivity, not kind**. It is recorded here because it constrains which entity may be touched from which module, and that is a structural property rather than a runtime check.

| Entity | Class | Consequence |
|---|---|---|
| `UsageEvent` | **Sensitive** | EXAONE only. Never logged raw, never sent to the client, never reachable from a Bedrock tool |
| `Skill.content` | Open once written | It is an agent-authored document. It may summarise what motivated the skill but may not carry the raw observations behind it |
| `DeviceState` | Open | Bedrock direct, client direct |
| `Capability` | Open | Bedrock direct |

**Enforced structurally, not by a check**: the usage-event module and the tool modules are separate, and nothing in the tool layer imports the usage module. Verifiable by inspection, which is the point - a runtime guard can be bypassed by the next person, an absent import cannot be bypassed by accident.

---

## 5. What this model deliberately does not have, and what each omission costs

| Not modelled | Cost, stated rather than hidden |
|---|---|
| **Progression** - level, exp, `Character` | FE derives level from skill-list length. If two clients ever disagree about level there is no authority to settle it. Acceptable at one demo user, wrong for a product |
| **Structured trigger** on a skill | Nothing can fire a skill automatically. Prose gives a scheduler nothing to read. US-3.3 works by the agent selecting a skill through a tool, not by the system activating one |
| **Provenance** as its own field | FR-5.11 was relocated for this: with no provenance field, the constraint becomes a generation-time rule about what the document may contain |
| **Revision history** | Only the current `content` survives a rewrite. The previous version is gone. Q5 is parked and may reintroduce this |
| **Skill tiers** (basic at 14 days, advanced at 60) | Recorded in requirements, not modelled here. The scaffold's fixture does not span 60 days |

---

## 6. Deferred to the per-product phase

Real capability vocabularies per product · real device attribute keys · authentic usage rhythms and emission points · device time model · per-product agent tools · tiered fixture spanning 14 and 60 days.

The scaffolding phase exists to make these cheap: once the pipeline runs end to end, adding a product should be data and tools rather than architecture.
