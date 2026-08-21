# Performance Test Instructions

**Stage**: CONSTRUCTION - Build and Test
**Created**: 2026-08-21T00:20:00Z
**Status**: COMPLETE. Stage approved 2026-08-21T01:40:00Z

**Scope is deliberately narrow.** This is a single-operator live demo, not a service. Throughput, concurrency and capacity planning are not the question. Exactly one thing here can ruin a demo, and it is latency on the interactive path.

---

## 1. What is worth measuring, and what is not

| Measure | In scope | Why |
|---|---|---|
| Time to first token on chat | **Yes** | This is the character appearing to speak. It is the demo |
| Discovery run wall clock | **Yes, loosely** | Off the request path, so it cannot block an interaction. It can still be long enough that the screen looks hung |
| Announcement latency after `persist` | **Yes** | Polling introduces it, and it is visible on stage |
| Frontend bundle and first paint | **Yes, once** | Already measured at build |
| Throughput, RPS, concurrency | **No** | One operator, one browser tab |
| DynamoDB capacity | **No** | On-demand, and the table holds a handful of skills |
| Load or soak testing | **No** | Nothing to protect |

## 2. The measurement that decided the model

Taken during the INFRA environment survey, 2026-08-20T09:25:00Z, on a realistic request - Korean character prompt, two tool definitions, tool call completed. Median of 3, so differences among Haiku, Sonnet and Opus are partly noise. **Tokens per second is the reliable signal**, not wall clock.

| Model | Wall clock | Output tokens | Tokens/s | Tool call |
|---|---|---|---|---|
| `amazon.nova-lite-v1:0` | 1.11s | 104 | **94** | 3/3 |
| `amazon.nova-pro-v1:0` | 1.53s | 134 | 88 | 3/3 |
| `us.anthropic.claude-haiku-4-5` | 1.87s | 140 | **75** | 3/3 |
| `us.anthropic.claude-opus-4-6-v1` | 2.03s | 76 | 37 | 3/3 |
| `us.anthropic.claude-sonnet-4-6` | 2.42s | 117 | 48 | 3/3 |
| `us.anthropic.claude-sonnet-4-5` | 3.05s | 93 | 30 | 3/3 |

**Opus 4.6 is the default, and streaming is what makes that safe.** A 2-3 sentence Korean reply takes roughly 4.1s against Haiku's 2.9s. Streamed, that reads as the character speaking. Unstreamed, it is four seconds of blank screen.

**This is a binding condition, not advice.** If streaming is ever dropped, revert `BEDROCK_MODEL_ID` to `us.anthropic.claude-haiku-4-5-20251001-v1:0`. The variable exists so that reversal is a config flip rather than a code change.

Also pinned by prompt: `maxTokens` around 300 and an instruction of 2-3 sentences. Opus's wall clock is competitive **because** it answers tersely - 76 output tokens against Haiku's 140 - so that brevity is instructed rather than assumed.

No throttling was observed at 8 concurrent requests for either Opus 4.6 or Haiku 4.5, though concurrent calls queue to about 4.4s and 3.3s respectively. Irrelevant for a single operator, recorded so nobody re-measures it.

## 3. How to re-measure time to first token

```bash
time curl -N -X POST localhost:3000/api/characters/massagechair/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"오늘 뭐하면 좋을까?","lang":"ko"}'
```

Watch for the first `data: {"type":"token"` line, not the end of the stream. The first token is the number that matters; total wall clock is not what the user experiences.

**Acceptable**: first token inside ~2s. **Investigate**: beyond ~4s, which usually means a tool call round-trip to `device-stub` came first rather than the model being slow.

## 4. Discovery run wall clock

Read the phase lines in the backend log:

```
gather -> analyse -> synthesise -> validate -> persist
```

Off the request path by design, so a slow run cannot block a chat turn. What it can do is leave the screen with nothing to show. The mitigations already in place: phase progress is emitted over SSE, and low temperature keeps output shape stable rather than sprawling.

**No target set.** Anything under roughly 30s is comfortable on stage; the escape hatch (`POST /internal/discovery/:productId/run`) exists so a run can be started before it is needed rather than made faster.

## 5. Frontend, measured at build

175.28 kB JS / 56.19 gzipped, 21.80 kB CSS / 5.20 gzipped. Mobile-first, no router, no context provider.

**Character art is the real weight and it is not in the bundle.** 121 `.webp` frames, roughly 3.8 MB for `massagechair`, served static. The size went up from 2.1 MB when frames were re-exported with real alpha to fix an occlusion problem that a CSS mask could not solve safely.

**Open item**: frames have **no preloading**, so a cold first playthrough can stutter. Recorded rather than fixed. The re-export made this more worth doing than it was.

## 6. Cost, since it is adjacent

Roughly **$0.023/hr** for the EC2 instance. Bedrock at demo volume is negligible in absolute terms despite Opus being roughly 20x Haiku per token.

**Stop the instance while idle. Do not `cdk destroy`** - that discards the verified deploy the account-deletion constraint existed to obtain.

## 7. What was not done

- No profiling of the discovery graph's individual nodes. One is a long EXAONE call and the rest are cheap; that was enough to know.
- No frontend runtime profiling beyond visual inspection of the sprite playback.
- No measurement of Transcribe latency. Voice was never wired.
