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
 *   switcher       the other two characters, one tap away
 *   stat-panel     device state, always here
 *   input-bar      voice first, text beneath
 *   + sheets       conversation log, skill compendium, today's readings -
 *                  raised, not routed. All three rise from the bottom
 *
 * Today's readings (weather, steps, distance, screen time) used to be a second
 * panel above device state. They cost a row of the one budget that matters here
 * and are reference material rather than live state, so they moved behind the
 * HUD's weather button - see the note on it below.
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
// `neighbourId` is gone with swipe navigation - switching is switcher-only now.
import type { ContextScenario } from '../api';
import { progressRatio } from '../pure';
import type { MicStatus } from '../state';
import { productLabel, weatherGlyph, type translator } from '../strings';
import { CharacterStage } from './CharacterStage';
import { CharacterSwitcher } from './CharacterSwitcher';
import { ContextSheet } from './ContextSheet';
import { DeviceStatStrip } from './DeviceStatStrip';
import { InputBar } from './InputBar';
import { SkillCompendium } from './SkillCompendium';
import { SpeechArea, ConversationSheet } from './SpeechArea';
import { SpotlightCard } from './SpotlightCard';

interface Props {
  character: Character;
  characters: Character[];
  lang: Lang;
  deviceStats: DeviceStats | null;
  /** Not per-character - one user, one reading. See `ContextSheet`. */
  dailyContext: DailyContextStats | null;
  contextFailed: boolean;
  messages: ChatMessage[];
  skills: Skill[];
  unseen: Record<string, number>;
  pending: boolean;
  streaming: boolean;
  levelUp: boolean;
  discovery: boolean;
  poweredUp: boolean;
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
  onLevelUpTrigger: () => void;
  /**
   * Demo lever, not a device control - FE-R-7 is about DEVICE state (the
   * massage chair's settings etc.); today's weather/steps/screen-time is app
   * context the character reads, never something it or the device holds. A
   * rehearsal picking which story today tells is not the user operating the
   * appliance.
   */
  onSetScenario: (scenario: ContextScenario) => void;
}

export function CharacterView(props: Props) {
  const { character, t } = props;

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

  /*
   * Local, not in the reducer, unlike the log and compendium sheets. Those are
   * per-character and their open state is something the rest of the app reasons
   * about; today's readings are one user's single reading, shared by every
   * character, and nothing outside this component needs to know whether the
   * sheet is up.
   */
  const [contextOpen, setContextOpen] = useState(false);

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
        <div className="hud-left">
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

          {/*
            Today's readings live behind this, in the HUD rather than in a strip
            above the input bar. The strip cost a row of a screen where
            `.stage-wrap` is the only region with height to give, and the
            readings are reference material - the character states the figure it
            acted on in what it says, so the panel does not have to be permanently
            open for the suggestion to be checkable.

            Today's weather as the icon, so the control is not a neutral glyph:
            the one reading that needs no unit doubles as the affordance.

            Disabled rather than hidden while there is nothing to show. FE-R-19
            wants a failure to say so, and a control that quietly disappears on
            failure looks identical to one that was never there.
          */}
          <button
            type="button"
            className="hud-button hud-button-glyph"
            onClick={() => setContextOpen(true)}
            disabled={props.dailyContext === null}
            aria-haspopup="dialog"
            aria-label={
              props.dailyContext === null
                ? t(props.contextFailed ? 'context.unavailable' : 'context.none')
                : t('context.detail')
            }
            data-testid="character-context-toggle"
          >
            <span aria-hidden="true">
              {props.dailyContext === null ? '⋯' : weatherGlyph(props.dailyContext.weather)}
            </span>
          </button>
        </div>

        <div className="hud-id">
          <span className="hud-heading">
            <span className="hud-name">{character.name}</span>
            <span className="hud-product">{productLabel(character.productId, props.lang)}</span>
          </span>
          {/* Level and exp as one pill: the two numbers that make up progression,
              grouped together and apart from device state (FE-R-2). Exp is a
              bar rather than a second number - the level text already carries
              the precise digit, and the bar is what reads at a glance.

              A button, not a label: BE has no levelling logic yet (see
              `applyLevelUp` in `pure.ts`), so this is the manual half of the
              two ways to level up in the meantime - the other being reaching
              two skills in the compendium. */}
          <button
            type="button"
            className="hud-progress"
            onClick={props.onLevelUpTrigger}
            aria-label={`${t('stat.level')} ${character.level}, ${t('stat.levelUpTrigger')}`}
            data-testid="stat-progress"
          >
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
          </button>
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

          `busy` waits on the discovery reaction whether or not a level-up is
          also playing - the surprise/level-up animation is the moment the
          toast would otherwise cover. Every discovery levels the character up
          now (`applyDiscoveryLevelUp` in `state.ts`, since BE has no levelling
          of its own yet), so the two are no longer separable events where
          "landing WITH it" would still mean something different from "waiting
          for it": the toast always appears a beat after the animation starts,
          once that reaction clears.
        */}
        <SpotlightCard
          skill={latestSkill}
          busy={props.discovery}
          t={t}
          onOpen={() => props.onToggleCompendium(true)}
        />
      </header>

      <div className="stage-wrap" data-testid="stage-wrap">
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
            poweredUp={props.poweredUp}
            pending={props.pending}
            streaming={props.streaming}
            t={t}
          />

          <SpeechArea messages={props.messages} pending={props.pending} t={t} />
        </div>

        {/* Fixed to the stage's own bottom-right corner rather than the
            balloon's - a stable spot the caption's own state (idle text,
            balloon, or nothing while a reply is pending) never moves. */}
        {props.messages.length > 0 ? (
          <button
            type="button"
            className="chat-log-button"
            onClick={() => props.onToggleLog(!props.logOpen)}
            aria-label={t('character.log')}
            data-testid="speech-log-toggle"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 7v5l3 3M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5" />
            </svg>
            <span className="tnum">{props.messages.length}</span>
          </button>
        ) : null}
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
        </div>
      ) : null}

      {/*
        Device state only. Today's readings used to sit in a wrapper above this
        one; they moved into the HUD button, so the wrapper is gone and this
        panel is back to carrying its own margin.
      */}
      <DeviceStatStrip
        deviceStats={props.deviceStats}
        pending={props.pending}
        lang={props.lang}
        t={t}
      />

      <InputBar
        draft={props.draft}
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
        />
      ) : null}

      {/* Rises from the bottom like the other two, even though its button is in
          the HUD - so does the compendium's. Where a sheet enters from is this
          app's one sheet gesture, not a pointer back to the control that opened
          it. */}
      {contextOpen && props.dailyContext !== null ? (
        <ContextSheet
          context={props.dailyContext}
          lang={props.lang}
          t={t}
          onClose={() => setContextOpen(false)}
          onSetScenario={props.onSetScenario}
        />
      ) : null}
    </div>
  );
}
