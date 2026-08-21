# Integration Test Instructions

**Stage**: CONSTRUCTION - Build and Test
**Created**: 2026-08-21T00:20:00Z
**Status**: COMPLETE. Stage approved 2026-08-21T01:40:00Z

`execution-plan.md` named integration at the seams as the **top risk** of this build and raised the risk level to High for it. This is the stage that risk lands in, so this document is the substance of Build and Test rather than an appendix to it.

Three independently built units meeting for the first time. Manual and scripted, run against real Bedrock and real Friendli - not mocked. Mocking the seams would test the mocks.

---

## 1. Bring the system up

```bash
# terminal 1
npm run dev        # device-stub :4000 + backend :3000

# terminal 2
npm run dev:fe     # frontend
```

Health first, before anything else:

```bash
curl localhost:3000/health
curl localhost:4000/health     # returns pendingEvents and the boot context scenario
```

`device-stub`'s health response tells you whether the flush buffer is moving. A `pendingEvents` count that never drops means the flush loop is not reaching the backend, and every discovery test below will silently do nothing.

## 2. IT-1 - the FR-5.5 clamp, and the test that matters most

**Rule**: displayed device state originates in a structured device response. The agent may cause state to change and may read it; it is not the source of truth for the display.

```bash
# ask the agent, in chat, for 30 minutes on a capability the stub clamps to 25
curl -N -X POST localhost:3000/api/characters/massagechair/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"30분으로 맞춰줘","lang":"ko"}'
```

**Pass**: the UI shows **25**, and the `deviceState` SSE event carries 25. The stub logs `clamped duration: requested 30, applied 25`.

**Fail**: the UI shows 30. That means the display is reading the agent's intent instead of committed state.

### IT-1b - the inverted test, which is the one that actually proves it

Passing IT-1 is necessary and not sufficient. `execution-plan.md` corrected itself on this point at 2026-08-20T04:02:33Z, and the correction is the useful part:

> With BE owning both the device stub and the agent, the risk is that the display gets wired to the same in-process object the agent mutates, bypassing the commit path, so the UI shows intent rather than committed state. Ownership separation never enforced this; it only made the shortcut inconvenient.

So: **suppress the flush and confirm the UI fails to update.**

```bash
FLUSH_INTERVAL_MS=3600000 npm run dev:stub
```

**Pass**: the UI does **not** update after a command. Stale is the correct behaviour here.
**Fail**: the UI updates anyway. The display is on the wrong side of the commit path, and IT-1 was passing for the wrong reason.

**Result: passes.** `device-stub` runs as its own process on its own port, so the state object is genuinely not in the agent's memory. That is what makes this structural rather than a matter of discipline.

## 3. IT-2 - FR-5.11, sensitive data containment

```bash
grep -rn "data/usage" packages/backend/src/tools/     # must return nothing
```

**Pass**: no match. The absent import *is* the enforcement - a runtime guard can be removed by the next person, an absent import cannot be removed by accident.

Then confirm no client-facing route returns raw usage events, and that `GET /skills` omits `content`.

**Caveat, and it is a real weakening.** SSE now carries discovery output, reversing the design decision that kept the channel to Agentic Control only. FR-5.11 on that path therefore depends on **what discovery chooses to emit** rather than on discovery having no channel at all. Check the `discoveryReasoning` event payload by eye; there is no structural guarantee behind it. Recorded in `be/code/be-summary.md` section 4.

## 4. IT-3 - the discovery pipeline, end to end

The deep pillar. This is the run the demo is built around.

```bash
# 1. confirm the fixture seeded at boot - device-stub log
#    [device-stub] seeded N events from massagechair-rain.jsonl
#    Seeding uses /internal/usage/seed, which deliberately does NOT count
#    toward the threshold. If it did, discovery would fire at boot instead of
#    on a live interaction.

# 2. cross the threshold with live interactions - 3 events
#    then watch the backend log for the phase lines:
#    gather -> analyse -> synthesise -> validate -> persist

# 3. confirm the skill reached the real table
aws dynamodb scan --table-name "$DDB_TABLE_NAME" --profile prompthon --region us-east-1

# 4. confirm FE notices it
curl localhost:3000/api/characters/massagechair/skills
```

**Pass**: a skill row exists, `GET /skills` returns it without `content`, and the UI shows the announcement plus a level-up.

