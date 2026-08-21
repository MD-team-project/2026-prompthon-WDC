# Demo Scenario - Run of Show

**Stage**: CONSTRUCTION - joint artifact (US-5.1)
**Created**: 2026-08-20
**Revised**: 2026-08-20, after FE's PR (`aidlc/construction-fe`) and BE's `9cdec8f`
**Event**: 2026 LG 프롬프톤 챌린지, 예선 최종 심사 2026-08-21 14:00-16:00
**Format**: 5 minute presentation + **2 minute live demo**, per team
**Judging**: 흑백요리사 방식 - judges circulate, so the demo is run **repeatedly**, not once

Stage lines are written in Korean because that is what is spoken. Everything else
follows the project convention of English documents.

---

## 1. What the format forces

| Constraint | Consequence |
|---|---|
| **2 minutes** | Four beats maximum. No feature tours, no roster walkthrough |
| **Judges circulate** | Must be **resettable in under a minute** and survive 5+ runs |
| **25 points for 발표력·전달력** | The narration is scored. Every beat needs one sentence that lands |

Rubric: 문제정의·사용자이해 25 / 솔루션 창의성·실현가능성 25 / 기술활용·구현완성도 25 /
발표력·전달력 25. EXAONE usage is a **pass/fail check item with no points** - make it
unmistakable, but do not spend demo time defending it.

---

## 2. Revision summary - what FE's PR and BE's `9cdec8f` changed

Both landed after the first draft of this document. Four things changed materially.

| Change | Effect on the demo |
|---|---|
| **BE: `checkTodayForRelevantSkill`** - proactive skill suggestion | **New closing beat.** Closes the discovery loop, which the demo previously left open |
| **BE: per-product named tools** with zod-enforced ranges | **The clamp proof is dead.** See §7 |
| **BE: all three products live-verified**, incl. Pra.L | Pra.L is operable, but still has no art |
| **FE: real app exists**, `massagechair` has real sprite art | Demo product is now settled by asset availability, not just preference |

Two of these need a code fix before they work on stage. See §5.

---

## 3. Decisions locked

| Decision | Value |
|---|---|
| Demo surface | **FE on `aidlc/construction-fe`**, run with `VITE_USE_MOCK=false` |
| Products on the roster | **All three** - Pra.L, ShoeCase, 마사지체어 |
| Product operated | **마사지체어.** It is the only one with real character art |
| Discovery scenario | Rain correlation (`massagechair-rain.jsonl` + `app-context-rain.jsonl`) |
| Voice input | **Excluded.** Mic is forced `unavailable` in real-API mode; no `/api/transcribe` |
| Skill tiering (14일/60일) | **Excluded.** BE has no tier concept; FE maps everything to `basic` |

**Pra.L and ShoeCase now respond for real** (BE live-captured all three in
`api-examples.md`), but neither has character art - they render the CSS placeholder.
So they are safe to open if a judge insists, just visually unfinished. Prefer
redirecting: *"세 제품이 같은 파이프라인에 붙어 있고, 오늘은 마사지체어로 보여드리겠습니다."*

---

## 4. The demo asset

The fixture encodes a **context-correlated** behaviour over 8/10-8/19:

| Day type | App context | Settings chosen |
|---|---|---|
| **비** | 이동거리 ~3km, 스크린타임 높음 | `lowerBack`, 강도 5, 25분 |
| **맑음** | 이동거리 ~8-9km | `legs`, 강도 2, 10분 |

Discovery joins device events with app context **by calendar date** and asks EXAONE
for one genuine recurring pattern, preferring a context-correlated one.

**Why this is more than a preset lookup**: the device vocabulary is *raw settings* -
`setRollerZone`, `setIntensity`, `setDuration`. There is no `mode: "rainyDay"` in the
menu to rediscover. The discovered skill is a **new named combination the user drifted
into without noticing**. That sentence is the core of the pitch.

### Trigger arithmetic - confirmed against `api-examples.md`

- Fixture history enters via `/internal/usage/seed` and **does not count** toward the threshold.
- Live interactions flush every **3 seconds**; discovery threshold is **3 new events**.
- Named tools mean **one tool call per setting**. BE's live capture of a
  power + zone + intensity + duration request produced **four** `deviceState` events.

So one natural sentence reliably crosses the threshold - and the named-tool split made
this *more* reliable than the earlier generic `applyCommand`. Still lock the wording in
rehearsal.

---

## 5. Two fixes that would unlock a fourth beat - DEFERRED, not being applied

**Decision 2026-08-20: no code or fixture changes. The locked run of show is three
beats** (§6, Beats 1-3), all of which work against the current implementation as
committed. Beat 4 is documented here as a known upside, not as part of the plan.

