# frontend

Mobile-first browser app. The character **is** the device UI - there is no
appliance control panel anywhere, because a control panel is the thing this
product exists to remove.

## Run

```bash
npm install          # from the repository root
npm run dev:fe
```

Opens on http://localhost:5173.

**It runs against the mock by default**, so it works with no backend at all.

## Switching to the real backend

The mock is selected by an env flag, so switching is a flag rather than a code
change:

```bash
VITE_USE_MOCK=false npm run dev:fe
```

Anything other than `false` uses the mock. Requests go to `/api/*`, proxied to
`http://localhost:3000` - change the target in `vite.config.ts` if BE runs
elsewhere.

Partial integration works too: point at the real backend and let the routes BE
has not finished yet fail visibly, rather than waiting for all of them.

## Mock controls

While running against the mock, the browser console has:

```js
__mock.announce(0)   // fire a discovery announcement (0, 1 or 2)
__mock.drop()        // drop the SSE connection, recovers after 4s
```

Three announcements also fire on their own at 8s, 20s and 34s after load, one per
character, once each. One of them is for a character you are probably not looking
at, which is what exercises the roster badge.

Two other things the mock does deliberately:

- **It clamps.** Ask for more than 25 minutes and it commits 25 while the reply
  text mentions both numbers. The screen must show 25. That is FR-5.5 in one
  interaction, and it is the five-second proof the demo puts in front of judges.
- **It fails on demand.** Send a message containing `실패` or `fail` and the
  request fails, so the failure presentation is reachable without waiting for a
  real outage.

## Test

```bash
npm run test:fe
```

26 tests: property-based ones over the pure functions, example-based ones over
the reducer. The most important single test is the clamp check in
`tests/pure.test.ts` - it is the executable form of the invariant that displayed
stats come from structured device responses and never from model-generated text.

The property-based tests log their seed on every run. Replay an exact failure:

```bash
PBT_SEED=1234 npm run test:fe
```

## Layout

A column of fixed strips around one region that grows, plus two sheets:

| Region | Content |
|---|---|
| HUD | Back, name, and the level + exp pill. Progression lives here |
| Spotlight | The latest discovery, as a toast off the HUD. Absent between discoveries |
| **Stage** | The character. **The only region that grows.** Level-up and the discovery reaction play here, with the latest utterance captioned beneath |
| Switcher | Dots for the other characters. A swipe on the stage does the same thing |
| Device panel | Device state as one panel of attributes |
| Input bar | Mic and text, always pinned |
| Sheets | Conversation log and skill compendium, raised over the screen rather than routed |

The stage getting the slack is the point, not a layout detail. The speech area had
it first, with the character fixed at 176px, and that made the screen a chat client
with an avatar on top. An announcement reads as the character speaking because the
character is what fills the screen when it speaks.

Progression is at the top and device state near the bottom because they are two
different data classes that must never merge - the display invariant this product
is arguing for. See `business-rules.md`, FE-R-2.

## Character art

`massagechair` has real art: two frame sequences under
`public/characters/massagechair/`, `levelup/` at 56 frames and `surprise/` at 65,
played at 40ms. Frame 0 of `surprise/` is the idle pose. `pral` and `shoecase` have
no assets and render an abstract CSS placeholder with a timed effect instead.

Frames are plain `<img>` swaps with no preloading, so a cold first playthrough can
stutter. Trigger both effects once before presenting and the cache handles it.

## Design documents

- `aidlc-docs/construction/fe/functional-design/` - entities, the 31 rules, flows, components
- `aidlc-docs/construction/fe/functional-design/backend-mock-contract.md` - what FE assumes BE exposes

## Notes for BE

One ask is structural rather than cosmetic, because it changes FE's shape rather
than its parsing:

1. **`deviceState` always a separate field from reply text.** FE enforces FR-5.5
   by having no function that turns a string into stats, which only holds if the
   response separates them.

Everything else - route paths, payload shapes, event names - is a proposal. Change
what is wrong.

### Settled: the events transport is per-character

FE originally asked for one combined SSE stream and claimed per-character streams
could not support the roster badge. That was wrong, and it is settled as of PR #8.

BE serves `GET /api/characters/:productId/events`, one router and one dedicated
agent per product, which FR-5.4's 1:1:1 binding requires. FE opens one
`EventSource` per character, all at app mount rather than on a character screen -
which is what the badge actually needs. Connection count was never the issue;
connection *ownership* was. Nothing about the badge changed and no BE change is
needed here.

The banner shows one status for three connections: `onOpen` waits for all of them,
and any single drop shows it. So one character's channel failing looks like a
total outage - accepted, because the banner only claims that announcements may be
missing, which is true either way.
