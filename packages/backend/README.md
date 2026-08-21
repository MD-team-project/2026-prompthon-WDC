# @prompthon/backend

Three Bedrock control agents in a strict 1:1:1 binding with the three products, Skill Discovery on EXAONE, skill persistence in DynamoDB, and the REST plus SSE surface the frontend calls.

Design decisions behind this package: `aidlc-docs/construction/be/functional-design/`. Route and payload detail: `aidlc-docs/construction/be/code/api-examples.md`.

## Running it

`device-stub` must be up first - the agents' device tools call it, and it is the source of the usage events discovery analyses.

```bash
# from the repo root, both processes together
npm run dev

# or separately
npm run dev -w @prompthon/device-stub   # :4000
npm run dev -w @prompthon/backend       # :3000
```

Build and run compiled:

```bash
npm run build        # shared -> device-stub -> backend, in that order
npm run start
npm run check        # tsc -b, no emit
```

## Environment

Copy `.env-example` at the repo root to `.env` and fill it in. `.env` is gitignored and must stay that way.

| Variable | Required | Default | Notes |
|---|---|---|---|
| `FRIENDLI_API_KEY` | **yes** | - | Secret. Boot throws without it. On EC2 it comes from SSM, not `.env` |
| `FRIENDLI_ENDPOINT_ID` | **yes** | - | Dedicated endpoint id, passed as the model name. Not a secret, still required |
| `FRIENDLI_BASE_URL` | no | `https://api.friendli.ai/dedicated/v1` | Override only if Friendli moves the endpoint |
| `DDB_TABLE_NAME` | in practice yes | `prompthon-local` | **The default does not exist.** Get the real value from the `prompthon-runtime` stack output |
| `BEDROCK_MODEL_ID` | no | `us.anthropic.claude-opus-4-6-v1` | The `us.` prefix is mandatory for this account's Anthropic models. Fallbacks: `us.anthropic.claude-haiku-4-5-20251001-v1:0`, `amazon.nova-lite-v1:0` |
| `AWS_REGION` | no | `us-east-1` | The account denies these services elsewhere |
| `PORT` | no | `3000` | |
| `DEVICE_API_URL` | no | `http://localhost:4000` | |
| `CONTEXT_FIXTURES` | no | all | Comma-separated fixture basenames, to load one scenario instead of every `fixtures/*.jsonl` |

Required variables fail **at boot, not at first use**. A demo must not look healthy and then break on stage.

Node 22 or newer. `@langchain/openai` requires it, and that is the mandated EXAONE path.

## Routes

Product-scoped routes are mounted three times, once per product, at `/api/characters/{pral|shoecase|massagechair}`:

| Route | What it does |
|---|---|
| `POST /chat` | **The POST itself is the SSE stream.** Emits `token`, `deviceState` and a final `done`. Prose and device state are always separate fields |
| `GET /skills` | The route the frontend polls to notice new skills. `content` omitted, so polling is cheap |
| `GET /skills/:skillId` | Title and summary. `content` never leaves the backend over REST |
| `POST /skills/:skillId/invoke` | Runs a discovered skill through the agent |
| `GET /device-state` | Demo screen only. The real chat flow gets state inside a turn |
| `GET /events` | Persistent subscription for events that do not arrive inside a chat turn |

Not product-scoped: `GET /health`, the daily-context route, and `/internal/*`.

`/internal/*` is for the device stub and for demo operation, not for the browser:

| Route | What it does |
|---|---|
| `POST /internal/usage/flush` | Flush intake. Returns an accepted count, then fires discovery if the threshold is crossed. Never waits for the run |
| `POST /internal/usage/seed` | Boot-time fixture history. Deliberately does **not** count toward the threshold |
| `POST /internal/discovery/:productId/run` | **Dev only.** Forces a run now, so a demo does not depend on live usage crossing the threshold on cue. `409` means a run is already in flight for that product |

## Two rules that constrain edits here

**FR-5.5 - the agent forwards device state, it never authors it.** Prose and `deviceState` are separate fields on every response that can change state, and `deviceState` is parsed from what a device tool returned. Never compose it from model output, and never wire the display to an object the agent mutates - that shows intent rather than committed state, which is the failure this rule exists to prevent.

**FR-5.11 - accumulated usage history is EXAONE-only.** Nothing under `src/tools/` imports `src/data/usage.ts`. That absent import *is* the enforcement; it is meant to be checkable by reading, not by running something.

## Layout

```
src/
  index.ts        Express bootstrap, port 3000, fixture load at boot
  config.ts       env reading, loud failure on missing required vars
  models/         one construction site each for EXAONE and Bedrock
  data/           DynamoDB client, skills, in-memory usage window, app context
  device/         HTTP client for the device stub
  tools/          agent tools. Never imports data/usage.ts
  agents/         one agent per product, plus shared instructions
  discovery/      StateGraph, relevance check, threshold trigger
  routes/         per-product router, SSE helper, internal, health, context
fixtures/         past-days app context, one .jsonl per scenario
```

## Known gaps

- **No tests in this package.** The four property-based tests scoped for BE under NFR-3.1 - threshold arithmetic, skill round-trip, in-flight guard, flush prefix acceptance - were not written. Recorded in `aidlc-docs/construction/build-and-test/build-and-test-summary.md` rather than left implicit.
- **Usage events live in memory**, not DynamoDB. Restarting loses the accumulation window. Deliberate for the scaffold; it is also why the table only holds skills.
- **Skill removal is a hard delete**, not the `status: retired` transition the functional design specified.
- **No auth.** One hardcoded demo user. A public deployment needs the NFR-5.2 passcode gate first.
