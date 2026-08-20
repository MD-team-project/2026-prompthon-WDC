# FE Components

**Stage**: CONSTRUCTION - Functional Design
**Unit**: FE
**Generated**: 2026-08-20T08:30:00Z
**Framework**: React with Vite (Q1 A)

## State ownership, decided first

One `useReducer` at `App`. No state library, and **no context either** - context was in the design and turned out to buy nothing, because the tree is two levels deep and `CharacterView` is the only consumer. Props all the way down instead.

Everything below `App` is presentational and receives props. Network calls live in App-level handlers passed down as callbacks, not inside leaf components.

**Why**: the state here is one session object - `lang`, `view`, `selectedCharacterId`, `sse`, `unseen`, `pending`, `feedbackContext` - plus three collections. A reducer covers it. Adding Redux or Zustand for that is a dependency for a value that never changes shape.

**Why calls are not in leaf components**: FE-R-24 requires `lang` on every request, and FE-R-1 requires stats to come only from a response's `deviceState`. Both are trivially enforced when requests go through one `apiClient` called from a small number of handlers, and both become audit problems when any card can fetch.

---

## Component tree

```
App
 +-- ConnectionBanner
 +-- RosterView
 |    +-- LangToggle
 |    +-- CharacterTile x3
 +-- CharacterView
      +-- (hud)                    back, name, level+exp pill, compendium toggle
      |    +-- SpotlightCard       most recent discovery, as a toast hung off the HUD
      +-- (stage-wrap)             the only region that grows
      |    +-- CharacterStage      character art, level-up, discovery reaction
      |    +-- SpeechArea          latest utterance as a caption
      +-- (stage-under)            only when there is more than one character
      |    +-- CharacterSwitcher   the other two characters
      +-- DeviceStatStrip          device state as one panel
      +-- InputBar                 voice bar, then text row
      +-- ConversationSheet        raised, when logOpen
      +-- SkillCompendium          raised, when compendiumOpen
           +-- SkillCard xN
```

`hud`, `stage-wrap` and `stage-under` are markup inside `CharacterView` rather than components - the HUD is three controls and a name, and extracting any of them would add a file without removing a decision.

`ConnectionBanner` is declared in `App.tsx` beneath `App` for the same reason: it renders one line of text under one condition.

**`SpotlightCard` is a child of the HUD, not a strip in the column.** It positions itself off the bottom edge of the header and renders nothing at all between discoveries, so whether a skill was just found never moves the device panel or the input bar. It sat over the caption at the bottom first, until the `LEVEL UP` banner moved there too and the two landed on each other.

### Layout budget

`stage-wrap` is the only region with `flex: 1`. Every other strip is `flex: none`.

This is load-bearing, not incidental. The first implementation gave the growth to `SpeechArea` and fixed the character at 176px, which made the screen a chat client with an avatar above it - the opposite of Q5 D. The character now takes the slack (`height: min(100%, 340px)` inside a flex-sized box) so it grows into the space rather than being centred in it, and the caption sits directly beneath it.

Sizing is height-driven, because `stage-wrap` clips: a fixed-size character crops top and bottom at once on a short viewport, whereas a height-driven one shrinks.

---

## App

Owns all state. Opens the single SSE connection on mount (FE-R-27) and routes each event by its `characterId`.

| State | Purpose |
|---|---|
| `lang` | `localStorage`-backed. Read on mount |
| `view`, `selectedCharacterId` | Replaces a router (Q4 A) |
| `characters`, `skills`, `deviceStats`, `messages` | Keyed by character id |
| `sse` | One connection, one status |
| `unseen` | Badge counts |
| `pending` | In-flight marker per character |
| `levelUp`, `discovery` | Per character. Whether an effect is playing, cleared by the stage's completion callbacks |
| `feedbackContext` | Skill id the next message refers to |
| `draft`, `micStatus` | The input bar's contents and the microphone's state |
| `compendiumOpen`, `logOpen` | The two sheets |

`levelUp` and `discovery` are keyed by character rather than global because an announcement can arrive for a character nobody is looking at, and its effect must not play on whoever is on screen.

Handlers: `sendMessage`, `sendVoice`, `invokeSkill`, `startFeedback`, `selectCharacter`, `backToRoster`, `toggleLang`, `toggleCompendium`, `toggleLog`.

