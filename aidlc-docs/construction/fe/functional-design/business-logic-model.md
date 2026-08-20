# FE Business Logic Model

**Stage**: CONSTRUCTION - Functional Design
**Unit**: FE
**Generated**: 2026-08-20T08:30:00Z

## What this document is

The user-facing flows end to end, with the decision points named. Rule references are to `business-rules.md`.

---

## 1. Screen model

Two views, no router (Q4 A). The character view is a column of strips around one growing region, plus two sheets.

| Region | Content | Size |
|---|---|---|
| HUD | Back, name, and the level + exp pill. Progression lives here | Fixed |
| Spotlight | The most recent discovery, as a toast hung off the HUD. Absent between discoveries | Fixed, or nothing |
| Stage | Character art. Level-up and the discovery reaction play here, and the latest utterance is captioned beneath | **Fills remaining space** |
| Switcher | Dots for the other characters, with the swipe on the stage doing the same thing. Absent below two characters | Fixed, or nothing |
| Device panel | Device state as one bordered panel of attributes | Fixed |
| Input bar | Mic and text input | Fixed, bottom |
| Sheet | Conversation log, raised over everything | On demand |
| Sheet | Skill compendium, raised over everything | On demand |

The character is the centre and chat is secondary but always reachable. This is what Q5 D decided, and it is why the announcement lands as the character speaking rather than as a log line.

**The stage is the only region that grows, and that is the load-bearing part.** The first build gave the growth to the speech area and fixed the character at 176px, which made the screen a chat client with an avatar above it - the opposite of what Q5 D decided. Inverting the budget is what makes an announcement read as the character speaking, because the character is what fills the screen when it speaks.

**Progression and device state sit at opposite ends of the column and never merge** (FE-R-2). They were one stat header in the original design; splitting them apart made the rule stronger, since neither component can now reach the other's data. The two sheets were one overlay in the original design, for the same kind of reason - the log outgrew being a region inside the stage.

---

## 2. Flow: application load

```
+-------------+     +------------------+     +--------+
| app mounts  | --> | open SSE (one)   | --> | roster |
+-------------+     +------------------+     +--------+
```

1. Read `lang` from `localStorage`, default `ko` (FR-8.1).
2. Open the single app-wide SSE connection (FE-R-27). Set `sse` to `connecting`, then `open`.
3. Fetch the three characters, including level and exp.
4. Render the roster. No login step (FR-7.3).

Conversation history is not fetched, because it does not exist client-side and is not persisted (FE-R-26).

**Failure at step 3**: render the roster with whatever arrived and a request-level failure message. Never a blank screen (FE-R-19).

**Failure at step 2**: roster renders, connection banner appears (FE-R-17, FE-R-18). Everything user-initiated still works; only unprompted announcements are lost, which is exactly what the banner communicates.

---

## 3. Flow: select a character

1. Set `view` to `character` and `selectedCharacterId`.
2. Clear that character's badge (FE-R-29).
3. Fetch that character's device state and skill list.
4. Render the character view.

The SSE connection is untouched. It was opened at app mount and is not per-character.

Switching between characters afterwards does not go back through the roster: the switcher dots and a horizontal swipe on the stage both run this same flow from step 1. The roster remains the entry point (FR-7.2, FR-7.3), but requiring a return trip made three characters read as three rows in a list rather than three characters sharing a stage.

---

## 4. Flow: send a text message

```
+-------+     +---------+     +--------------+     +----------+
| input | --> | validate| --> | POST message | --> | render   |
+-------+     +---------+     +--------------+     +----------+
                                     |
                                     v
                            reply text + deviceState
```

