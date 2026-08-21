# 컴포넌트 사전

`deck.html` 의 `<style>` 블록에 이미 정의된 것들. **새 컴포넌트를 발명하지 말고
여기서 복사해 조합한다.** 필요한 게 없으면 가장 가까운 것을 고르고, 그래도 없으면
INSTRUCTIONS.md 의 "새 컴포넌트가 필요할 때" 를 따른다.

모든 스니펫은 `<div class="slide-inner">` 안에 들어간다.

---

## 0. 슬라이드 껍데기

```html
<section class="slide" data-section="contents" data-product="shoecase">
  <div class="slide-inner">
    <!-- 내용 -->
  </div>
</section>
```

- `data-section`: `opening` / `contents` / `closing`. TOC 그룹 구분용
- `data-product`: `pral` / `shoecase` / `massagechair`. **강조색이 바뀐다**
  (아래 "제품별 색" 참고). 생략하면 이전 슬라이드 색을 그대로 쓴다
- 표지는 `class="slide slide-cover"`, 마무리는 `class="slide slide-closing"`
  — 둘은 자동으로 가운데 정렬된다
- 첫 슬라이드에만 `active` 를 붙인다

---

## 1. 섹션 헤더

거의 모든 본문 슬라이드의 첫 요소.

```html
<div class="section-header">
  <div class="section-label">SECTION 01</div>
  <div class="section-title">슬라이드 제목</div>
  <div class="section-title-bar"></div>
</div>
```

`section-label` 은 생략 가능. 넣으면 골드 알약으로 나온다.

---

## 2. 표지 / 마무리

```html
<!-- 표지 -->
<div class="cover-pretitle">한 줄 부제</div>
<div class="cover-title">제목<br><span class="accent">Accent</span></div>
<div class="gold-rule" style="margin:0 auto 24px;"></div>
<div class="cover-date">날짜 · 행사명 · 팀명</div>
```

`cover-title` 은 88px이다. 두 줄까지가 안전하고 세 줄은 넘친다.

---

## 3. 본문 문단 · 어젠다 선언

서술형으로 맥락을 깔고, 마지막에 "오늘 말할 것" 을 선언하는 패턴.

```html
<div class="body-text">일반 문단. <b>강조</b>는 b 태그.</div>
<div class="body-text"><span class="dim">덜 중요한 문단은 dim.</span></div>

<div class="turn">
  <span class="turn-line"><span class="turn-no">하나</span>첫 번째 <span class="hl">핵심어</span>.</span>
  <span class="turn-line"><span class="turn-no">둘</span>두 번째 <span class="hl">핵심어</span>.</span>
</div>
```

`.hl` 은 제품 틴트 배경 + 제품 잉크색. 슬라이드의 `data-product` 를 따라간다.

---

## 4. 카드 · 그리드

```html
<div class="grid-3">
  <div class="card">
    <div class="card-title">카드 제목</div>
    <div class="card-body">본문.</div>
  </div>
  <div class="card paper">…</div>
  <div class="card tinted">…</div>
</div>
```

- 컨테이너: `.grid-2` `.grid-3` `.grid-4` `.row`
- 카드 변형: 기본(흰색) / `.paper`(웜 그레이) / `.tinted`(제품 틴트) / `.gold`
- **한 슬라이드에 카드 4개까지.** 5개 이상은 슬라이드를 쪼갠다

---

## 5. 칩

```html
<span class="chip">기본</span>
<span class="chip gold">골드 강조</span>
<span class="chip tint">제품 틴트</span>
<span class="chip on">긍정 · 완료</span>
<span class="chip risk">주의 · 리스크</span>
<span class="chip chip-lat">LV. 3</span>
<span class="chip"><span class="swatch" style="background:#6e7ba8;"></span>슈케이스</span>
```

`.chip-lat` 는 라틴 폰트 + 자간. 숫자·영문 라벨에 쓴다.

---

## 6. 단계 플로우 (현재 → 전환 → 결과)

```html
<div class="flow">
  <div class="flow-step">
    <div class="st-label">NOW</div>
    <div class="st-title">현재 상태</div>
    <div class="st-body">설명.</div>
  </div>
  <div class="flow-arrow">&rarr;</div>
  <div class="flow-step hi">
    <div class="st-label">SHIFT</div>
    <div class="st-title">강조할 단계</div>
    <div class="st-body">설명.</div>
  </div>
  <div class="flow-arrow">&rarr;</div>
  <div class="flow-step">
    <div class="st-label">RESULT</div>
    <div class="st-title">결과</div>
    <div class="st-body">설명.</div>
  </div>
</div>
```

`.hi` 는 골드로 채워진다. **한 플로우에 `.hi` 는 하나만.** 3단계가 적정,
4단계까지 가능, 5단계는 좁아진다.

---

## 7. 좌우 대조 (A가 아니라 B다)

차별성을 주장할 때 가장 강한 형태.

```html
<div class="hero-line">주장 첫 줄<br><em>강조할 둘째 줄</em></div>

<div class="vs">
  <div class="vs-col left">
    <h4>이쪽이 아니다</h4>
    <div class="vs-row">항목 1</div>
    <div class="vs-row">항목 2</div>
    <div class="vs-row">항목 3</div>
  </div>
  <div class="vs-col right">
    <h4>이쪽이다</h4>
    <div class="vs-row">항목 <b>1</b></div>
    <div class="vs-row">항목 2</div>
    <div class="vs-row">항목 3</div>
  </div>
</div>
```

좌측은 페이퍼, 우측은 골드. 행은 3개가 적정, 4개까지.

---

## 8. 강조 노트 · 각주