Both gaps below fail **silently**. Neither shows an error; the beat just does not
happen. So if anyone does land these, verify the beat rather than assuming it.

### Fix 1 - the fixture has no entry for demo day (blocks the closing beat)

`getTodayContext()` in `packages/backend/src/data/appContext.ts` reads the **real system
date** and looks for an exact match:

```ts
const today = new Date().toISOString().slice(0, 10);
return context.find((c) => c.date === today) ?? null;
```

`app-context-rain.jsonl` covers **2026-08-10 to 2026-08-19**. The demo is **2026-08-21**,
so this returns `null`, `checkTodayRelevance` returns `null`, and the proactive
suggestion never fires.

**Fix**: append a rain-day entry dated `2026-08-21` to
`packages/backend/fixtures/app-context-rain.jsonl`, matching the rain profile so it
matches the discovered skill's condition:

```json
{"date":"2026-08-21","distanceKm":3.0,"weather":"rain","screenTimeMinutes":128}
```

`readContextWindow(60)` is a rolling 60-day window, so the existing 8/10-8/19 history
stays in range and discovery is unaffected. **Only the same-day lookup is broken.**

### Fix 2 - FE never sends the "just opened" signal (blocks the same beat)

BE is ready: `routes/character.ts` treats an empty or missing `message` as
`isOpening` and feeds the agent `"[The user just opened this chat - they haven't said
anything yet.]"`, which is what prompts `checkTodayForRelevantSkill`.

FE never sends it. Its only `sendMessage` call is `App.tsx:134`, from user input;
`selectCharacter` (`App.tsx:110`) sends nothing.

**Fix**: on entering a character screen, call `sendMessage(characterId, '', null)`.
Roughly one line plus a guard so it fires once per entry rather than on every render.

**If either fix does not land, drop Beat 4.** It removes the closing beat cleanly and
the other three beats are unaffected. Do not leave it in and hope.

---

## 6. Run of show - 2 minutes

**Pre-staged**: backend `:3000`, `device-stub` `:4000`, FE with
`VITE_USE_MOCK=false`, fixture seeded, 마사지체어 character screen open, server log
terminal on a second screen, device state clean, skill list empty.

### Beat 1 - Natural language control (~20s)

**Do**: `허리 좀 뭉쳤어, 강하게 25분 해줘`

**On screen**: streamed reply; stat strip shows zone/level/minutes. No settings panel.

**Say**: *"설정 화면이 없습니다. 슬라이더도 버튼 격자도 없고, 캐릭터가 곧 제품의 UI입니다."*

Deliberately short - this is the baseline pillar. Its job is to set up Beat 2.

### Beat 2 - Autonomous discovery (~50s) - the thesis

**Do**: nothing. The events from Beat 1 flush within 3 seconds and cross the threshold.

**On screen**: log shows `loadWindow → findPattern → [exaone] reasoning → save`. On the
FE, the character **speaks first, unprompted**; level-up sprite plays; the spotlight
card leaves the discovery on screen.

**Say**: *"제가 아무것도 요청하지 않았습니다. 사용 데이터가 임계치를 넘자 발견이 요청
경로 밖에서 스스로 실행됩니다. EXAONE이 60일 창에서 기기 설정과 앱 컨텍스트를 날짜로
붙여 보고, 비 오는 날엔 허리를 강하게, 많이 걸은 맑은 날엔 다리를 약하게 쓴다는 상관을
찾아냈습니다."*

then: *"중요한 건 이게 원래 메뉴에 없던 조합이라는 점입니다. 기기가 노출하는 건 롤러
위치, 강도, 시간 같은 원시 설정값뿐이고 '비 오는 날 모드'라는 프리셋은 존재하지
않습니다. 사용자가 자기도 모르게 정착한 조합에 캐릭터가 처음 이름을 붙인 겁니다."*

**Fallback**: the graph retries once inside the same run. If it still returns no
pattern, say *"라이브 호출이라 가끔 이렇게 됩니다"* and open the retained skill from a
previous run. Do not re-trigger and wait in silence.

### Beat 3 - Hand the keyboard to the judge (~25s)

**Do**: invite one sentence. Offer: *"강도를 3으로 낮춰줘"*.

**On screen**: log shows `listSkills → getSkill → updateSkill`. The skill document changes.

**Say**: *"방금 말씀하신 문장 그대로 반영됐습니다. 설정 화면도, 승인 절차도 없습니다."*

**Guard rails**: `updateSkill` overwrites with **no revision history**; `deleteSkill` is
a **hard delete with no confirmation**, gated only by the system prompt. **Never invite
a judge to delete.** If a judge says something that reads as deletion, take the keyboard back.

### Beat 4 - Close the loop (~20s) - EXCLUDED from the locked scenario, see §5

**Do**: go back to the roster, re-enter 마사지체어.