1. Trim. Reject if empty. Enforce the length cap (FE-R-23).
2. Append the user's utterance to the speech area immediately. This is not optimistic - it is a record of what the user did, not a prediction of any result.
3. Set `pending[characterId]` true. The stats block shows the neutral in-flight marker (FE-R-3).
4. `POST` the message with `lang` attached automatically (FE-R-24).
5. On response: render the reply as a character bubble from `text`. Replace `DeviceStats` from `deviceState`. Clear `pending`.
6. If the response carries a level change, play the in-place level-up effect (FE-R-8).

**The step that matters**: the reply text and the stats are taken from two different fields of the same response and are never crossed (FE-R-1). The clamp case - the user asks for 30, the device commits 25 - renders 25 because 25 is what `deviceState` says, while the prose may well mention 30.

**On failure after timeout and one retry** (NFR-2.1): clear `pending` (FE-R-4), render a character bubble reporting the failure plus a `system` log entry (FE-R-17), leave existing stats untouched (FE-R-19).

---

## 5. Flow: send a voice message

```
+---------+     +--------+     +------------+     +--------------+
| hold mic| --> | record | --> | POST audio | --> | draft in     |
+---------+     +--------+     +------------+     | text input   |
                                                  +--------------+
                                                         |
                                                         v
                                                  user confirms
                                                         |
                                                         v
                                                  flow 4 from step 1
```

1. Request microphone permission. Denied or unavailable, the mic affordance reports itself and the text path is untouched (FE-R-20).
2. Capture the utterance with `MediaRecorder`.
3. `POST` the blob to BE, which streams it to Transcribe. No credential and no direct Transcribe call in the browser (FE-R-6).
4. Place the returned transcript in the text input as an **editable draft** (FE-R-21).
5. The user confirms, and the flow becomes flow 4 from step 1.

Voice never reaches the agent directly. It becomes text, and then it is indistinguishable from typed input - which is what FR-4.2 requires.

Voice is first in the drop order, so this flow is built as an addition that can be removed without touching flow 4.

---

## 6. Flow: an announcement arrives

The only server-initiated flow. One SSE stream carries events for all three characters, and the event's `characterId` decides what happens.

**Case A - the announcement is for the character on screen**

1. Render the announcement as a character speech bubble, styled as an announcement.
2. Insert the new skill into the compendium list.
3. Play the character's discovery reaction (FE-R-10b), and the in-place level-up effect too if a level change accompanied it. Level-up wins if both fire.
4. When the reaction finishes, the spotlight toast appears naming what was found.

Steps 1 and 3 are not synchronised (FE-R-9). The effect runs 1.5-2.2s depending on whether the product has real frames, so the bubble usually lands while it is still playing, and the character is mid-reaction when it speaks.

**Step 4 is sequenced, and it is the one place sequencing is worth its cost.** The toast waits for step 3 to finish rather than appearing with it. The character reacting and then the label explaining the reaction reads as one event; both at once reads as two unrelated things. This is cheap to sequence because the effect reports its own completion, so there is no timer to keep in step.

**Case B - the announcement is for a character not on screen**

1. Increment `unseen[characterId]`.
2. Render the badge on that character in the roster and on the back control (FE-R-28).
3. Render nothing else. No toast, no navigation.

**Multiple skills in one run**: one announcement event per skill, so bubbles queue and each skill is individually attributable (US-3.2 scenario 3). A single combined announcement would fail that scenario.

---

## 7. Flow: invoke a skill

1. From the compendium, the invoke button on a card sends the skill's `id` (FE-R-31).
2. Set `pending`, show the in-flight marker.
3. On response: update `DeviceStats` from `deviceState`, render the character's confirmation from `text`, clear `pending`.
4. On partial failure: report it (FE-R-17). FE does not attempt to revert anything - US-3.3 scenario 3 requires that already-applied commands are not silently reverted, and reverting is not FE's to do in any case.

A newly discovered skill is invocable immediately. Nothing is gated by level (FE-R-14).

---

## 8. Flow: give feedback on a skill

