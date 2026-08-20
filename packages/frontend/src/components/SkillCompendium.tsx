/**
 * The skill compendium. A sheet raised over the character, not a route - which
 * is what keeps US-2.1's "without navigating elsewhere" true.
 *
 * It stops short of the top of the screen on purpose. The character stays
 * visible above it, so browsing what it discovered still happens in front of the
 * thing that discovered it. A full-bleed overlay covered the character, which is
 * the element Q5 D put at the centre.
 *
 * FE-R-14: no empty and no locked slots. N empty slots imply skills are drawn
 * from a predetermined finite catalogue, which is the opposite of what this
 * product claims, and FR-2.4 and US-3.3 state nothing is gated by level. The
 * closing line deliberately does not enumerate what is coming - which is also
 * why the tier frames below are a property of cards that exist rather than a
 * grid with gaps in it.
 *
 * FE-R-13: the reason is inline and expanded, never behind a tap, and never
 * clamped to a line count. That sentence is the evidence that converts
 * autonomous discovery from an assertion into something witnessed, and behind a
 * tap half an audience never sees it.
 *
 * FE-R-12: tier is still distinguishable at a glance via the card's own frame
 * (`data-tier` below) - the separate text label ("기본"/"고급") that used to sit
 * next to the name was dropped as redundant with it. `.skill-tier-mark` is
 * part of that same frame, not a reintroduction of the label: a faceted
 * gem, not a word, and `aria-hidden` for the same reason the frame colour
 * itself carries no accessible text.
 *
 * Cards animate in staggered by list position (`--i`, from `index` below) so
 * opening the dex reads as a collection revealing itself rather than a list
 * appearing at once. The stagger caps at 8 slots so a long list doesn't make
 * the last cards wait on a queue.
 *
 * FE-R-16: a revised skill keeps its id and its position, and carries a mark. It
 * is evidence that feedback changed the skill rather than replacing it.
 */

import type { CSSProperties } from 'react';
import type { Lang, Skill } from '@prompthon/shared';
import type { translator } from '../strings';

interface Props {
  skills: Skill[];
  lang: Lang;
  t: ReturnType<typeof translator>;
  onClose: () => void;
  onInvoke: (skillId: string) => void;
  onStartFeedback: (skillId: string) => void;
}

export function SkillCompendium({ skills, lang, t, onClose, onInvoke, onStartFeedback }: Props) {
  return (
    <div className="sheet-layer" data-testid="compendium-layer">
      <button
        type="button"
        className="sheet-scrim"
        aria-label={t('skill.close')}
        onClick={onClose}
        data-testid="compendium-scrim"
      />

      <div
        className="sheet sheet-tall"
        role="dialog"
        aria-modal="true"
        data-testid="compendium"
      >
        <div className="sheet-header">
          <span className="sheet-grip" aria-hidden="true" />
          <h2 className="sheet-title">{t('character.skills')}</h2>
          <button
            type="button"
            className="text-button"
            onClick={onClose}
            data-testid="compendium-close-button"
          >
            {t('skill.close')}
          </button>
        </div>

        <div className="sheet-body">
          {skills.length === 0 ? (
            <p className="compendium-empty">{t('skill.empty')}</p>
          ) : (
            <ul className="skill-list">
              {skills.map((skill, index) => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  index={index}
                  lang={lang}
                  t={t}
                  onInvoke={onInvoke}
                  onStartFeedback={onStartFeedback}
                />
              ))}
            </ul>
          )}

          {/* Anticipation without implying a count. */}
          <p className="compendium-more" data-testid="compendium-more">
            {t('skill.more')}
          </p>
        </div>
      </div>
    </div>
  );
}

function SkillCard({
  skill,
  index,
  lang,
  t,
  onInvoke,
  onStartFeedback,
}: {
  skill: Skill;
  index: number;
  lang: Lang;
  t: ReturnType<typeof translator>;
  onInvoke: (skillId: string) => void;
  onStartFeedback: (skillId: string) => void;
}) {
  const discovered = new Date(skill.discoveredAt).toLocaleDateString(
    lang === 'ko' ? 'ko-KR' : 'en-US',
  );

  return (
    <li
      className="skill-card"
      data-tier={skill.tier}
      data-testid="skill-card"
      style={{ '--i': index } as CSSProperties}
    >
      <div className="skill-card-head">
        <span className="skill-tier-mark" aria-hidden="true" />
        {/* Skill names stay in the language they were generated in (US-4.2). */}
        <span className="skill-name">{skill.name}</span>
      </div>

      {/* FE-R-13. Agent-authored summary, never raw provenance (FR-5.11). */}
      <p className="skill-reason" data-testid="skill-reason">
        {skill.reason}
      </p>

      <div className="skill-card-meta">
        <span className="tnum">{discovered}</span>
        {skill.revisedAt ? (
          <span className="revised" data-testid="skill-revised">
            {t('skill.revised')}
          </span>
        ) : null}
      </div>

      <div className="skill-card-actions">
        {/* FE-R-31: by id, never by name. Naming a skill by speech is the fragile
            path on stage. */}
        <button
          type="button"
          className="primary-button"
          onClick={() => onInvoke(skill.id)}
          data-testid="skill-invoke-button"
        >
          {t('skill.invoke')}
        </button>

        {/* Q6 D: closes the sheet, focuses the input, binds this skill. The judge
            taps once and says one sentence. */}
        <button
          type="button"
          className="secondary-button"
          onClick={() => onStartFeedback(skill.id)}
          data-testid="skill-talk-button"
        >
          {t('skill.talk')}
        </button>
      </div>
    </li>
  );
}
