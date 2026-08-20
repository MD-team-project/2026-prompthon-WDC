# FE Domain Entities

**Stage**: CONSTRUCTION - Functional Design
**Unit**: FE
**Generated**: 2026-08-20T08:30:00Z
**Source**: `fe-functional-design-plan.md` answers Q1-Q14

## What this document is

The **client-side view model**. These are not domain entities in the backend sense - FE owns no domain. They are the shapes FE holds in memory in order to render, and the point of writing them down is **provenance**: which field is allowed to come from where.

FR-5.5 is a statement about provenance, so provenance belongs in the entity definition rather than in a note somewhere downstream.

---

## 1. The provenance rule, stated first

Two classes of value reach the screen and they must not be confused.

```
+-----------+     +-------+     +----+
| device    | --> | agent | --> | UI |
+-----------+     +-------+     +----+
   structured       passes       renders
   response         through      structured part
```

| Class | Example | Source | May the model author it? |
|---|---|---|---|
| **Structured state** | remaining 25 min, mode dry, power on | `deviceState` field of a BE response | **No.** Never. FR-5.5 |
| **Prose** | "25분으로 맞춰뒀어요", a skill's reason for existing | `text` field of a message | **Yes.** This is what the model is for |

The distinction is not "trusted versus untrusted". It is that a language model can write a confident sentence but cannot fabricate a structured device response. Prose from the model is correct and wanted. Stats from prose are not.

**Structural enforcement, not discipline**: `ChatMessage` has exactly one textual field and no numeric or state fields. `DeviceStats` is constructible only from a response's `deviceState` object. No function in FE takes a string and returns a `DeviceStats`. The unsafe path is therefore absent from the type surface rather than merely discouraged.

---

## 2. Entities

### Character

Held one per product. Three instances, no shared state (FR-5.4).

| Field | Type | Source | Notes |
|---|---|---|---|
| `id` | string | BE | Also identifies the agent and device, per the 1:1:1 binding |
| `productId` | string | BE | `pral` / `shoecase` / `massagechair` |
| `name` | string | BE | Not translated on language switch |
| `level` | number | BE, character store | Progression, not device state |
| `exp` | number | BE, character store | |
| `expToNext` | number | BE, character store | FE does not compute thresholds. The curve is BE's |
| `artRef` | string | BE or local config | An asset reference. **Carried but not yet resolved** - see below |

`level` and `exp` are the **only** progression fields. Intimacy was raised as an example and explicitly removed - see Q5 sub-decisions.

FE never derives `level` from `exp`. That derivation is a pure function and NFR-3.1 names it as a property-based test target, which places it on the side that owns the curve. Duplicating it here would create two sources that can disagree.

**`artRef` status, 2026-08-20.** The field is populated and passed down, but nothing resolves it: it lands on the stage as a `data-art-ref` attribute and the one product with real art has its frame paths hardcoded instead. So the field is currently documentation of an intent rather than a lookup key. It works at one art set and breaks at two, which is when whoever adds the second set should make it resolve for real. Recorded rather than quietly left as a stale "placeholder now" note (Q8 C, FE-R-11).

### DeviceStats

The device's current state, rendered as the character's stats. Generic by decision (Q3 A), because FR-1.5 makes the shape per-product and the scaffolding phase has no product-authentic attributes to design against.

| Field | Type | Notes |
|---|---|---|
| `characterId` | string | |
| `attributes` | `Array<StatAttribute>` | **Array, not a record.** Order is display order and BE owns it. A record would lose that and force FE to invent an ordering |
| `observedAt` | string | From the device response. FE displays it nowhere by default; it exists so a stale value is diagnosable |

**StatAttribute**

| Field | Type | Notes |
|---|---|---|
| `key` | string | e.g. `power`, `mode`, `remainingMinutes` |
| `value` | string \| number \| boolean | |
| `unit` | string, optional | Rendered after the value when present |

FE holds a label lookup keyed by `key`, per language. An unknown key renders with a readable fallback derived from the key rather than being hidden - hiding it would make a BE-side addition invisible instead of merely unpolished.

**Not persisted anywhere on the client.** Current device state has no storage requirement (requirements section 5.2) and caching it would create a second source that can be stale.

### Skill

| Field | Type | Notes |
|---|---|---|
| `id` | string | Carried on feedback so the reference is never ambiguous (Q6 D) |
| `characterId` | string | |
| `name` | string | Stays in the language it was generated in. US-4.2 scenario 3 makes this explicit |
| `tier` | `'basic' \| 'advanced'` | Must be visually distinguishable. US-3.1 scenario 2 |
| `reason` | string | **Agent-authored summary** of what motivated the skill. Not raw provenance - FR-5.11 forbids observations reaching the client |
| `status` | `'active' \| 'retired'` | Retired skills leave the active list. US-3.4 scenario 2 |
| `discoveredAt` | string | |
| `revisedAt` | string, optional | Present after feedback. Evidence that the skill kept its identity rather than being replaced |

`reason` being model-authored prose is correct and is the point - it is the evidence that converts discovery from a claim into something witnessed. It is prose, so section 1 permits it.

There is **no locked or undiscovered skill state** (Q5 sub-decision). A skill exists or it does not.

### ChatMessage

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `characterId` | string | Needed because one SSE stream serves all three characters (Q14 B) |
| `role` | `'user' \| 'character' \| 'system'` | |
| `text` | string | **The only textual field, and nothing parses it** |
| `kind` | `'normal' \| 'announcement' \| 'failure'` | Drives presentation, not content |
| `skillId` | string, optional | Set on `announcement`. One announcement per skill, which is how US-3.2 scenario 3's "each is announced distinctly" is satisfied |
| `at` | string | |

Not persisted on the client. US-2.1 scenario 4 states scrollback is the one thing a refresh is allowed to lose.

### Session state

Not an entity, but it needs writing down because several answers put load-bearing decisions here.

| Field | Type | Persisted | Notes |
|---|---|---|---|
| `lang` | `'ko' \| 'en'` | `localStorage` | Attached automatically to every BE request, not just UI strings (Q11) |
| `view` | `'roster' \| 'character'` | No | One variable, no router (Q4 A) |
| `selectedCharacterId` | string \| null | No | |
| `compendiumOpen` | boolean | No | The compendium is an overlay on the same view, not a route |
| `sse` | `'connecting' \| 'open' \| 'dropped'` | No | One connection app-wide, so one status (Q14 B, Q12 C) |
| `unseen` | `Record<characterId, number>` | No | Badge counts for announcements arriving off-screen (Q14 B) |
| `pending` | `Record<characterId, boolean>` | No | The neutral in-flight marker (Q13 B). Boolean, never a predicted value |
| `feedbackContext` | `skillId \| null` | No | Set when the user starts feedback from a skill card (Q6 D) |

`pending` is deliberately a boolean rather than a partial `DeviceStats`. A partial would be a predicted value with extra steps, which is what Q13 rejected.

---

## 3. What FE does not hold

Recorded because the absences are constraints, not oversights.

| Absent | Why |
|---|---|
| Raw usage history, derived routines, raw provenance | FR-5.11 sensitive class. There is no client-side shape for it because there is no endpoint serving it |
| Level thresholds, exp curve | BE owns the derivation. NFR-3.1 tests it there |
| Device capability list | FE never enumerates capabilities. Skills arrive composed; FE renders and invokes them by id |
| Cached device state | Requirements section 5.2 says current state is not persisted. A client cache would be a second source |
| Conversation history across reloads | US-2.1 scenario 4 |
| Any credential | NFR-1.1, NFR-1.2. Audio goes to BE, which holds the Transcribe credentials |
