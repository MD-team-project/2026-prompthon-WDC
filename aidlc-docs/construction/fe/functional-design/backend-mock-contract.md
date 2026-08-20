# Backend Mock Contract - FE's proposal to BE

**Stage**: CONSTRUCTION - Functional Design
**Unit**: FE
**Generated**: 2026-08-20T08:30:00Z
**Status**: **Proposal, not a contract.** Revisable by agreement with BE at any point

## Why this document exists

Application Design fixed the transport and deliberately left route paths, payload shapes, SSE event names and error shapes unfixed, to be settled by FE and BE directly during Construction. That is the right call, and it has one practical consequence: FE cannot mock a backend without writing down what it is mocking.

So this is what FE's mock implements and therefore what FE currently assumes. It is FE's half of the negotiation. **BE should change anything that is wrong or inconvenient** - the point of the evolution policy is that whoever has just discovered what a shape needs to be gets to set it.

It is kept separate from `frontend-components.md` so it can be handed over and revised without touching component design.

---

## 1. What is already fixed, and not up for negotiation here

From Application Design section 8, and from requirements:

- REST for user-initiated FE to BE, JSON bodies
- SSE for server-initiated BE to FE
- No credential in the browser; no direct model or Transcribe call from the client (NFR-1.1, NFR-1.2)
- No endpoint serving the sensitive data class to the browser (FR-5.11)
- Displayed stats arrive as structured data, not as prose (FR-5.5)
- Replies are text; no audio response (FR-4.3)

Everything below is shape, and shape is negotiable.

---

## 2. Two asks that are structural rather than cosmetic

These two change FE's architecture rather than its parsing, so they are worth settling first.

### Ask 1: one SSE stream for all three characters

`GET /api/events` carries events for every character, each event naming its `characterId`.

**Why**: an announcement can arrive for a character the user is not looking at, and FE raises a badge for it (Q14 B). A per-character stream opened when a character screen mounts cannot deliver that event at all. It also gives the connection banner a single status instead of three.

If BE would rather serve per-character streams, FE's badge behaviour has to change and Q14 needs revisiting.

### Ask 2: `deviceState` is a separate field from reply text, in every response that can change state

Never a single field, never state values embedded in prose.

**Why**: FR-5.5. FE's enforcement of it is that no function accepts a string and returns stats. That property only holds if the response separates them.

---

## 3. Proposed routes

### `GET /api/characters`

```json
[
  {
    "id": "shoecase",
    "productId": "shoecase",
    "name": "슈케이스",
    "level": 3,
    "exp": 120,
    "expToNext": 200,
    "artRef": "shoecase/base"
  }
]
```

`expToNext` rather than a threshold table: FE does not own the exp curve and should not reimplement it.

### `GET /api/characters/:id/state`

```json
{
  "characterId": "shoecase",
  "attributes": [
    { "key": "power", "value": true },
    { "key": "mode", "value": "dry" },
    { "key": "remainingMinutes", "value": 25, "unit": "min" }
  ],
  "observedAt": "2026-08-20T08:30:00Z"
}
```

**`attributes` is an array, not an object**, and its order is display order. FR-1.5 makes the shape per-product, so FE renders generically (Q3 A) and BE decides both which attributes exist and how they are ordered. An object would lose the ordering and force FE to invent one.

`key` values are BE's to choose. FE holds a label lookup for the ones it knows and falls back to a readable form of the key for the rest, so BE adding an attribute never breaks FE and never silently hides data.

### `GET /api/characters/:id/skills`

```json
[
  {
    "id": "sk_01",
    "characterId": "shoecase",
    "name": "화목 저녁 운동화 관리",
    "tier": "basic",
    "reason": "지난 14일 동안 화요일과 목요일 저녁에 운동화를 넣으시는 걸 봤어요.",
    "status": "active",
    "discoveredAt": "2026-08-20T08:10:00Z",
    "revisedAt": null
  }
]
```

`reason` is **agent-authored prose**, not raw provenance. FR-5.11 keeps observations server-side. This is the field that carries the whole persuasive weight of the discovery pillar, so it is worth BE treating as a first-class output rather than a debug string.

`tier` is `basic` or `advanced` and must be present - US-3.1 scenario 2 requires the two to be distinguishable in the list.

