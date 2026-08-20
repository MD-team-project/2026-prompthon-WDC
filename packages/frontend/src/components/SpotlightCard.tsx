/**
 * The most recent discovery, as a persistent toast over the stage.
 *
 * US-3.2's beat is that the character finds something on its own. This used
 * to be a permanent panel with its own empty state ("nothing yet") sitting
 * between the device panel and the input bar - which meant the layout itself
 * was different depending on whether a skill had ever been discovered, and
 * shifted again the moment the first one arrived. A toast has no empty state
 * to render and positions itself over the screen rather than in the flex
 * column, so a discovery changes what's on screen without changing where
 * anything else sits.
 *
 * Two things this toast does NOT do, on request:
 *
 *   - Appear the instant the skill arrives. `discovery`/`levelUp` are the same
 *     booleans `CharacterStage` uses to run its own reaction - while either is
 *     true the character is still mid-animation, and popping the toast up over
 *     the stage at that moment covers the thing that animation exists to show.
 *     `busy` below waits for both to clear first.
 *   - Disappear on its own. Once shown it stays until the user taps it, which
 *     both opens the compendium and dismisses it - no timer, no reappearing.
 *
 * FE-R-14: this shows a skill that exists, full stop. No empty slot, no
 * locked entry, no count of what is coming - dropping the idle state removed
 * the one place that was closest to violating that.
 *
 * FE-R-13: the reason is not here. It renders in full, expanded, on the card
 * in the compendium - which is where this leads with one tap. Showing a
 * clipped reason here would be the "behind a tap" failure in a different
 * costume.
 *
 * Tier no longer has a text label here - just the accent dot's glow, kept
 * subtle rather than spelled out.
 *
 * Keyed by `skill.id`, not by object identity: a revision of the skill
 * already showing keeps its id (FE-R-16), so it does not restart the wait for
 * `busy` or count as a new discovery, matching `isNewSkill` in `state.ts`.
 *
 * The button itself carries `key={shown.id}` so each distinct skill remounts
 * the DOM node rather than reusing it - that's what makes the pop-in/ring/
 * shine entrance below replay for every discovery instead of only the first.
 * A revision (same id) intentionally does NOT remount, for the same reason
 * FE-R-16 keeps its position: it was not just discovered again.
 */

import { useEffect, useState } from 'react';
import type { Skill } from '@prompthon/shared';
import type { translator } from '../strings';

interface Props {
  skill: Skill | null;
  /** True while the character is still playing its own reaction to this skill. */
  busy: boolean;
  t: ReturnType<typeof translator>;
  onOpen: () => void;
}

export function SpotlightCard({ skill, busy, t, onOpen }: Props) {
  const [shown, setShown] = useState<Skill | null>(null);

  useEffect(() => {
    if (!skill || busy) return;
    setShown(skill);
  }, [skill?.id, busy]);

  if (!shown) return null;

  return (
    <button
      key={shown.id}
      type="button"
      className="spotlight"
      data-tier={shown.tier}
      onClick={() => {
        setShown(null);
        onOpen();
      }}
      data-testid="spotlight-card"
    >
      <span className="spotlight-mark" aria-hidden="true" />

      <span className="spotlight-body">
        <span className="spotlight-label">
          {t('spotlight.label')}
          {shown.revisedAt ? ` · ${t('skill.revised')}` : ''}
        </span>
        {/* Skill names stay in the language they were generated in (US-4.2). */}
        <span className="spotlight-name">{shown.name}</span>
      </span>

      <span className="spotlight-arrow" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </span>

      <span className="visually-hidden">{t('spotlight.open')}</span>
    </button>
  );
}