```html
<div class="note-gold">반박을 차단하는 한 줄. 골드 카드로 눌러준다.</div>
<div class="note-mute">덜 중요한 부연. 회색 작은 글씨.</div>
```

`note-gold` 는 슬라이드당 하나만. 두 개면 강조가 아니다.

---

## 9. 아키텍처 도식

```html
<div class="arch">
  <div class="arch-node"><div class="an-k">LABEL</div><div class="an-t">노드 이름</div></div>
  <div class="arch-arrow">&rarr;</div>
  <div class="arch-node tint"><div class="an-k">LABEL</div><div class="an-t">노드 이름</div></div>
  <div class="arch-arrow">&rarr;</div>
  <div class="arch-node gold"><div class="an-k">LABEL</div><div class="an-t">강조 노드</div></div>
</div>

<!-- 두 흐름을 가르는 구분선 -->
<div class="arch-split"><span>BOUNDARY LABEL</span></div>

<div class="arch" style="margin-top:18px;">
  …두 번째 줄…
</div>
```

- 한 줄에 노드 4개까지
- 골드는 하나만. 나머지는 흰색이나 `.tint`
- 복잡한 SVG 연결선은 쓰지 않는다. flex + 화살표 문자로 충분하다

---

## 10. 근거 칩 (출처 표기)

주장에 출처를 붙일 때. `.src` 에 파일명이나 근거를 적는다.

```html
<div class="chips-row">
  <div class="chip-lg"><b>항목</b> &mdash; 설명<span class="src">source.md</span></div>
  <div class="chip-lg"><b>항목</b> &mdash; 설명<span class="src">source.md</span></div>
  <div class="chip-lg gold"><b>가장 강한 항목</b> &mdash; 설명<span class="src">source.md</span></div>
</div>
```

한 줄에 3개. 두 줄까지(총 6개)가 한계.

---

## 11. Beat / step 카드 (시연 예고 등)

```html
<div class="step">
  <div class="step-no">BEAT 01</div>
  <div class="step-title">제목</div>
  <div class="step-body">설명.</div>
</div>
<div class="step">…</div>
```

세로로 쌓인다. 3개가 적정.

---

## 12. 스탯 스트립 (계기판)

숫자를 계기판처럼 보여준다. 라틴 폰트 + `tabular-nums`.

```html
<div class="stat-strip">
  <div class="stat"><div class="k">KEY</div><div class="v">value</div></div>
  <div class="stat"><div class="k">LEVEL</div><div class="v">5</div></div>
  <div class="stat"><div class="k">MIN</div><div class="v">25</div></div>
</div>
```

---

## 13. 캐릭터 스테이지 (에셋을 가져온 경우에만)

`scripts/pull-characters.mjs` 로 에셋을 가져온 뒤에만 쓴다. 안 가져왔으면 쓰지 않는다.

```html
<div class="fe-stage" style="width:420px; height:470px;">
  <img src="assets/characters/massagechair-talking.webp" alt="캐릭터">
  <div style="position:absolute; top:18px; left:18px;">
    <span class="chip gold chip-lat">LV. 3</span>
  </div>
</div>
```

좌우 배치는 이렇게 감싼다.

```html
<div style="display:flex; align-items:center; gap:60px;">
  <div style="flex:1;"><!-- 텍스트 --></div>
  <div class="fe-stage" style="width:400px; height:440px; flex:none;">…</div>
</div>
```

---

## 14. 캐릭터 말풍선 (픽셀 프레임)

**캐릭터가 말하는 내용에만 쓴다.** 메인 앱이 이 형태와 픽셀 폰트를 캐릭터의 목소리
전용으로 못박아 뒀다 — HUD 텍스트나 일반 인용에 쓰면 그 구분이 깨진다.

```html
<div class="balloon">
  <div class="balloon-in">비 오는 날엔 허리를 강하게 쓰시네요.</div>
</div>
```

라운드 코너도 드롭섀도우도 없는 계단형 노치가 "게임 대화창" 으로 읽히게 하는 요소다.
`.balloon-in` 을 빼먹으면 프레임이 깨진다.

---

## 제품별 색

`data-product` 가 바꾸는 값. 메인 앱 `styles.css` 와 동일하게 유지한다.

| 제품 | `--product` | `--product-ink` | `--tint` |
|---|---|---|---|
| `pral` | `#a87c86` 모브 | `#7e5a63` | `#f3ebec` |
| `shoecase` | `#6e7ba8` 블루 | `#4e5b85` | `#e8eaf2` |
| `massagechair` | `#5a7a66` 그린 | `#3f5b4a` | `#e9efea` |

`--product-ink` 만 텍스트에 쓸 수 있다(흰 배경에서 4.5:1 통과). `--product` 는
테두리·채움·틴트용이다.

---

## 색을 직접 쓰지 않는다

`#f2b134` 처럼 하드코딩하지 말고 토큰을 쓴다.

| 쓸 일 | 토큰 |
|---|---|
| 골드 강조 | `var(--gold-grad)` 배경 + `var(--gold-ink)` 글자 |
| 제품 강조 | `var(--product)` 테두리, `var(--product-ink)` 글자, `var(--tint)` 배경 |
| 본문 / 보조 / 약한 글자 | `var(--text)` / `var(--text-dim)` / `var(--text-mute)` |
| 면 | `var(--bg)` 흰색, `var(--surface)` 웜 그레이 |
| 테두리 | `2px solid var(--ink)` |
| 그림자 | `0 2px 0 var(--ink-soft)` 또는 `0 3px 0 var(--ink)`. **블러 금지** |
| 긍정 / 위험 | `var(--power-on)` `var(--power-on-bg)` / `var(--danger)` `var(--danger-bg)` |
