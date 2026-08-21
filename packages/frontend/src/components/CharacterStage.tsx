/**
 * The stage. The character, and where level-up happens.
 *
 * This is the largest region on the screen by design. Interaction with the
 * character is the product, so the character occupies the space rather than
 * sitting above a conversation that occupies it.
 *
 * Progression (level, exp) no longer renders here - no halo ring, no
 * level-shaped border around the character. Both read as decoration once real
 * art is in the slot, so the two numbers moved to the HUD pill in
 * `CharacterView` instead (a level readout plus a small bar), and this
 * component only takes `levelUp`/`onLevelUpDone` - the boolean that drives the
 * in-place effect, not the numbers behind it.
 *
 * FE-R-11: `artRef` resolves through config to a static asset. Nothing generates
 * an image (NFR-4.2).
 *
 * FE-R-8: the effect plays IN PLACE, no overlay. An overlay would cover the
 * character, which is the thing Q5 D put at the centre of the screen. The burst
 * and the vignette are children of the stage, not a layer over the app.
 *
 * FE-R-9: it is not synchronised with the announcement. The two arrive from
 * different sources and render independently; a generous duration means they
 * usually overlap, which is what replaces sequencing logic.
 *
 * FE-R-7: nothing here is a control. No slider, no toggle, no stepper.
 *
 * The massage chair is the one product with an animated reaction so far:
 * frame sequences dropped in under `public/characters/massagechair`. Frame 0
 * of `surprise/` is the idle pose (no effect) - unless the character has
 * levelled up at all this session (`poweredUp`), in which case idle becomes
 * the looping `poweredup/` fire-aura sequence instead, for as long as nothing
 * else is claiming the sprite (`showPoweredUp` below). `surprise/` plays once while
 * `discovery` is true (a new skill arrived) - a discovery no longer implies a
 * level-up (they're separate events now, see `state.ts`), so this is the ONLY
 * thing a skill discovery ever plays, for every product. `poweredup/` is also
 * what plays WHILE `levelUp` is true, not just after: levelling up has no
 * dedicated transition sequence of its own any more, since being sticky, the
 * loop it hands off to on its own is already the level-up's own reaction.
 * `levelUp` clears on a fixed timer (`LEVEL_UP_MS`) rather than a frame count,
 * same as every other product, because looping has no natural "done".
 *
 * Two more sequences loop rather than play once: `thinking/` while `pending`
 * is true and no token has arrived yet, and `talking/` from the first
 * streamed token until the reply finishes. Both hand back to idle the moment
 * their driving flag clears rather than on a frame count, since neither has a
 * fixed length to run out.
 *
 * `pral` and `shoecase` have real art too (`STATIC_ART_SRC` below) but only
 * one frame each, no reaction sequence - so they keep the CSS pop/burst
 * effect (and no `poweredup`-style alternate idle, having no such asset) on
 * top of that single image, timed by `LEVEL_UP_MS` too, and `discovery` for
 * them clears on `DISCOVERY_MS` rather than on frame count, for the same
 * reason. Any product with neither falls back to the abstract placeholder
 * (Q8 C).
 */

import { useEffect, useRef, useState } from 'react';
import type { ProductId } from '@prompthon/shared';
import type { translator } from '../strings';

/** No frame-driven sequence has a natural "done" any more (see the note above), so every product - massagechair included - clears `levelUp` on this timer. Long enough that an SSE announcement typically lands mid-effect. */
const LEVEL_UP_MS = 1500;

const LEVEL_UP_SOUND_SRC = '/sounds/level-up.mp3';
const SKILL_UNLOCK_SOUND_SRC = '/sounds/skill-unlock.mp3';
const LEVEL_UP_VOLUME = 1;
/** skill-unlock.mp3 is mastered louder than level-up.mp3 - scaled down to sound roughly the same size. */
const SKILL_UNLOCK_VOLUME = 0.35;

/**
 * `pral` and `shoecase` have no discovery reaction to play, but `discovery`
 * still needs to clear itself so the spotlight toast (gated on it, in
 * `CharacterView`) knows the character is done reacting and it is safe to
 * show. Same duration as `LEVEL_UP_MS` so a discovery and a level-up that
 * arrive together (the common case) clear together too.
 */
const DISCOVERY_MS = 1500;

/** Frames 0-64 of "loop-0", dropped in whole. Frame 0 is idle. */
const SURPRISE_FRAME_COUNT = 65;
const SURPRISE_FRAME_MS = 40;

