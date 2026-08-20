# BE API examples, captured live

For FE: exactly what to send and exactly what comes back, captured from real
requests against a running backend (real Bedrock, real Friendli/EXAONE - not
mocked). Every block below is unedited request/response content, not a
hand-written approximation of the shape.

Type contracts referenced here live in `packages/shared/src/index.ts`
(`ControlEvent`, `AgentReply`, `DeviceState`, `SkillRecord`, `SkillSummary`).

## What was live-verified while capturing this (2026-08-20)

- All three product chat endpoints: SSE token streaming, tool calls, and the
  final `deviceState`/`done` envelope - working.
- All three fixture scenarios' Skill Discovery pipeline through
  `discoveryProgress` (`started`→`analysing`→`found`) and the full,
  untruncated `discoveryReasoning` event - working.
- **The full pipeline end to end, including DynamoDB**: `save` (`putSkill`)
  against INFRA's real deployed table
  (`prompthon-runtime-AppTable815C50BC-1O831W9BLPJNG`, account
  `643922457910`), the resulting `skillDiscovered` SSE event, and all three
  `GET/POST /skills*` REST routes reading that same real data back - all
  confirmed against the live table (§2b/§3 below are real captures, not
  shape-only). The account-access gap that blocked this earlier is resolved.
  The test skill created during this capture was deleted afterward
  (`aws dynamodb delete-item`) so the table is empty again for the actual
  demo run.

---

## 1. Chat - `POST /api/characters/<productId>/chat`

One router per product (`massagechair`, `shoecase`, `pral`), same shape for
all three. Request body: `{"message": string}`. Response: `text/event-stream`,
one `data: <ControlEvent>` per SSE message, ending in exactly one `done`.

Event types that appear here (see `ControlEvent` in shared/src/index.ts):
- `{"type":"token","text":string}` - one streamed prose chunk. Concatenate in
  order to get the full reply text.
- `{"type":"deviceState","state":DeviceState}` - emitted every time a tool
  call changes device state. **This is the only source of truth for device
  stats** - never compose them from the prose text.
- `{"type":"done","reply":AgentReply}` - always last. `AgentReply.prose` is
  the full concatenated text (for convenience - it's the same text as the
  `token` chunks joined together). `AgentReply.deviceState` is the *last*
  `deviceState` seen this turn, if any. `AgentReply.failure` is present
  instead of a normal reply if the model call itself failed.

### 1a. MassageChair

```
REQUEST: POST /api/characters/massagechair/chat
Headers: Content-Type: application/json
Body: {"message":"Turn the chair on and set it to a deep lower back massage, intensity 4, for 20 minutes."}
```

```
data: {"type":"deviceState","state":{"productId":"massagechair","power":"on","attributes":{},"updatedAt":"2026-08-20T12:58:51.090Z"}}

data: {"type":"deviceState","state":{"productId":"massagechair","power":"on","attributes":{"zone":"lowerBack"},"updatedAt":"2026-08-20T12:58:51.091Z"}}

data: {"type":"deviceState","state":{"productId":"massagechair","power":"on","attributes":{"zone":"lowerBack","level":4},"updatedAt":"2026-08-20T12:58:51.091Z"}}

data: {"type":"deviceState","state":{"productId":"massagechair","power":"on","attributes":{"zone":"lowerBack","level":4,"minutes":20},"updatedAt":"2026-08-20T12:58:51.091Z"}}

data: {"type":"token","text":"All"}

data: {"type":"token","text":" set"}

... (many more token chunks, omitted here - see the full reply in "done" below) ...

data: {"type":"done","reply":{"prose":"All set! Here's what I've got going for you:\n\n- **Power:** On ✅\n- **Zone:** Lower back\n- **Intensity:** 4 (strong)\n- **Duration:** 20 minutes\n\nYou're all locked in for a deep lower back session. Let me know if you'd like to adjust anything — add some heat, tweak the recline, or turn on the airbags. Enjoy! 💆","deviceState":{"productId":"massagechair","power":"on","attributes":{"zone":"lowerBack","level":4,"minutes":20},"updatedAt":"2026-08-20T12:58:51.091Z"}}}
```

Note: one `deviceState` event per tool call (here: `power`, `setRollerZone`,
`setIntensity`, `setDuration` - four separate massage-chair-specific tools,
not one generic "apply command" call). `attributes` accumulates across the
turn; each event is the *full* state at that point, not a diff.

### 1b. ShoeCase