`sendMessage` is the one place FE-R-1 is enforced: it reads `text` and `deviceState` from the response as separate fields and writes them to separate state slices.

---

## ConnectionBanner

| Prop | Type |
|---|---|
| `status` | `'connecting' \| 'open' \| 'dropped'` |

Renders only when `dropped`. **No close button** (FE-R-18). Disappears when status returns to `open`.

---

## RosterView

| Prop | Type |
|---|---|
| `characters` | `Character[]` |
| `unseen` | `Record<string, number>` |
| `onSelect` | `(id: string) => void` |

Three tiles, no login step (FR-7.3). Holds `LangToggle`.

**LangToggle placement**: roster only, not repeated in the character view. One toggle, one place. If rehearsal shows the switch is needed mid-demo without going back, moving it is a one-line change - noted rather than pre-solved.

### CharacterTile

| Prop | Type |
|---|---|
| `character` | `Character` |
| `unseenCount` | `number` |
| `onSelect` | `() => void` |

Badge renders when `unseenCount > 0` (FE-R-28).

---

## CharacterView

Layout container. Holds no session state; every value arrives as a prop. Its one piece of local state is a ref holding the x-coordinate where a stage swipe began.

| Prop | Type |
|---|---|
| `character` | `Character` |
| `characters` | `Character[]` - for the switcher |
| `lang` | `Lang` |
| `deviceStats` | `DeviceStats \| null` |
| `messages` | `ChatMessage[]` |
| `skills` | `Skill[]` |
| `unseen` | `Record<string, number>` |
| `pending`, `levelUp`, `discovery`, `compendiumOpen`, `logOpen` | `boolean` |
| `draft` | `string` |
| `micStatus` | `MicStatus` |
| `feedbackSkill` | `Skill \| null` |
| `unseenElsewhere` | `number` |
| handlers | `onSend`, `onVoice`, `onInvoke`, `onStartFeedback`, `onClearFeedback`, `onBack`, `onSelectCharacter`, `onToggleCompendium`, `onToggleLog`, `onDraftChange`, `onLevelUpDone`, `onDiscoveryDone` |

**Progression renders here, in the HUD pill** - the level number as text and exp as a small bar, from `progressRatio(character.exp, character.expToNext)`. It used to render on the stage as an exp halo; see `CharacterStage` for why it moved. Level is never derived from exp, because BE owns the curve.

This is also where FE-R-2 is visible as structure rather than as a promise: progression is read off `character` right here, device state goes to `DeviceStatStrip`, and neither component has a prop that could carry the other's data.

`unseenElsewhere` puts the badge on the back control as well as the roster (FE-R-28).

A horizontal swipe on `stage-wrap` dispatches the same `onSelectCharacter` as a switcher dot, with the wrap-around computed by the pure `neighbourId(ids, currentId, step)`. Keeping the wrap in a pure function means it is a unit test rather than something discovered by swiping past the last character on stage.

---

## DeviceStatStrip

Device state as the character's stat panel. This was the lower half of the former `StatHeader`, which no longer exists.

| Prop | Type |
|---|---|
| `deviceStats` | `DeviceStats \| null` |
| `pending` | `boolean` |
| `lang` | `Lang` |

**FE-R-2 after the split.** Progression moved to the HUD pill in `CharacterView`, so the combined header is gone. The rule is stronger rather than weaker: this component has no prop that could carry a level or an exp value, `CharacterStage` takes no progression at all, and neither can reach the other's data. There is still no shape anywhere holding both.

Generic renderer (Q3 A). Iterates `attributes` in the order BE returned, resolving each `key` through a per-language label lookup and falling back to a readable form of the key itself when unknown. No fixed slots, because the massage chair returns four attributes and the shoe case three and neither count is special.

All of a character's attributes sit inside **one bordered panel with one visible title** rather than as chips loose on the screen, so device state reads as a single instrument rather than a scatter of unrelated numbers.

The in-flight marker renders **on the block**, not per attribute (FE-R-3). `pending` is a boolean and there is no prop that could carry a predicted value.

Renders nothing interactive. No control panel exists anywhere (FE-R-7).

---

## CharacterStage

| Prop | Type |
|---|---|
| `artRef` | `string` |
| `productId` | `ProductId` |
| `levelUp` | `boolean` |
| `onLevelUpDone` | `() => void` |
| `discovery` | `boolean` |
| `onDiscoveryDone` | `() => void` |