/** Full 121-frame "thinking" loop, played for as long as a chat reply is pending. */
const THINKING_FRAME_COUNT = 121;
const THINKING_FRAME_MS = 40;

/** Full 73-frame "talking" loop, played for as long as the reply is still streaming in. */
const TALKING_FRAME_COUNT = 73;
const TALKING_FRAME_MS = 40;

/** Full 121-frame "poweredup" loop - the level-up reaction AND what idle becomes afterward (see `showPoweredUp` below). */
const POWEREDUP_FRAME_COUNT = 121;
const POWEREDUP_FRAME_MS = 40;

function surpriseFrameSrc(index: number): string {
  return `/characters/massagechair/surprise/frame-${index}.webp`;
}

function thinkingFrameSrc(index: number): string {
  return `/characters/massagechair/thinking/frame-${index}.webp`;
}

function talkingFrameSrc(index: number): string {
  return `/characters/massagechair/talking/frame-${index}.webp`;
}

function poweredUpFrameSrc(index: number): string {
  return `/characters/massagechair/poweredup/frame-${index}.webp`;
}

/** The single idle image for products with real art but no reaction sequence. */
const STATIC_ART_SRC: Partial<Record<ProductId, string>> = {
  pral: '/characters/pral/idle.webp',
  shoecase: '/characters/shoecase/idle.webp',
};

interface Props {
  artRef: string;
  productId: ProductId;
  levelUp: boolean;
  onLevelUpDone: () => void;
  /** True from the moment a genuinely new skill arrives until the reaction finishes playing. */
  discovery: boolean;
  onDiscoveryDone: () => void;
  /** Sticky for the rest of the session once the character has levelled up at all. */
  poweredUp: boolean;
  /** True while a chat reply is in flight for this character. */
  pending: boolean;
  /** True from the reply's first streamed token until it finishes arriving. */
  streaming: boolean;
  t: ReturnType<typeof translator>;
}