**On screen**: the character speaks first again - this time offering to *apply* the skill
it just learned, referencing today's actual weather.

**Say**: *"오늘 비가 옵니다. 캐릭터가 방금 배운 걸 먼저 꺼냅니다. 발견하고, 고치고,
스스로 제안하는 것까지가 한 바퀴입니다."*

**Latency warning**: this beat makes a live EXAONE relevance call, so expect a few
seconds of silence before the character speaks. Narrate over it rather than standing
still - and time it in rehearsal before committing to it.

**Locked total (Beats 1-3): ~95s**, leaving ~25s of buffer inside the 2 minutes for
judge questions and model latency. With Beat 4 it would be ~115s and effectively no
buffer, which is a second reason it stays out. If it runs long, cut Beat 1, not Beat 3.

---

## 7. Reserve cards

### Restraint - the agent does not fabricate

Discovery was live-tested twice against non-patterned data and correctly reported no
pattern. *"패턴이 없으면 없다고 말합니다. 항상 뭔가를 찾아내는 에이전트는 발견하는 게
아니라 만들어내는 겁니다."* Strong, costs nothing, and it is true.

### Provenance (FR-5.5) - the clamp proof is no longer available

**The previous draft of this document proposed the clamp as a reserve card. It no longer
works, and this is a real regression in demonstrability.**

BE's `9cdec8f` replaced generic `applyCommand(capability, params)` with per-product
named tools whose zod schemas encode the valid range - e.g.
`z.number().min(5).max(30)` for 마사지체어 `setDuration`, `.max(25)` for ShoeCase. The
model therefore **cannot emit an out-of-range value**; the tool boundary rejects it
before the device sees it. `applyCommand`'s clamping code still exists in
`device-stub/src/canned.ts` but is now reachable only by calling `device-stub` directly.

This is a **better** architecture - an invalid command cannot even be attempted - but it
removes the five-second observable test that made the guarantee vivid.

**What to say instead**, if a judge asks whether the agent is just talking:

*"화면의 값은 프로세 텍스트에서 파싱한 게 아니라, 툴 호출마다 기기가 돌려준 구조화된
`deviceState` 응답에서 렌더링합니다. 모델은 문장을 쓸 수 있어도 구조화된 기기 응답을
만들어낼 수는 없습니다."*

Backed by two concrete facts worth naming: the system prompt instructs the agent never
to state device status from memory, and BE's captured stream shows one `deviceState`
event per tool call carrying the full state.

**If a hard proof is wanted**, the honest option is `curl` straight to `device-stub`
with an out-of-range duration and show the clamped response. Weaker as theatre, still
true. Decide in rehearsal whether it is worth the detour.

---

## 8. Reset procedure between judges

1. `POST http://localhost:4000/devices/massagechair/reset` - **device state only**
2. Delete the skill created in the last run
3. **For fully clean state, restart both processes** - the fixture re-seeds at
   `device-stub` boot and the discovery counter resets

`reset` clears neither the usage buffer nor the discovery counter. **Recommendation:
restart between judges.** An accumulating skill list makes "it just discovered this"
ambiguous, and Beat 4 needs exactly one matching skill - `checkTodayRelevance` only
fires when today's context matches **exactly one** skill's condition, so leftover
skills can suppress it.

BE deleted its test skill from the real DynamoDB table after capturing
`api-examples.md`, so the table starts empty.

---

## 9. FE status - what is real and what is not

FE runs against the real backend only when **`VITE_USE_MOCK=false`**. The default is
mock. **Getting this wrong means demoing the mock**, which would be the worst possible
outcome - it looks perfect and proves nothing. Put it in the pre-flight.

Gaps FE documented honestly in `src/api.ts`, all of which are BE surfaces that do not exist:

| Gap | Consequence on stage |
|---|---|
| No `/api/characters` route | Roster is supplied locally from `characters.ts` |
| No progression from BE | Level and exp are a **local cosmetic bump** in `state.ts` |
| No standalone device-state route | `getDeviceState` resolves `null`; stats only arrive inside a chat turn - so **a fresh screen shows no stats until the first message** |
| No `/api/transcribe` | Mic forced `unavailable` |
| No tier/status in BE | Every skill renders as `basic` / `active` |

The progression point matters for narration: **do not claim the level is earned state**.
It is presentation, which is exactly what the pillar depth contract scoped it as. The
level-up *effect* is real and triggered by a real discovery; the number behind it is local.

The device-state gap has a demo consequence worth rehearsing: enter the screen, and the
stat strip is empty until Beat 1 completes. If that looks broken, Beat 1's first line
should come immediately on entry.

### Integration risk - `packages/shared` collides