**It takes no progression at all.** Not `level`, not `exp`, not `expToNext` - only the two booleans saying whether something is *happening*, and the callbacks that report when it has finished. That is the strongest form FE-R-2 takes anywhere in the unit: this component could not render a stat value if it tried.

### Real art, and what it cost the level layer

The massage chair has real art: two frame sequences under `public/characters/massagechair/`, `levelup/` at 56 frames and `surprise/` at 65, both at 40ms. Frame 0 of `surprise/` doubles as the idle pose. `pral` and `shoecase` have no assets yet and keep the abstract gradient placeholder (Q8 C).

Playback is a `setInterval` per sequence advancing a frame index, each one clearing itself and calling its completion callback when the index reaches the count. Products without art complete on a 1.5s timer instead - same rule, different clock. Both callbacks are read through refs rather than as effect dependencies, because they are fresh closures on every render and depending on them directly restarts the sequence at frame 0 whenever anything else in the app dispatches.

**The CSS level layer was removed from the stage when the art landed** (see FE-R-10, now recorded as partly held). A halo ring and a level-shaped frame both read as decoration attached to an illustration rather than the illustration advancing, and the halo had a second problem: behind the figure the character's shoulders occluded the middle of the arc, so the one thing it existed to report was unreadable at exactly the ratios where it mattered. Progression moved to the HUD pill and the stage now carries no level-derived treatment. **FR-2.5 is consequently met on the roster tile ring and not here** - the open cosmetic item, and legitimately open, since cosmetic evolution is second in the drop order.

### The effects

**Level-up** plays in place: the frame sequence or a scale-and-glow pop, a burst ring that is a child of the character, and a `LEVEL UP` status line (FE-R-8). No overlay, no portal, nothing covering the character. Does not wait for or coordinate with any announcement (FE-R-9).

**Discovery** plays the `surprise/` sequence once (FE-R-10b). Level-up outranks it when both are true, since levelling up is the rarer event. Products without art have no reaction to play, but `discovery` still has to clear itself on a timer, because `SpotlightCard` is gated on it.

The idle float and the level-up pop sit on **different elements** - the figure floats, the character scales. Both animate `transform`, and two animations on one element means the later one wins outright, which silently cancelled the pop.

**Known rough edge**: frames are plain `<img src>` swaps with no preloading, so the first playthrough of either sequence can stutter while it fetches. 121 frames at demo size is small enough that a warm cache hides it, and a link-preload pass is the fix if a cold first run turns out to look bad on stage.

---

## CharacterSwitcher

| Prop | Type |
|---|---|
| `characters` | `Character[]` |
| `activeId` | `string` |
| `unseen` | `Record<string, number>` |
| `onSelect` | `(id: string) => void` |

Dots under the stage. Renders nothing below two characters.

The roster is still the entry point (FR-7.2, FR-7.3), but switching used to require leaving the character screen, which made three characters read as three rows in a list rather than three characters sharing a stage.

`role="group"` with `aria-current`, not `tablist`/`tab`: proper tabs need an `aria-controls` target carrying `role="tabpanel"`, and what these switch is the whole screen. An unseen announcement raises a mark here as well (FE-R-28).

---

## SpotlightCard

| Prop | Type |
|---|---|
| `skill` | `Skill \| null` - the most recent |
| `busy` | `boolean` - the character is mid-reaction *and worth waiting for* |
| `onOpen` | `() => void` |

US-3.2's beat is that the character finds something on its own, and the only trace of it on the main screen used to be a line of speech that the next line pushed away.

**`busy` is why the card is not just conditional rendering.** It refuses to latch a new skill while the character is mid-reaction, so the order on stage is: the character reacts, *then* the card naming what it found appears. Latching immediately puts the explanation on screen while the character is still visibly surprised, which reads as two unrelated things rather than one.

**`CharacterView` passes `discovery && !levelUp`, not `discovery || levelUp`.** The distinction is the interesting part of this component. A bare surprise reaction is small, and a toast appearing over it covers the thing the reaction exists to show - worth waiting for. A level-up is loud enough to share the frame, and making the toast wait for it turns "you levelled up **and** found something" into two staggered beats instead of one. So the wait is scoped to the case that needs it, and the component itself stays dumb: it takes one boolean and does not know which reaction is playing.

