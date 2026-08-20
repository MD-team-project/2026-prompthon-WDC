/**
 * The character screen.
 *
 * Q5 D put the character at the centre and made chat secondary. The layout now
 * says the same thing the decision does: the stage is the only region that
 * grows, and everything else is a fixed strip around it.
 *
 *   hud            name, level+exp pill, back, compendium
 *     + spotlight  the most recent discovery, as a toast floating just below
 *                  the HUD. It waits for the character's own reaction to
 *                  finish before appearing, stays until tapped, and renders
 *                  nothing at all between discoveries - so its presence never
 *                  moves anything else on this screen, HUD included.
 *   stage-wrap     the character, flex:1. Level-up and speech happen here
 *   switcher       the other two characters, one tap or one swipe away
 *   stat-stack     two panels, always here: today's readings (weather, steps,
 *                  distance, screen time) above device state. Cause above
 *                  effect - the day is why the character suggests a setting
 *   input-bar      voice first, text beneath
 *   + sheets       conversation log, skill compendium - raised, not routed
 *
 * Previously `.speech` was the only region with `flex: 1` and the character sat
 * in a fixed 176px band above it, which made the screen a chat client with an
 * avatar. Inverting that budget is the whole of this change; an announcement now
 * reads as the character speaking because the character is what fills the screen
 * when it speaks.
 *
 * FE-R-2: progression (the HUD pill, right here) and device state
 * (`DeviceStatStrip`) are rendered from two different props on two different
 * components, and neither one has a prop that could carry the other's data.
 * `CharacterStage` no longer takes progression at all - it only needs to know
 * WHETHER a level-up is happening (`levelUp`), not the numbers behind it.
 *
 * FE-R-7: no control anywhere on this screen sets device state. The only inputs
 * are speech and text.
 */

import { useEffect, useRef, useState } from 'react';
import type {
  Character,
  ChatMessage,
  DailyContextStats,
  DeviceStats,
  Lang,
  Skill,
} from '@prompthon/shared';
import { neighbourId, progressRatio } from '../pure';
import type { MicStatus } from '../state';
import type { translator } from '../strings';
import { CharacterStage } from './CharacterStage';
import { CharacterSwitcher } from './CharacterSwitcher';
import { ContextStatStrip } from './ContextStatStrip';
import { DeviceStatStrip } from './DeviceStatStrip';
import { InputBar } from './InputBar';
import { SkillCompendium } from './SkillCompendium';
import { SpeechArea, ConversationSheet } from './SpeechArea';
import { SpotlightCard } from './SpotlightCard';

/** Far enough that a tap on a dot or a vertical scroll is not a swipe. */
const SWIPE_MIN_PX = 44;

interface Props {
  character: Character;
  characters: Character[];
  lang: Lang;
  deviceStats: DeviceStats | null;
  /** Not per-character - one user, one reading. See `ContextStatStrip`. */
  dailyContext: DailyContextStats | null;
  contextFailed: boolean;
  messages: ChatMessage[];
  skills: Skill[];
  unseen: Record<string, number>;
  pending: boolean;
  levelUp: boolean;
  discovery: boolean;
  compendiumOpen: boolean;
  logOpen: boolean;
  draft: string;
  micStatus: MicStatus;
  feedbackSkill: Skill | null;
  unseenElsewhere: number;
  t: ReturnType<typeof translator>;
  onBack: () => void;
  onSelectCharacter: (characterId: string) => void;
  onToggleCompendium: (open: boolean) => void;
  onToggleLog: (open: boolean) => void;
  onDraftChange: (draft: string) => void;
  onSend: (text: string) => void;
  onVoice: () => void;
  onInvoke: (skillId: string) => void;
  onStartFeedback: (skillId: string) => void;
  onClearFeedback: () => void;
  onLevelUpDone: () => void;
  onDiscoveryDone: () => void;
}