### `POST /api/characters/:id/messages`

Request:

```json
{ "text": "운동화 30분만 건조해줘", "lang": "ko", "skillId": null }
```

`lang` is attached by the API client to every request, not per call site (FE-R-24). `skillId` is present when the message is feedback started from a skill card (Q6 D), null otherwise.

Response:

```json
{
  "message": {
    "id": "m_11",
    "characterId": "shoecase",
    "role": "character",
    "text": "25분으로 맞춰뒀어요. 그 이상은 무리라서요.",
    "kind": "normal",
    "at": "2026-08-20T08:31:00Z"
  },
  "deviceState": { "...": "as GET state" },
  "progression": { "level": 3, "exp": 130, "expToNext": 200, "leveledUp": false },
  "skill": null
}
```

`deviceState` may be omitted when nothing changed. `skill` carries the updated skill when the message was feedback - which is how the card updates in place with the same id (FE-R-16).

**The clamp case is the check worth running.** With the device clamping 30 to 25, `deviceState` says 25 while `message.text` may well mention both numbers. The screen must show 25. That single response exercises FR-5.5 end to end and is the five-second proof the demo puts in front of judges.

### `POST /api/characters/:id/skills/:skillId/invoke`

Request: `{ "lang": "ko" }`. Response: same envelope as messages.

Invocation is by id, never by name (FE-R-31).

### `POST /api/transcribe`

Multipart audio blob in, `{ "text": "..." }` out.

One REST route rather than a WebSocket, per Q10 C. FE places the transcript in the input as an editable draft, so no interim transcript is needed and no third transport has to exist. Voice is first in the drop order, and this keeps its footprint to one route.

### `GET /api/events` - SSE

One connection, opened at app mount, all three characters.

```
event: skill_discovered
data: {"characterId":"shoecase","message":{...},"skill":{...},"progression":{...}}
```

`message` uses `kind: "announcement"`. `skill` is the newly created skill. `progression` carries `leveledUp: true` when the discovery triggered a level-up, which per FR-2.4 is the normal case.

**One event per skill.** If a run discovers two skills, two events. US-3.2 scenario 3 requires each to be individually attributable, and a combined event cannot satisfy that.

`skill_discovered` is the only event FE needs today. More can be added; FE ignores unknown event names rather than failing.

---

## 4. Errors

```json
{ "error": { "code": "model_timeout", "message": "..." } }
```

FE maps any non-2xx to a request-level failure: a character bubble reporting the problem, a `system` log entry, existing stats untouched (FE-R-17, FE-R-19). `code` is used only to choose wording, so BE can add codes freely.

**FE does not retry.** NFR-2.1's timeout and single retry belong where the model call is. FE retrying as well would produce two retries and double the worst-case wait.

---

## 5. What the mock does that BE does not have to

The mock is FE's own scaffolding and needs no agreement.

- Emits scripted `skill_discovered` events on a timer, **for all three characters** - a mock that only fires for the visible character makes the badge flow untestable, and that flow is the reason Q14 was asked
- Emits at least one clamped response, so FE-R-1 has a standing check
- Emits at least one failure and one SSE drop, so the two failure presentations are exercised without waiting for a real outage

## 6. What the mock cannot prove

Real SSE behaviour through dev-server proxies and buffering intermediaries. A scripted in-process stream is not a network stream.

This is carried as a risk, and it is the reason to attempt one real SSE connection to BE **before** the hour-5.5 checkpoint rather than at it. That connection does not need working endpoints behind it - an SSE route that emits one hardcoded event is enough to find out whether the transport survives the dev setup.

---

## 7. Open items to settle with BE

| Item | Why it is open |
|---|---|
| **How discovery is made to fire on cue** | FR-5.10 triggers on accumulated data volume, so timing is outside the presenter's control. FE has no lever and no fallback if it stays silent during the demo. Needs settling early, not at rehearsal |
| Whether `progression` rides on every response or only when it changes | FE handles either. BE's preference decides |
| Whether a missed announcement should be recoverable after an SSE drop | FE currently loses the badge. Restoring it needs a server-side unseen counter, which is BE scope and may not be worth it |
| `attributes` key vocabulary | Deliberately BE's to choose and expected to change in the per-product phase. Listed so it is clear FE is not waiting on it |