FE created `packages/shared/src/types.ts` (FE's pre-integration proposal). BE has
`packages/shared/src/index.ts` (the real contract). **Both branches add
`packages/shared` with different content**, and FE currently works around it by
re-declaring BE's wire shapes locally in `api.ts`.

This is the merge that has not happened yet, and it is the top integration risk left.
FE's own summary says BE and INFRA "should change what is wrong". Resolve it
deliberately rather than at 2am: BE's `index.ts` is the contract, FE's `types.ts` holds
view-model types, and they are not the same thing - both can survive, under different names.

---

## 10. Presentation outline - 5 minutes

| Time | Section | Serves |
|---|---|---|
| 0:00-1:00 | **문제**: ThinQ는 버튼과 슬라이더의 격자다. 아무것도 학습하지 않는다. 페르소나 2인 | 문제정의·사용자이해 |
| 1:00-2:15 | **솔루션**: 제품:에이전트:캐릭터 1:1:1. 설정 화면을 없애고 캐릭터가 제품의 UI가 된다. 차별점은 *자율 발견* - 프리셋 추천이 아니라, 없던 조합에 이름을 붙이는 것 | 솔루션 창의성 |
| 2:15-3:45 | **기술**: EXAONE이 발견과 민감 데이터 접근, Bedrock이 제어. LangGraph 3노드. 발견은 요청 경로 밖. 앱 컨텍스트 원본은 EXAONE만 보고 제어 에이전트는 완성된 문장만 받는다. AWS CDK 배포 런타임, 실 DynamoDB 검증 | 기술활용·구현완성도 |
| 3:45-4:30 | **사업성**: 스캐폴딩과 제품별 확장의 분리 - 파이프라인이 서면 제품 추가는 아키텍처가 아니라 데이터와 툴이다. 3종이 그 증거 | 사업성 |
| 4:30-5:00 | 시연으로 넘어가는 한 문장 | 전달력 |

The FR-5.11 data-boundary point in the 기술 section is newly worth making: EXAONE sees
raw app context, composes the suggestion sentence, and the control agent receives only
that finished sentence - never the raw weather/distance/screen-time numbers. It is a
concrete privacy-architecture claim, not a slogan.

### Do not claim

- Voice input (mic disabled in real-API mode)
- 14일/60일 skill tiering (dropped)
- Level or exp as persisted earned state (local and cosmetic)
- The clamp / device-overrides-agent test (unreachable through chat - see §7)
- Public deployment (security group has zero inbound; local is the demo path)
- Determinism (NFR-4.1 was restated to "reproducible in shape")

---

## 11. Pre-flight checklist for 8/21

Ordered by how badly it hurts if missed.

- [ ] **`VITE_USE_MOCK=false`.** Confirm by sending a message and watching the backend log respond
- [ ] **Rotate the Friendli API key.** The token was pasted into a chat transcript; BE flagged it
- [ ] **Fix 1**: append the `2026-08-21` rain entry to `app-context-rain.jsonl` (§5)
- [ ] **Fix 2**: FE sends `sendMessage(id, '', null)` on character entry (§5) - or drop Beat 4
- [ ] **Verify the agent replies in Korean.** `SHARED_INSTRUCTIONS` says "in the user's language", and BE's captures are all English because the test prompts were English. **Korean is unverified.** Test it before anything else
- [ ] Confirm the Beat 1 wording produces at least 3 tool calls
- [ ] Verify the flush loop is running - discovery exists only if `/internal/usage/flush` is called, and its failure is silent
- [ ] Time Beat 4's EXAONE latency; drop the beat if it exceeds ~8s
- [ ] Resolve or pin the `packages/shared` collision so the demo build is reproducible
- [ ] Run the full 2 minutes end to end **five times**, restarting between each
- [ ] Retain one successful discovery result as the replay reserve
- [ ] Warn the team: shared account, everyone holds `PowerUserAccess`. **Nobody runs `cdk destroy`**
- [ ] Confirm the AWS account survives to 8/21 - three-day deletion clock
- [ ] Second screen for server logs, positioned so a judge can see it

---

## 12. Known gaps this scenario works around

| Gap | Handling |
|---|---|
| Fixture has no demo-day context | Fix 1. Silent failure if missed |
| FE sends no "opened" signal | Fix 2. Silent failure if missed |
| Clamp proof unreachable | Reframed as a provenance statement; §7 |
| Korean replies unverified | First pre-flight test |
| Progression is local and cosmetic | Never claimed as earned state |
| Stats empty until first message | Beat 1 fires immediately on entry |
| Pra.L / ShoeCase have no art | On the roster, not operated |
| No revision history; hard delete | Beat 3 revises once; judges never delete |
| `packages/shared` collides | Flagged as the top remaining integration risk |
| `main` docs are stale | All three units shipped on branches; `main` still says CONSTRUCTION is waiting |