**Result: passes**, verified against INFRA's live table `prompthon-runtime-AppTable815C50BC-1O831W9BLPJNG` in account `643922457910`. The test skill was deleted afterwards so the table is empty for the demo run.

### IT-3b - the demo-timing lever

The trigger is accumulated volume, so **nothing guarantees discovery fires while someone is watching.** This was flagged as an unresolved risk in both FE's and BE's functional designs and it is resolved here, by having a lever rather than by changing the trigger:

```bash
curl -X POST localhost:3000/api/characters/massagechair/discovery/run   # wrong path, see below
curl -X POST localhost:3000/internal/discovery/massagechair/run          # correct
```

`409` means a run is already in flight for that product - not an error, just busy. The escape hatch shares the threshold path's in-flight guard and counter reset, so it does not weaken either rule. **Dev only.** Rehearse with it and know it is there.

## 5. IT-4 - announcement latency, the cost of polling

FE learns about a discovery by **polling the skill list**. That kept the announcement unprompted per FR-3.6 and kept SSE clean, at the price of poll-interval latency.

**Measure it on stage conditions**: time from the `persist` log line to the announcement appearing. Bounded by FE's interval.

**Result**: within a poll interval, visible but acceptable. The list response omits `content`, which is what makes a short interval affordable.

## 6. IT-5 - SSE through a real proxy

A scripted in-process mock cannot prove SSE behaviour through dev-server proxies or buffering intermediaries. FE raised this before the hour-5.5 checkpoint precisely so it would not be discovered at it.

**Check**: tokens arrive incrementally in the browser, not as one block at the end. `X-Accel-Buffering: no` is set, `req.on("close")` cleans up, and the connection survives the keep-alive interval.

**Result: passes** through the Vite dev server.

**Note on reconnection**: FE relies on `EventSource`'s **native** reconnection. A hand-rolled exponential backoff was written and then deleted during FE's ponytail review - it was reimplementing the platform, worse.

## 7. IT-6 - cross-unit contract checks

These are the ones that actually failed during the build. Kept as regression checks.

| Check | Why it exists |
|---|---|
| `Key: { id }` works against the deployed table | **This failed for real.** INFRA created `pk`/`sk`; BE addresses by `id` alone. Every read would have thrown `ValidationException`. Table replaced empty at 2026-08-20T12:10:00Z |
| `engines.node` is `>=22` | `@langchain/openai` requires it. `>=20` installs and then fails |
| root `workspaces` includes `infra` | Otherwise CDK dependencies stop installing, and it fails at synth rather than install |
| `.env-example` carries `FRIENDLI_ENDPOINT_ID` | Boot-required and not a secret, so it is easy to leave out |
| `DDB_TABLE_NAME` is set, not defaulted | The `prompthon-local` default does not exist |
| `deviceState` is a separate field from reply text | FE's FR-5.5 enforcement only holds if the response separates them |
| One SSE stream naming its `characterId` per event | FE's badge behaviour needs announcements for a character the user is not currently viewing |

**Both real defects sat at seams rather than inside a unit**, and neither was visible from inside the unit that caused it. That is the finding `execution-plan.md` predicted when it moved the top risk from "the discovery pillar working at all" to "integration at the seams".

## 8. IT-7 - the full demo path

Roster → open a character → chat → command with a clamp → cross the threshold → discovery announcement → level-up → open the skill → invoke it → correct it in chat → switch character by dot or swipe → toggle language.

**Result: passes.** Two things to know while running it:

- **Voice input is not wired.** Transcribe was deferred and never came back. First on the drop order, and it is dropped.
- **FR-2.5 cosmetic evolution is partly held.** The CSS level layer was removed from the character stage when real art landed and the replacement was never built. Cosmetic evolution is met on the roster tile ring only. Second on the drop order, left open deliberately.

## 9. Checkpoints, retrospectively

| Checkpoint | Planned | Outcome |
|---|---|---|
| **Hour 5.5** - thin end to end | "the single most important line in the plan" | Held. FE's in-app mock behind an env flag is what made it possible - without it FE would have waited on BE and roughly a third of team capacity would have idled |
| **Hour 9.0** - full demo path | full path working | Held, minus voice |

The mock was named in `unit-of-work-dependency.md` as the single most consequential item in the dependency document. That assessment was correct.