Note the prop is therefore not quite "is the character animating" - it is "is there a reaction worth deferring to". Naming it `busy` keeps the component ignorant of that policy, which belongs in `CharacterView` where both booleans are already in hand.

Once shown it stays until tapped - no auto-dismiss, because a judge looking away for three seconds should not lose the evidence. Tapping opens the compendium. It is keyed on the skill id, so a *different* skill remounts the card and a revision of the same one deliberately does not.

**FE-R-14**: shows a skill that exists, or a line that does not enumerate. No empty slot, no locked entry, no count of what is coming.

**FE-R-13**: the reason is deliberately *not* here. It renders in full on the compendium card, one tap away. A clipped reason on this card would be the "behind a tap" failure in a different costume.

---

## SpeechArea

| Prop | Type |
|---|---|
| `messages` | `ChatMessage[]` |
| `pending`, `logOpen` | `boolean` |
| `onToggleLog` | `(open: boolean) => void` |

The latest character utterance renders as a **caption on the stage**, not a bubble in a list. A bubble in a scrolling column reads as messaging, where the character is one participant of two; a caption under the character reads as the character speaking. Q5 D put the character at the centre and the bubble layout was quietly contradicting it.

The user's own last line stays visible as a small echo while a reply is pending, so nothing said on stage vanishes without a trace. Once the character answers, the answer takes the caption.

Multiple announcements queue as separate messages so each skill is individually attributable (US-3.2 scenario 3).

### ConversationSheet

| Prop | Type |
|---|---|
| `messages` | `ChatMessage[]` |
| `onClose` | `() => void` |

The full history, raised as a sheet rather than replacing the caption in place. Empty after a refresh, by specification (FE-R-26).

### SpeechBubble

| Prop | Type |
|---|---|
| `message` | `ChatMessage` |

Styles by `role` and `kind`. An `announcement` is visually distinct from a `normal` reply; a `failure` reads as the character reporting a problem (FE-R-17).

Renders `message.text` and nothing else. It has no access to stats and no numeric props, which is what makes FE-R-1 structural rather than procedural.

A `ConversationLog` was designed as a separate expanded-history component and **was never built**: it and `ConversationSheet` were the same list with the same props, so the sheet absorbed it. Noted so the absence reads as a merge rather than a gap.

---

## InputBar

| Prop | Type |
|---|---|
| `draft` | `string` |
| `feedbackSkill` | `Skill \| null` |
| `micStatus` | `'idle' \| 'unavailable' \| 'recording' \| 'transcribing'` |
| `onSend`, `onVoice`, `onDraftChange`, `onClearFeedback` | handlers |

Pinned bottom, present in every state including while a sheet is closing.

**Voice is the wide bar and text is the compact row beneath it**, because that is the order the product argues for: you say what you want, and typing is the fallback. It was previously the other way round, with voice as a small round button beside a text field.

Tap to start, tap to finish - not press-and-hold. Hold reads better, but `getUserMedia` resolves asynchronously, so a quick release can land while `micStatus` is still `idle` and start a second recorder. A duplicated recorder on stage is worse than a less tactile affordance.

The bar visualises input only. Nothing in the app plays audio (FE-R-22), which is also why the level-up and discovery effects are silent.

Validation: trim, reject empty, cap length with the cap visible near it (FE-R-23). No injection guard - that is a trust-boundary control and this is not a trust boundary.

`feedbackSkill` renders as a small badge naming the skill the next message is about (FE-R-30), clearable.

`micStatus === 'unavailable'` replaces the bar with a single line saying so and leaves the text row untouched (FE-R-20). A voice capture returns a transcript into `draft` as an editable draft rather than sending it (FE-R-21).

---

## SkillCompendium

A sheet raised over the character, not a route - which is what keeps US-2.1's "without navigating elsewhere" true.

| Prop | Type |
|---|---|
| `skills` | `Skill[]` |
| `lang` | `Lang` |
| `onInvoke`, `onStartFeedback`, `onClose` | handlers |

It stops short of the top of the screen on purpose. The character stays visible above it, so browsing what it discovered happens in front of the thing that discovered it - a full-bleed overlay covered the element Q5 D put at the centre.

Renders only `status: 'active'` skills (FE-R-15).

**No empty or locked slots** (FE-R-14). One non-enumerating line may close the list. The sheet has no `min-height` for the same reason: empty is a real state, not a grid of placeholders that always fills the space.

### SkillCard