```
+------------+     +-----------------+     +------------------+
| skill card | --> | overlay closes, | --> | user speaks or   |
| "talk"     |     | input focused,  |     | types one line   |
+------------+     | skillId bound   |     +------------------+
                   +-----------------+              |
                                                    v
                                        POST text + skillId
                                                    |
                                                    v
                                     character confirms in a bubble,
                                     skill card updates in place
```

1. The card's talk action closes the compendium, focuses the input, and sets `feedbackContext` to that skill id.
2. A context badge on the input bar shows which skill the next message is about.
3. The user writes or speaks natural language only.
4. `POST` text plus `skillId` (FE-R-30).
5. On response: the character confirms in a bubble, and the skill card updates **in place** with `revisedAt` set - same id, not removed and re-added (FE-R-16). A retirement removes it from the active list instead (FE-R-15).
6. Clear `feedbackContext`.

This is the demo's strongest beat, and the design exists to make it reliable: a judge looking at a card taps once, says one sentence, and watches that card change. No re-identifying a skill by speech, no ambiguity for BE to resolve.

---

## 9. Flow: switch language

1. Toggle `lang`, write it to `localStorage`.
2. Interface strings re-render from the dictionary.
3. Every subsequent request carries the new `lang` automatically (FE-R-24), so replies switch too.
4. Nothing existing is rewritten - skill names, past messages, generated text all stay (FE-R-25).

Third in the drop order. Dropping it means leaving the `en` dictionary unfilled and hiding the toggle.

---

## 10. Flow: SSE drops and recovers

1. `sse` becomes `dropped`. The non-dismissible banner appears (FE-R-17, FE-R-18).
2. **`EventSource` reconnects on its own**, and honours the server's `retry:` interval while doing it. FE adds one fixed 3s retry for the single case the platform does not cover: `readyState === CLOSED`, where the browser has given up. That is exactly what a dev-server proxy killing the stream produces, which is the SSE risk already on record.
3. On success, `sse` becomes `open` and the banner disappears by itself.

An earlier version of this flow specified FE-side exponential backoff. It was removed during review as a reimplementation of a platform feature, and a worse one - hand-rolled backoff cannot honour `retry:` because it does not see it.

**Announcements missed while disconnected** are not replayed by FE. They are present in the character's state when next fetched, since skills are persisted by BE. The badge for a missed announcement is lost - recorded as an accepted limitation rather than solved, because reconstructing it needs a server-side unseen counter, which is BE scope and worth more than it costs here.

Everything user-initiated keeps working throughout. REST and SSE are separate transports, so a dropped stream degrades unprompted announcements only.

---

## 11. Flow: refresh mid-demo

1. Flow 2 runs again. `lang` survives via `localStorage`.
2. Level, exp, and skills come back from BE unchanged (NFR-2.3).
3. The conversation is empty, and that is the specified outcome (FE-R-26).
4. `view` resets to the roster, since it is in-memory state.

Point 4 is a rehearsal annoyance: reaching a character screen takes one extra tap after every refresh. If it becomes irritating during rehearsal, an env flag that opens a given character at startup solves it without adding a router, reusing the same flag mechanism the mock already uses.

---

## 12. Where the mock sits

```
+-----------+     +-----------+     +------------------+
| component | --> | apiClient | --> | real BE  (flag)  |
+-----------+     +-----------+     +------------------+
                        |
                        +---------> +------------------+
                                    | mock (flag)      |
                                    | scripted SSE     |
                                    +------------------+
```

One `apiClient` with two implementations selected by an env flag (Q2 A). Every flow above runs identically against either.

The mock's fake SSE stream must emit announcements for **all three characters**, not only the one on screen - otherwise the badge flow in section 6 case B is untestable, and that flow is the reason Q14 was asked.

**What the mock cannot prove**: real SSE behaviour through dev-server proxies and buffering intermediaries. Carried as a risk, and the reason to attempt one real SSE connection before the hour-5.5 checkpoint rather than at it.