export function CharacterView(props: Props) {
  const { character, t } = props;
  const swipeStartX = useRef<number | null>(null);

  /*
   * `.stage-slide` (character + caption) re-mounts on every switch so its
   * entrance keyframe replays - a prop change alone can't restart a CSS
   * animation on an element that's already mounted. `slide` carries the
   * remount key plus which side the new character enters from; it starts
   * `null` so the character screen's own first appearance never animates as
   * if it had been swiped to.
   *
   * The direction has to be captured at the moment a switch is REQUESTED
   * (swipe or dot), not derived after `character` changes - by the time this
   * effect sees the new id, the swipe that caused it is long over.
   */
  const pendingDirectionRef = useRef<1 | -1>(1);
  const prevCharacterIdRef = useRef(character.id);
  const slideTokenRef = useRef(0);
  const [slide, setSlide] = useState<{ token: number; direction: 1 | -1 } | null>(null);

  useEffect(() => {
    if (prevCharacterIdRef.current === character.id) return;
    prevCharacterIdRef.current = character.id;
    slideTokenRef.current += 1;
    setSlide({ token: slideTokenRef.current, direction: pendingDirectionRef.current });
  }, [character.id]);

  const selectCharacter = (characterId: string, direction: 1 | -1) => {
    pendingDirectionRef.current = direction;
    props.onSelectCharacter(characterId);
  };

  // The switcher dots and this swipe dispatch the same action, so a swipe has no
  // state of its own to keep in step. `neighbourId` owns the wrap-around.
  const endSwipe = (clientX: number) => {
    const start = swipeStartX.current;
    swipeStartX.current = null;
    if (start === null) return;

    const travelled = clientX - start;
    if (Math.abs(travelled) < SWIPE_MIN_PX) return;

    const direction: 1 | -1 = travelled < 0 ? 1 : -1;
    const target = neighbourId(
      props.characters.map((c) => c.id),
      character.id,
      direction,
    );
    if (target) selectCharacter(target, direction);
  };

  /** Dots have no drag direction of their own - forward if the tapped
   * character sits later in the roster order, back otherwise. */
  const directionTo = (targetId: string): 1 | -1 => {
    const ids = props.characters.map((c) => c.id);
    const from = ids.indexOf(character.id);
    const to = ids.indexOf(targetId);
    return to > from ? 1 : -1;
  };

  /** The last skill to arrive. `upsertSkill` appends, so this is the newest. */
  const latestSkill = props.skills.at(-1) ?? null;

  // Does not derive level from exp. BE owns the curve.
  const expRatio = progressRatio(character.exp, character.expToNext);

  return (
    <div className="character" data-product={character.productId}>
      <header className="hud">
        <button
          type="button"
          className="hud-button"
          onClick={props.onBack}
          aria-label={t('character.back')}
          data-testid="character-back-button"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
          {/* FE-R-28: the badge follows onto the back control, so a discovery
              elsewhere is visible without leaving this screen. */}
          {props.unseenElsewhere > 0 ? (
            <span className="badge badge-corner tnum" data-testid="character-back-badge">
              {props.unseenElsewhere}
            </span>
          ) : null}
        </button>

        <div className="hud-id">
          <span className="hud-name">{character.name}</span>
          {/* Level and exp as one pill: the two numbers that make up progression,
              grouped together and apart from device state (FE-R-2). Exp is a
              bar rather than a second number - the level text already carries
              the precise digit, and the bar is what reads at a glance. */}
          <span className="hud-progress" data-testid="stat-progress">
            <span className="hud-level tnum" data-testid="stat-level">
              {t('stat.level')} {character.level}
            </span>
            <span className="bar bar-sm hud-exp-bar" aria-hidden="true">
              <span className="bar-fill" style={{ width: `${expRatio * 100}%` }} />
            </span>
            <span className="visually-hidden" data-testid="stat-exp">
              {t('stat.exp')} {character.exp}
              {character.expToNext > 0 ? ` / ${character.expToNext}` : ''}
            </span>
          </span>
        </div>

        <button
          type="button"
          className="hud-button hud-button-wide"
          onClick={() => props.onToggleCompendium(!props.compendiumOpen)}
          data-testid="character-compendium-toggle"
        >
          {t('character.skills')}
          <span className="pill tnum">{props.skills.length}</span>
        </button>

        {/*
          A toast, not a panel: it positions itself (`top: 100%` off this
          header) and renders nothing at all between discoveries, so whether a
          skill was just found never changes where the device panel or the
          input bar sit. Anchored under the HUD rather than over the stage: it
          used to float over the caption at the bottom, but the "LEVEL UP"
          banner moved there too (see `CharacterStage`), and the two were
          landing on top of each other.

          `busy` only waits on a bare discovery (no level-up) - the surprise
          reaction is the moment the toast would otherwise cover, per
          `SpotlightCard`'s own note. A level-up gets no such wait: the toast
          is meant to land WITH it, not after it, so `levelUp` overrides
          `discovery` here instead of adding to it.
        */}
        <SpotlightCard
          skill={latestSkill}
          busy={props.discovery && !props.levelUp}
          t={t}
          onOpen={() => props.onToggleCompendium(true)}
        />
      </header>

      <div
        className="stage-wrap"
        onPointerDown={(event) => {
          swipeStartX.current = event.clientX;
        }}
        onPointerUp={(event) => endSwipe(event.clientX)}
        onPointerCancel={() => {
          swipeStartX.current = null;
        }}
        data-testid="stage-wrap"
      >
        <div
          key={slide?.token ?? 'initial'}
          className="stage-slide"
          data-direction={slide ? (slide.direction === -1 ? 'prev' : 'next') : undefined}
        >
          <CharacterStage
            artRef={character.artRef}
            productId={character.productId}
            levelUp={props.levelUp}
            onLevelUpDone={props.onLevelUpDone}
            discovery={props.discovery}
            onDiscoveryDone={props.onDiscoveryDone}
            t={t}
          />

          <SpeechArea
            messages={props.messages}
            pending={props.pending}
            logOpen={props.logOpen}
            t={t}
            onToggleLog={props.onToggleLog}
          />
        </div>
      </div>

      {props.characters.length > 1 ? (
        <div className="stage-under">
          <CharacterSwitcher
            characters={props.characters}
            activeId={character.id}
            unseen={props.unseen}
            t={t}
            onSelect={(characterId) => selectCharacter(characterId, directionTo(characterId))}
          />
          <p className="stage-hint">{t('stage.hint')}</p>
        </div>
      ) : null}

      {/*
        Two panels, one above the other: today's readings, then the device.
        In that order because it is the order of the reasoning - the character
        notices the day first and proposes a setting because of it, and reading
        the cause above the effect is what makes the suggestion legible rather
        than arbitrary.

        Wrapped rather than stacked as two siblings so the gap between them is
        set once here, and so `.stat-panel`'s own margins stay a property of the
        stack instead of each panel needing to know what sits next to it.
      */}
      <div className="stat-stack">
        <ContextStatStrip
          context={props.dailyContext}
          failed={props.contextFailed}
          lang={props.lang}
          t={t}
        />

        <DeviceStatStrip
          deviceStats={props.deviceStats}
          pending={props.pending}
          lang={props.lang}
          t={t}
        />
      </div>

      <InputBar
        draft={props.draft}
        micStatus={props.micStatus}
        feedbackSkill={props.feedbackSkill}
        t={t}
        onDraftChange={props.onDraftChange}
        onSend={props.onSend}
        onVoice={props.onVoice}
        onClearFeedback={props.onClearFeedback}
      />

      {props.logOpen ? (
        <ConversationSheet
          messages={props.messages}
          t={t}
          onClose={() => props.onToggleLog(false)}
        />
      ) : null}

      {props.compendiumOpen ? (
        <SkillCompendium
          skills={props.skills}
          lang={props.lang}
          t={t}
          onClose={() => props.onToggleCompendium(false)}
          onInvoke={props.onInvoke}
          onStartFeedback={props.onStartFeedback}
        />
      ) : null}
    </div>
  );
}