| Prop | Type |
|---|---|
| `skill` | `Skill` |
| `onInvoke` | `(id: string) => void` |
| `onStartFeedback` | `(id: string) => void` |

- `tier` renders as a badge distinguishable at a glance (FE-R-12)
- `reason` renders inline, expanded, always (FE-R-13)
- invoke button passes `skill.id`, never the name (FE-R-31)
- talk action closes the overlay, focuses the input, and binds `skill.id` as feedback context (Q6 D)
- `revisedAt` present renders a small revised marker, and the card updates in place rather than being replaced (FE-R-16)

---

## Component-to-request map

Requests are issued by App handlers. This maps which interaction reaches which route, so the mock contract and the components stay aligned.

| Interaction | Handler | Route |
|---|---|---|
| App mount | initial load | `GET /api/characters`, open `GET /api/events` |
| Select character | `selectCharacter` | `GET /api/characters/:id/state`, `GET /api/characters/:id/skills` |
| Send text | `sendMessage` | `POST /api/characters/:id/messages` |
| Send voice | `sendVoice` | `POST /api/transcribe`, then `sendMessage` |
| Invoke skill | `invokeSkill` | `POST /api/characters/:id/skills/:skillId/invoke` |
| Feedback | `sendMessage` with `skillId` | `POST /api/characters/:id/messages` |
| Announcement | SSE handler | event on `GET /api/events` |

Route shapes are FE's proposal and are settled with BE - see `backend-mock-contract.md`.

---

## Styling

Plain CSS with custom properties, one file. No UI kit, no CSS-in-JS, no animation library.

Two screens and two sheets. A component library would be larger than the application. State variants are expressed as `data-*` attribute selectors (`[data-tier]`, `[data-kind]`, `[data-level]`, `[data-pending]`, `[data-state]`) rather than as generated class names, so the DOM says what state it is in.

**Light, and warm rather than white.** The character is the largest thing on the screen; a paper-toned stage keeps its per-product tint readable under projection, where a dark theme collapses every tint to the same grey.

**Two accent tokens per product, not one.** `--product` is for strokes, fills and tints. `--product-ink` is the same hue darkened until it clears 4.5:1 on white, and is the only one used for text or behind white text - the mid-tone accents sit around 3.4:1 and fail as body text.

Both are declared as literal values inside each `[data-product]` block rather than derived from `--product` with `color-mix`. A custom property that references another resolves against the element it is **declared** on, so a single `--product-ink` in `:root` would silently keep the root hue on every product.

**Typography**: Pretendard for Korean body text, Instrument Sans for Latin labels and numerals. A `.tnum` utility applies tabular figures to level, exp, device values and dates - they sit next to each other and change while the screen is being watched, and proportional digits make them jitter. Both faces are CDN-hosted and the layout does not depend on either; a demo without network falls back to the system stack.

**Motion** is CSS keyframes only, all disabled under `prefers-reduced-motion: reduce`. One rule worth stating because it has already caused a bug: a keyframe that sets `transform` replaces the whole property, offset included - so a centred element animated by scale must repeat its `translate` in every step, and two `transform` animations must not share an element.

**Sprite transparency is a data problem, and was fixed in the data.** The frames were originally exported near-white (254,254,254) rather than transparent, so the frame's own canvas occluded the aura tint and floor shadow behind it and left a visible rectangle. That was first patched in CSS with two intersecting linear-gradient edge fades - and the patch could not be made safe, because several `levelup` frames put real content flush against the frame boundary with no margin, so any fade wide enough to hide the seam clipped the chair. The frames now carry real alpha instead, flood-filled inward from the four borders so only background actually connected to an edge became transparent and the fill stopped at the character's outline. The mask is gone and `.stage-sprite` is a plain `object-fit: contain`.

Worth generalising: the CSS was being asked to guess where the character ended, from position alone. The asset already knew. Cost is a larger payload - alpha took the sequences from 2.1 MB to 3.8 MB - which buys a correct silhouette on every frame instead of an approximation that fails on some.

### Verification note

Screenshot verification on macOS needs a viewport of at least 500px wide; Chrome enforces that minimum and silently lays out at 500 while writing a smaller image, which produces offset and clipped captures. Also, `--virtual-time-budget` fast-forwards timers but **not** the CSS animation clock, so transitions appear frozen near their start value. Pass `--force-prefers-reduced-motion` when capturing settled state.
