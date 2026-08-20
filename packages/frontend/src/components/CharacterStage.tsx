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
 * The massage chair is the one product with an animated reaction so far: two
 * frame sequences dropped in under `public/characters/massagechair`. Frame 0
 * of `surprise/` is the idle pose (no effect). `surprise/` plays once while
 * `discovery` is true (a new skill arrived); `levelup/` plays once while
 * `levelUp` is true, and takes priority if both happen to be true at once -
 * levelling up is the rarer event. Either one hands back to idle when its
 * frames run out, driven by frame count rather than a fixed duration.
 *
 * `pral` and `shoecase` have real art too (`STATIC_ART_SRC` below) but only
 * one frame each, no reaction sequence - so they keep the CSS pop/burst
 * effect on top of that single image, timed by `LEVEL_UP_MS` instead, and
 * `discovery` for them clears on `DISCOVERY_MS` rather than on frame count,
 * for the same reason. Any product with neither falls back to the abstract
 * placeholder (Q8 C).
 */

import { useEffect, useRef, useState } from 'react';
import type { ProductId } from '@prompthon/shared';
import type { translator } from '../strings';

/** Long enough that an SSE announcement typically lands mid-effect. Non-massagechair only. */
const LEVEL_UP_MS = 1500;

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

/** Frames 65-120 of "loop-1", re-indexed from 0. */
const LEVEL_UP_FRAME_COUNT = 56;
const LEVEL_UP_FRAME_MS = 40;

function surpriseFrameSrc(index: number): string {
  return `/characters/massagechair/surprise/frame-${index}.webp`;
}

function levelUpFrameSrc(index: number): string {
  return `/characters/massagechair/levelup/frame-${index}.webp`;
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
  t: ReturnType<typeof translator>;
}

export function CharacterStage({
  artRef,
  productId,
  levelUp,
  onLevelUpDone,
  discovery,
  onDiscoveryDone,
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

  // The generic CSS pop/burst effect, timed rather than frame-driven. Only for
  // products with no real art - `isMassageChair` completes its own effect
  // below, once its frames run out.
  useEffect(() => {
    if (isMassageChair || !levelUp) return;
    const timer = setTimeout(() => onLevelUpDoneRef.current(), LEVEL_UP_MS);
    return () => clearTimeout(timer);
  }, [levelUp, isMassageChair]);

  const [levelUpFrame, setLevelUpFrame] = useState(0);

  useEffect(() => {
    if (!isMassageChair || !levelUp) return;

    let frame = 0;
    setLevelUpFrame(0);
    const timer = setInterval(() => {
      frame += 1;
      if (frame >= LEVEL_UP_FRAME_COUNT) {
        clearInterval(timer);
        setLevelUpFrame(0);
        onLevelUpDoneRef.current();
        return;
      }
      setLevelUpFrame(frame);
    }, LEVEL_UP_FRAME_MS);

    return () => clearInterval(timer);
  }, [levelUp, isMassageChair]);

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

  // Level-up outranks the discovery reaction when both are true at once (the
  // mock, and presumably BE, often send them together) - it is the rarer of
  // the two. Either falls back to the idle frame.
  const spriteSrc = levelUp
    ? levelUpFrameSrc(levelUpFrame)
    : discovery
      ? surpriseFrameSrc(surpriseFrame)
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