```
REQUEST: POST /api/characters/shoecase/chat
Headers: Content-Type: application/json
Body: {"message":"Dry my sneakers at 45 degrees with UV sterilization on for 20 minutes."}
```

```
data: {"type":"deviceState","state":{"productId":"shoecase","power":"on","attributes":{},"updatedAt":"2026-08-20T12:59:06.671Z"}}

data: {"type":"deviceState","state":{"productId":"shoecase","power":"on","attributes":{"celsius":45},"updatedAt":"2026-08-20T12:59:09.411Z"}}

data: {"type":"deviceState","state":{"productId":"shoecase","power":"on","attributes":{"celsius":45,"on":true},"updatedAt":"2026-08-20T12:59:09.411Z"}}

data: {"type":"deviceState","state":{"productId":"shoecase","power":"on","attributes":{"celsius":45,"on":true,"minutes":20},"updatedAt":"2026-08-20T12:59:09.412Z"}}

data: {"type":"token","text":"All"}

... (token chunks omitted) ...

data: {"type":"done","reply":{"prose":"All set! Here's what I've configured for your sneakers:\n\n- **Power:** On\n- **Temperature:** 45°C\n- **UV Sterilization:** On\n- **Duration:** 20 minutes\n\nYour sneakers are now drying with UV sterilization. They'll be fresh and dry in 20 minutes! Let me know if you'd like to adjust anything.","deviceState":{"productId":"shoecase","power":"on","attributes":{"celsius":45,"on":true,"minutes":20},"updatedAt":"2026-08-20T12:59:09.412Z"}}}
```

Note: ShoeCase's `on` attribute here comes from its `setUv` tool (`{on:
boolean}`) - same key name as MassageChair's `power` tool coincidentally, but
a different capability. FE should key off which tool fired (visible in
backend logs, not in the SSE stream) only if it needs per-capability
granularity; for rendering current state, `attributes` as a whole is always
enough.

### 1c. Pra.L (deferred product - generic capability tools)

Pra.L doesn't have a settled capability set yet, so it stays on the generic
`listCapabilities`/`applyCommand` tools rather than named ones. The
`deviceState` shape FE receives is identical either way.

```
REQUEST: POST /api/characters/pral/chat
Headers: Content-Type: application/json
Body: {"message":"What can you do, and can you start a quick session?"}
```

```
data: {"type":"deviceState","state":{"productId":"pral","power":"off","attributes":{},"updatedAt":"2026-08-20T12:58:34.458Z"}}

data: {"type":"token","text":"Here's what"}

... (token chunks omitted) ...

data: {"type":"deviceState","state":{"productId":"pral","power":"on","attributes":{},"updatedAt":"2026-08-20T12:59:19.970Z"}}

data: {"type":"token","text":"Powered"}

... (token chunks omitted) ...

data: {"type":"deviceState","state":{"productId":"pral","power":"on","attributes":{"mode":"quick"},"updatedAt":"2026-08-20T12:59:22.813Z"}}

... (token chunks omitted) ...

data: {"type":"done","reply":{"prose":"Here's what I can do:\n\n- **Power** – Turn me on or off\n- **Start a session** – In three modes: **standard**, **quick**, or **deep**\n- **Stop** – End the current session\n- **Set duration** – Anywhere from 5 to 25 minutes\n\nRight now I'm powered off. Let me turn on and kick off a quick session for you!Powered on! Now starting your quick session…All set! ✅ Your **quick session** is now running. Let me know if you'd like to adjust the duration (5–25 minutes), switch modes, or stop whenever you're done. Enjoy!","deviceState":{"productId":"pral","power":"on","attributes":{"mode":"quick"},"updatedAt":"2026-08-20T12:59:22.813Z"}}}
```

Note: multiple `deviceState` events in one turn (power on, then mode set) -
this is normal whenever the model makes more than one tool call in a turn.

---

## 2. Skill Discovery - persistent per-product SSE, `GET /api/characters/<productId>/events`

Runs in the background (triggered by usage crossing a threshold, not by a
chat turn), so FE subscribes to this separately and keeps it open. Event
types that appear here:

- `{"type":"discoveryProgress","productId":ProductId,"phase":"started"|"analysing"|"found"|"noPattern"}`
- `{"type":"discoveryReasoning","productId":ProductId,"attempt":number,"reasoning":string,"response":string}` -
  the full, untruncated EXAONE reasoning trace and final response text for
  that attempt. `attempt` can be 2 if the first attempt found no pattern (one
  retry before giving up, to avoid a mid-demo re-trigger).
- `{"type":"skillDiscovered","productId":ProductId,"skill":SkillSummary}` -
  fires once the skill is actually persisted (real capture below, §2b).
  `SkillSummary` = `SkillRecord` minus `content`: `{id, productId, title,
  createdAt}`.

### 2a. MassageChair, plain recurring pattern (`massagechair-simple` fixture)

```
data: {"type":"discoveryProgress","productId":"massagechair","phase":"started"}