export function CharacterStage({
  artRef,
  productId,
  levelUp,
  onLevelUpDone,
  discovery,
  onDiscoveryDone,
  poweredUp,
  pending,
  streaming,
  t,
}: Props) {
  const isMassageChair = productId === 'massagechair';
  const staticArtSrc = STATIC_ART_SRC[productId];

  // Read the callbacks through refs, not as effect dependencies. Both are
  // fresh closures every render (App re-renders on any dispatch, including
  // these two effects' own completion), and depending on them directly would
  // tear an interval down and restart its sequence from frame 0 whenever
  // something else in the app changes state. Same reasoning as `langRef` in
  // `App.tsx`.
  const onLevelUpDoneRef = useRef(onLevelUpDone);
  onLevelUpDoneRef.current = onLevelUpDone;
  const onDiscoveryDoneRef = useRef(onDiscoveryDone);
  onDiscoveryDoneRef.current = onDiscoveryDone;

  // Timed rather than frame-driven, for every product now - see the note at
  // the top of the file on why massagechair no longer has its own frame-count
  // version of this.
  useEffect(() => {
    if (!levelUp) return;
    const sound = new Audio(LEVEL_UP_SOUND_SRC);
    sound.volume = LEVEL_UP_VOLUME;
    void sound.play().catch(() => {});
    const timer = setTimeout(() => onLevelUpDoneRef.current(), LEVEL_UP_MS);
    return () => clearTimeout(timer);
  }, [levelUp]);

  useEffect(() => {
    if (!discovery) return;
    const sound = new Audio(SKILL_UNLOCK_SOUND_SRC);
    sound.volume = SKILL_UNLOCK_VOLUME;
    void sound.play().catch(() => {});
  }, [discovery]);

  const [surpriseFrame, setSurpriseFrame] = useState(0);

  useEffect(() => {
    if (!isMassageChair || !discovery) return;

    let frame = 0;
    setSurpriseFrame(0);
    const timer = setInterval(() => {
      frame += 1;
      if (frame >= SURPRISE_FRAME_COUNT) {
        clearInterval(timer);
        setSurpriseFrame(0);
        onDiscoveryDoneRef.current();
        return;
      }
      setSurpriseFrame(frame);
    }, SURPRISE_FRAME_MS);

    return () => clearInterval(timer);
  }, [discovery, isMassageChair]);

  // The non-massagechair half of the effect above: no frames to play, so just
  // clear `discovery` on a timer instead of on frame count.
  useEffect(() => {
    if (isMassageChair || !discovery) return;
    const timer = setTimeout(() => onDiscoveryDoneRef.current(), DISCOVERY_MS);
    return () => clearTimeout(timer);
  }, [discovery, isMassageChair]);

  // Unlike surprise/levelup, there's no "done" callback here - the reply
  // arriving is what clears `pending` upstream, not a fixed frame count. So
  // this loops for as long as `pending` stays true (and streaming hasn't
  // taken over below) instead of playing once.
  const [thinkingFrame, setThinkingFrame] = useState(0);
  const thinking = pending && !streaming;

  useEffect(() => {
    if (!isMassageChair || !thinking) {
      setThinkingFrame(0);
      return;
    }

    let frame = 0;
    const timer = setInterval(() => {
      frame = (frame + 1) % THINKING_FRAME_COUNT;
      setThinkingFrame(frame);
    }, THINKING_FRAME_MS);

    return () => clearInterval(timer);
  }, [thinking, isMassageChair]);

  // Same "loop until the flag clears" shape as thinking, above - the reply
  // streaming in is what keeps `streaming` true, not a frame count.
  const [talkingFrame, setTalkingFrame] = useState(0);

  useEffect(() => {
    if (!isMassageChair || !streaming) {
      setTalkingFrame(0);
      return;
    }

    let frame = 0;
    const timer = setInterval(() => {
      frame = (frame + 1) % TALKING_FRAME_COUNT;
      setTalkingFrame(frame);
    }, TALKING_FRAME_MS);

    return () => clearInterval(timer);
  }, [streaming, isMassageChair]);

  // The discovery reaction and the talking/thinking loops all outrank the
  // powered-up loop while any of them is claiming the sprite - `poweredUp`
  // being sticky doesn't mean it wins by default, only that it's what idle
  // falls back to once none of them is. `levelUp` is the one exception: it
  // outranks all three, since it's what the powered-up loop is ALSO the
  // reaction for now (see the top-of-file note) - without this, a level-up
  // landing mid-reaction would show the wrong animation.
  const reacting = discovery || streaming || thinking;
  const showPoweredUp = poweredUp && (levelUp || !reacting);

  // Same "loop until the flag clears" shape as thinking/talking, except two
  // different flags can keep it going - during the level-up moment itself,
  // and again (uninterrupted, since `showPoweredUp` never goes false in
  // between when nothing else intervenes) once idle for good afterward.
  const [poweredUpFrame, setPoweredUpFrame] = useState(0);

  useEffect(() => {
    if (!isMassageChair || !showPoweredUp) {
      setPoweredUpFrame(0);
      return;
    }

    let frame = 0;
    const timer = setInterval(() => {
      frame = (frame + 1) % POWEREDUP_FRAME_COUNT;
      setPoweredUpFrame(frame);
    }, POWEREDUP_FRAME_MS);

    return () => clearInterval(timer);
  }, [showPoweredUp, isMassageChair]);

  const spriteSrc = showPoweredUp
    ? poweredUpFrameSrc(poweredUpFrame)
    : discovery
      ? surpriseFrameSrc(surpriseFrame)
      : streaming
        ? talkingFrameSrc(talkingFrame)
        : thinking
          ? thinkingFrameSrc(thinkingFrame)
          : surpriseFrameSrc(0);

  return (
    <div className="stage" data-testid="character-stage">
      <div className="stage-aura" aria-hidden="true" />

      <div
        className="stage-character"
        data-product={productId}
        data-levelup={levelUp}
        data-art-ref={artRef}
        data-testid="character-art"
      >
        {/*
          The idle float and the level-up pop both animate `transform`, and two
          animations on one element means the later one wins outright - the pop
          was being cancelled by the float. They live on different elements now:
          the figure floats, the character scales.

          Placeholder art, Q8 C. `pral` and `shoecase` render the abstract
          gradient blob; `massagechair` has real frames, so it renders the
          current one instead.
        */}
        <div className="stage-figure" aria-hidden="true">
          {isMassageChair ? (
            <img className="stage-sprite" src={spriteSrc} alt="" />
          ) : staticArtSrc ? (
            <img className="stage-sprite" src={staticArtSrc} alt="" />
          ) : (
            <div className="stage-art" />
          )}
        </div>

        {/* FE-R-8: a child of the character, so the effect is in place. */}
        <div className="stage-burst" aria-hidden="true" />
      </div>

      <div className="stage-floor" aria-hidden="true">
        <i />
      </div>

      {levelUp ? (
        <div className="stage-levelup" role="status" data-testid="character-levelup">
          {t('stage.levelup')}
        </div>
      ) : null}
    </div>
  );
}
