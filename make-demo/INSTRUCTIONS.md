# 발표 덱 편집 지침

이 문서는 **AI 에이전트에게 주는 지침**이다. 발표자가 원하는 내용을 프롬프트로 말하면,
에이전트가 이 규칙을 따라 `deck.html` 을 고친다.

발표자용 사용법은 `README.md` 를 본다.

---

## 역할

발표자는 **무엇을 말할지** 결정한다. 에이전트는 그것을 `deck.html` 의 슬라이드
마크업으로 옮긴다. 스타일을 새로 만드는 것이 아니라 **이미 있는 컴포넌트로 조립**한다.

---

## 절대 규칙

### 1. `<style>` 블록을 수정하지 않는다

`deck.html` 의 `<style>`, 상단바, 하단 컨트롤, TOC 패널, `<script>` 는 골격이다.
내용 작업으로 이 영역을 고치지 않는다.

**예외 3개** — 이것만 값을 바꿀 수 있다:
- `.brand-mark` 안의 팀명
- `.brand-text` 안의 태그라인
- `.brand-ver` / `<title>` / 파일명의 버전 (**3곳 동시에**)

### 2. 편집 영역은 `SLIDES` 주석 사이뿐이다

```
<!-- ===== SLIDES — 여기서부터 ... ===== -->
   ...이 안에서만 작업...
<!-- ===== /SLIDES ===== -->
```

### 3. 새 CSS 클래스를 만들지 않는다

`COMPONENTS.md` 에 있는 것으로 조립한다. 인라인 `style` 은 **레이아웃에만**
(`display:flex`, `gap`, `width`, `margin`) 허용한다.
**색·테두리·그림자·폰트를 인라인으로 새로 정의하지 않는다.**

### 4. 색은 토큰으로만 쓴다

`#f2b134` 같은 하드코딩 금지. `var(--gold)` `var(--product-ink)` 등을 쓴다.
전체 목록은 `COMPONENTS.md` 의 "색을 직접 쓰지 않는다" 표.

### 5. 슬라이드를 추가/삭제하면 세 곳을 함께 고친다

인덱스는 **0-based**. 표지가 0이다.

1. `<section class="slide">` 추가/삭제
2. TOC 의 `<div class="toc-item" data-slide="N">` — 슬라이드와 **1:1**, 빠짐없이
3. `<script>` 의 `sectionEnds` 배열 — 섹션이 끝나는 인덱스

중간에 하나 끼워넣으면 그 뒤 모든 `data-slide` 가 한 칸씩 밀린다. 전부 재검수한다.

### 6. 캔버스 934px 를 넘기지 않는다

콘텐츠는 1660×934 고정 캔버스에 들어가야 한다. 세로 패딩 52px씩 빼면 **실사용
830px**. 넘치면 위아래가 잘리는데 `justify-content:center` 때문에 **양쪽이 조용히
잘려서 눈치채기 어렵다.** 그래서 편집 후 반드시 검증한다(아래 "검증").

넘칠 때 대응 순서:
1. 항목 수를 줄인다 (카드 5개 → 4개)
2. 텍스트를 줄인다
3. **슬라이드를 둘로 쪼갠다** ← 대개 이게 정답
4. 폰트를 줄이는 건 마지막 수단

### 7. 반응형 단위를 쓰지 않는다

`%` `vw` `vh` 미디어쿼리 금지. 고정 px로 쓰면 `fitStage()` 가 해상도를 알아서
처리한다. 반응형을 섞으면 스케일과 이중으로 어긋난다.
(폭 100%로 채우는 `width:100%` 정도는 무해하다.)

### 8. 한글은 직접 쓴다

`&#xAC00;` 같은 entity 금지. UTF-8 그대로.

---

## 판단 기준

### 슬라이드 수

발화 시간으로 역산한다. **1분 ≈ 슬라이드 1.5장**, 장당 30~45초가 적정이다.

| 발표 길이 | 권장 슬라이드 |
|---|---|
| 3분 | 4~5장 |
| 5분 | 6~8장 |
| 10분 | 12~15장 |

장수를 늘리기보다 장당 밀도를 낮추는 쪽이 대개 낫다. 슬라이드를 *읽는* 발표가 되면
전달력이 떨어진다.

### 슬라이드 하나에 주장 하나

한 슬라이드가 두 가지를 주장하면 둘 다 약해진다. 쪼갠다.

### 강조는 슬라이드당 하나

골드는 "여기를 보라" 는 신호다. 한 슬라이드에 골드 요소(`.hi`, `.note-gold`,
`.card.gold`, `.arch-node.gold`)가 둘 이상이면 신호가 사라진다.

### 어떤 컴포넌트를 고를지