data: {"type":"discoveryProgress","productId":"massagechair","phase":"analysing"}

data: {"type":"discoveryReasoning","productId":"massagechair","attempt":1,"reasoning":"We need to analyze the data. There are 60 days from July 21 to August 20, 2026. Each day has device events for a massagechair. The events are setRollerZone_invoked and setIntensity_invoked, both with params: zone=\"lowerBack\" and level=4. ... Since context is null, there is no context correlation. So we report a plain recurring pattern.\n\nThus, response: TITLE: Daily Lower Back Massage Routine\n\n...","response":"\n\nTITLE: Daily Lower Back Massage Routine\n\n## Skill: Evening Lower Back Relief\n\n**Pattern Description:**  \nEvery day from July 21 to August 20, 2026, the user consistently uses the massagechair with the roller zone set to \"lowerBack\" and intensity at level 4, typically between 20:00 and 20:09. ... this is a plain recurring pattern.\n\n**What This Suggests About the User's Needs:**  \n...\n\n**What the Character Could Do in the Future:**  \n- Automatically set the massagechair to lowerBack zone and intensity 4 each day around 8 PM, unless the user explicitly overrides it.  \n..."}

data: {"type":"discoveryProgress","productId":"massagechair","phase":"found"}
```

(This particular run predates DynamoDB access, so it isn't shown ending in a
`skillDiscovered` event here - §2b below is the same pipeline captured after
that was resolved, ending in a real `skillDiscovered` event.)

### 2b. MassageChair, weather-correlated pattern (`massagechair-rain` + `app-context-rain` fixtures) - full real capture including DynamoDB save

This is the demo-headline scenario: a genuinely context-correlated skill
(weather → different massage settings), not just a repeated daily routine.
This run is captured end to end, including the real `skillDiscovered` event
against INFRA's live table - nothing in this block is shape-only.

```
data: {"type":"discoveryProgress","productId":"massagechair","phase":"started"}

data: {"type":"discoveryProgress","productId":"massagechair","phase":"analysing"}

data: {"type":"discoveryReasoning","productId":"massagechair","attempt":1,"reasoning":"We are given 60 days of data? Actually the JSON shows only 10 days (Aug 10 to Aug 20). ... So pattern: On rainy days (weather=\"rain\"), the user sets lowerBack zone, intensity 5, duration 25. On clear days, the user sets legs zone, intensity 2, duration 10. This is a clear context-correlated pattern based on weather. ... On Aug 20, context is null but device settings match rainy pattern (lowerBack, intensity 5, duration 25). Possibly it was rainy? ... So it's a context-correlated pattern.\n\nThus we should report this pattern.\n\n...","response":"\n\nTITLE: Rainy vs Clear Day Massage Preferences\n\n## Skill: Weather-Dependent Massage Settings\n\n### Pattern Description\nThe user consistently selects different massage chair settings based on the weather:\n- **Rainy days**: lowerBack zone, intensity level 5, duration 25 minutes.\n- **Clear days**: legs zone, intensity level 2, duration 10 minutes.\n\nThis pattern holds across all available data (8 rainy days, 5 clear days, and 1 day with missing context but matching the rainy pattern). Distance traveled and screen time do not correlate with the settings; weather is the only consistent differentiator.\n\n### What It Suggests About the User's Needs\nThe user likely associates rainy weather with relaxation and muscle tension relief ... requiring a deeper, longer massage focused on the lower back. Clear days ... leading to a preference for a lighter, shorter massage targeting the legs to ease fatigue.\n\n### What the Character Could Do in the Future\nThe product character ... can automatically adjust the massage settings based on the forecast or real-time weather data. On rainy days, it could default to lowerBack zone, high intensity, and longer duration. On clear days, it could default to legs zone, low intensity, and shorter duration. This proactive adaptation would enhance user satisfaction by anticipating their needs without requiring manual input each day."}

data: {"type":"discoveryProgress","productId":"massagechair","phase":"found"}

