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
 * FE-R-13, revised by user directive: the reason used to sit inline and
 * always expanded, on the reasoning that a tap is a place half an audience
 * never reaches. With `kind` badges added, cards read fine collapsed too, so
 * every card now opens collapsed and a tap toggles its reason - a second
 * directive dropped the "newest skill starts expanded" exception, so first
 * viewing and every later viewing behave the same way.
 *
 * FE-R-12: tier is still distinguishable at a glance via the card's own frame
 * (`data-tier` below) - the separate text label ("기본"/"고급") that used to sit
 * next to the name was dropped as redundant with it. `.skill-tier-mark` is
 * part of that same frame, not a reintroduction of the label: a faceted
 * gem, not a word, and `aria-hidden` for the same reason the frame colour
 * itself carries no accessible text.
 *
 * `kind` (buff/action) gets both a badge and the card's own left-accent
 * colour (`data-kind` below) - color-coded even before the badge text is
 * read, same pattern `data-tier` already used for the advanced-tier frame.
 *
 * Cards animate in staggered by list position (`--i`, from `index` below) so
 * opening the dex reads as a collection revealing itself rather than a list
 * appearing at once. The stagger caps at 8 slots so a long list doesn't make
 * the last cards wait on a queue.
 *
 * FE-R-16: a revised skill keeps its id and its position, and carries a mark. It
 * is evidence that feedback changed the skill rather than replacing it.
 */

import { useState, type CSSProperties } from 'react';
import type { Lang, Skill } from '@prompthon/shared';
import type { translator } from '../strings';

interface Props {
  skills: Skill[];
  lang: Lang;
  t: ReturnType<typeof translator>;
  onClose: () => void;
}

export function SkillCompendium({ skills, lang, t, onClose }: Props) {
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
                <SkillCard key={skill.id} skill={skill} index={index} lang={lang} t={t} />
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
}: {
  skill: Skill;
  index: number;
  lang: Lang;
  t: ReturnType<typeof translator>;
}) {
  const [expanded, setExpanded] = useState(false);
  const discovered = new Date(skill.discoveredAt).toLocaleDateString(
    lang === 'ko' ? 'ko-KR' : 'en-US',
  );

  return (
    <li
      className="skill-card"
      data-tier={skill.tier}
      data-kind={skill.kind}
      data-testid="skill-card"
      style={{ '--i': index } as CSSProperties}
    >
      <button
        type="button"
        className="skill-card-head"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        data-testid="skill-card-toggle"
      >
        <span className="skill-tier-mark" aria-hidden="true" />
        {/* Skill names stay in the language they were generated in (US-4.2). */}
        <span className="skill-name">{skill.name}</span>
        <span className={`skill-kind-badge skill-kind-${skill.kind}`} data-testid="skill-kind-badge">
          {skill.kind === 'buff' ? t('skill.kind.buff') : t('skill.kind.action')}
        </span>
        <span className={`skill-card-chevron${expanded ? ' skill-card-chevron-open' : ''}`} aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>

      {/* FE-R-13's "always expanded" narrowed by user directive to "collapsed
          until tapped" - agent-authored summary either way, never raw
          provenance (FR-5.11). */}
      {expanded ? (
        <p className="skill-reason" data-testid="skill-reason">
          {skill.reason}
        </p>
      ) : null}

      <div className="skill-card-meta">
        <span className="tnum">{discovered}</span>
        {skill.revisedAt ? (
          <span className="revised" data-testid="skill-revised">
            {t('skill.revised')}
          </span>
        ) : null}
      </div>
    </li>
  );
}