| 하려는 것 | 컴포넌트 |
|---|---|
| 맥락을 서술하고 어젠다를 선언 | `.body-text` + `.turn` |
| 현재 → 전환 → 결과 | `.flow` |
| A가 아니라 B다 (차별성) | `.hero-line` + `.vs` |
| 병렬 항목 3~4개 | `.grid-3` / `.grid-4` + `.card` |
| 시스템 구조 | `.arch` + `.arch-split` |
| 주장 + 출처 | `.chips-row` + `.chip-lg` |
| 순서가 있는 예고 | `.step` |
| 숫자·계기값 | `.stat-strip` |
| 캐릭터가 하는 말 | `.balloon` |
| 반박 차단 한 줄 | `.note-gold` |

---

## 작업 순서

1. **발표자의 요청을 슬라이드 단위로 분해한다.** 몇 장이 되는지 먼저 말한다.
2. 각 장에 컴포넌트를 배정한다. 위 표를 쓴다.
3. `deck.html` 의 SLIDES 영역을 고친다.
4. TOC 와 `sectionEnds` 를 맞춘다.
5. **검증한다** (아래).
6. 발표자에게 **바뀐 것과 판단한 것**을 보고한다. 특히 쪼갠 슬라이드, 줄인 항목,
   넘쳐서 대응한 곳.

---

## 검증

편집 후 매번 확인한다. 브라우저에서 `deck.html` 을 열고 콘솔에 붙여넣는다.

```js
(() => {
  const slides = document.querySelectorAll('.slide');
  const toc = document.querySelectorAll('.toc-item');
  const out = { slides: slides.length, toc: toc.length, clipped: [] };
  slides.forEach((s, i) => {
    const had = s.classList.contains('active');
    s.classList.add('active');
    const inner = s.querySelector('.slide-inner');
    const ir = inner.getBoundingClientRect();
    let top = Infinity, bot = -Infinity;
    [...inner.children].forEach(c => {
      const r = c.getBoundingClientRect();
      top = Math.min(top, r.top); bot = Math.max(bot, r.bottom);
    });
    const over = Math.round(Math.max(ir.top - top, 0) + Math.max(bot - ir.bottom, 0));
    if (over > 1) out.clipped.push({ slide: i, overflowPx: over });
    if (!had) s.classList.remove('active');
  });
  out.tocMatches = out.slides === out.toc;
  out.activeCount = document.querySelectorAll('.slide.active').length;
  out.vScroll = document.body.scrollHeight > window.innerHeight;
  return out;
})()
```

**통과 기준**: `clipped` 가 빈 배열, `tocMatches: true`, `activeCount: 1`,
`vScroll: false`.

`clipped` 에 뭔가 있으면 그 슬라이드는 내용이 잘려 있다. 위 규칙 6의 순서로 고친다.

---

## 캐릭터 에셋

기본 상태에서는 이미지가 없다. 캐릭터 아트를 쓰려면 먼저 가져온다.

```bash
node make-demo/scripts/pull-characters.mjs
```

`packages/frontend/public/characters/` 에서 대표 프레임을 골라
`make-demo/assets/characters/` 로 복사한다. 그다음 `COMPONENTS.md` 의 `.fe-stage` 를 쓴다.

가져오지 않았으면 `.fe-stage` 를 쓰지 않는다. 깨진 이미지 아이콘이 발표 화면에 뜬다.

**넣지 않는 것**: 실제 제품 사진. 이 제품의 UI는 캐릭터이고, 기기 사진을 붙이면
그 논지가 흐려진다. 외부에서 가져온 이미지도 쓰지 않는다.

---

## 배포용 단일 파일

발표 당일에는 이미지까지 하나로 합친 파일을 쓴다. USB로 옮기거나 다른 PC에서 열 때
경로가 깨지지 않는다.

```bash
node make-demo/scripts/build-single-file.mjs
```

`make-demo/dist/deck-standalone.html` 이 나온다. 폰트만 CDN이고 나머지는 내장이다.
**네트워크가 없으면 폰트가 시스템 폰트로 대체된다** — 레이아웃은 유지되지만
글자 모양이 달라진다. 발표장 네트워크가 불안하면 미리 확인한다.

---

## 하지 말 것

| | 이유 |
|---|---|
| `<style>` 블록에 규칙 추가 | 골격이다. 컴포넌트로 조립한다 |
| 색·그림자를 인라인으로 새로 정의 | 톤이 깨진다. 토큰을 쓴다 |
| 블러 그림자 (`0 4px 12px rgba(...)`) | 메인 앱은 수직 베벨만 쓴다. 블러는 "앱 UI" 가 아니라 "웹페이지" 로 읽힌다 |
| 라운드 코너 + 그림자를 말풍선에 | 게임 대화창이 아니라 앱 카드가 된다 |
| 픽셀 폰트(`--font-pixel`)를 HUD 텍스트에 | 캐릭터의 목소리 전용이다. 남용하면 구분이 사라진다 |
| 보라·퍼플 계열 | 팔레트에 없다 |
| 한 슬라이드에 골드 강조 2개 이상 | 강조가 강조를 지운다 |
| 세로 스크롤로 내용 밀어넣기 | 고정 캔버스다. 쪼갠다 |
| 슬라이드만 추가하고 TOC 방치 | 목차 점프가 어긋난다 |