data: {"type":"skillDiscovered","productId":"massagechair","skill":{"id":"fb99b60c-006b-4839-8572-20db1e44f073","productId":"massagechair","title":"Rainy vs Clear Day Massage Preferences","createdAt":"2026-08-20T13:37:02.684Z"}}
```

(This exact skill was deleted from the real table after capture - the id
above won't resolve if you look it up. It's shown to demonstrate the real
shape, not as a live fixture.)

### 2c. ShoeCase, plain recurring pattern (`shoecase-simple` fixture)

```
data: {"type":"discoveryProgress","productId":"shoecase","phase":"started"}

data: {"type":"discoveryProgress","productId":"shoecase","phase":"analysing"}

data: {"type":"discoveryReasoning","productId":"shoecase","attempt":1,"reasoning":"We are given 60 days of data for a shoecase device. Each day has deviceEvents: setTemperature_invoked and setDuration_invoked, both with parameters: celsius=45 and minutes=20. The context is null for all days. ... Since context is null for all days, there is no context to correlate. So we should report a plain recurring pattern.","response":"\n\nTITLE: Daily Shoe Care Routine\n\n## Skill: Consistent Shoe Case Settings\n\n**Pattern Description**  \nEvery day from July 21 to August 20, 2026, the user invoked `setTemperature` with `celsius: 45` and `setDuration` with `minutes: 20` on the shoecase device. ...\n\n**What This Suggests About the User's Needs**  \n...\n\n**What the Character Could Do in the Future**  \n- Automatically apply the saved settings (45°C, 20 min) each evening without user input.  \n..."}

data: {"type":"discoveryProgress","productId":"shoecase","phase":"found"}
```

### If no pattern is found

Not captured live (all three fixture scenarios above reliably find a
pattern - that's by design, see the demo-reliability retry in
`discovery/graph.ts`), but the shape is simple:

```
data: {"type":"discoveryProgress","productId":"<id>","phase":"noPattern"}
```

with a `discoveryReasoning` event (possibly two, one per retry attempt)
preceding it, same shape as above.

---

## 3. Skills REST - `GET /skills`, `GET /skills/:skillId`, `POST /skills/:skillId/invoke`

Real captures, same skill as §2b, against INFRA's live table.

```
GET /api/characters/massagechair/skills
-> 200 [{"createdAt":"2026-08-20T13:37:02.684Z","id":"fb99b60c-006b-4839-8572-20db1e44f073","productId":"massagechair","title":"Rainy vs Clear Day Massage Preferences"}]
   (key order isn't guaranteed - treat this as a plain object, e.g. don't
   assume "id" comes before "createdAt")
   (or [] if none discovered yet - also confirmed live, both before this
   skill existed and after it was deleted)

GET /api/characters/massagechair/skills/fb99b60c-006b-4839-8572-20db1e44f073
-> 200 {"content":"## Skill: Weather-Dependent Massage Settings\n\n### Pattern Description\n...","createdAt":"2026-08-20T13:37:02.684Z","id":"fb99b60c-006b-4839-8572-20db1e44f073","productId":"massagechair","title":"Rainy vs Clear Day Massage Preferences"}
   (SkillRecord: SkillSummary's fields plus "content", the full Markdown)
-> 404 {"failure":{"code":"NOT_FOUND","message":"skill not found"}}   (shape from the type contract - trivially true, not separately re-verified this round)

POST /api/characters/massagechair/skills/fb99b60c-006b-4839-8572-20db1e44f073/invoke
-> 200 {"prose":"I'd love to help follow that skill! However, I need to know one thing first: **what's the weather like today?**\n\nSince the skill depends on whether it's a rainy day or a clear day to determine the right settings, I need you to tell me the current weather (or I'd need access to weather data, which I don't have).\n\nHere's what I'll set based on your answer:\n\n- ☔ **Rainy day** → Lower back zone, intensity 5, 25 minutes\n- ☀️ **Clear day** → Legs zone, intensity 2, 10 minutes\n\nWhich one should I go with?","invokedSkillId":"fb99b60c-006b-4839-8572-20db1e44f073"}
```

Worth noting for FE: `/invoke` doesn't blindly apply the skill's settings -
here the model correctly recognized the skill is conditional on today's
weather (which it has no way to know) and asked a clarifying question
instead of guessing. No `deviceState` came back this time because no device
tool was actually called; that's expected, not a bug. A skill whose
condition it *can* resolve on its own (e.g. a plain recurring pattern with
no context dependency) would call the device tool and return normally.
