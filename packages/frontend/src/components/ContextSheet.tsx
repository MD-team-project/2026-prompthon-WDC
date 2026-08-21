/**
 * Today's readings, as widget cards in a raised sheet.
 *
 * A SHEET rather than an inline expansion, and that is a layout decision with
 * a reason. `.stage-wrap` is the only `flex: 1` region on the character screen
 * (see `CharacterView`'s layout-budget note), so every pixel a strip below it
 * occupies is taken from the character and the speech bubble. Widget cards need
 * real area to read as widgets, and paying for that area inline is exactly the
 * problem this change exists to fix. A sheet costs zero layout space and
 * borrows the screen only while it is open.
 *
 * Same construction as `ConversationSheet` and `SkillCompendium` - scrim that
 * leaves the character visible, `role="dialog"`, grip, title - so this is a
 * third instance of an existing pattern rather than a new kind of surface.
 *
 * FE-R-7 still holds: nothing in here is interactive. These are readings, and
 * there is nothing for the user to set. The only control is the close button.
 */

import type { DailyContextStats, Lang } from '@prompthon/shared';
import { contextWidgets, type ContextRing, type ContextWidget, type translator } from '../strings';

/**
 * Ring geometry. `r` is inset from the 36-unit box by half the stroke so the
 * stroke's outer edge lands on the box edge instead of being clipped by it.
 *
 * The circumference is derived, not typed in: a hand-computed constant is a
 * second source of truth for `r` that silently draws a short or overlapping
 * sweep the moment `r` changes.
 */
const RING_R = 15.5;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R;

function Ring({ ring, t }: { ring: ContextRing; t: ReturnType<typeof translator> }) {
  return (
    <div className="context-ring-cell" data-testid="context-ring">
      <div className="context-ring-wrap">
        <svg className="context-ring" viewBox="0 0 36 36" aria-hidden="true">
          <circle className="context-ring-track" cx="18" cy="18" r={RING_R} />
          {/*
            Omitted entirely at zero rather than drawn with a zero-length dash:
            `stroke-linecap: round` renders one of those as a dot, which would
            put a mark at 12 o'clock on a day with no steps and read as a
            reading rather than as the absence of one.

            `pathLength` would be the tidier way to express the sweep, but
            dasharray keeps the value in the same unit as the circumference
            above and needs no second normalisation step.
          */}
          {ring.ratio > 0 ? (
            <circle
              className="context-ring-fill"
              cx="18"
              cy="18"
              r={RING_R}
              strokeDasharray={`${ring.ratio * RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
            />
          ) : null}
        </svg>
        <span className="context-ring-value tnum">{ring.value}</span>
      </div>

      <span className="context-ring-label">{ring.label}</span>
      {/*
        The goal is stated because a ring without one is a fraction with a
        hidden denominator - "half full" means nothing until it is half of
        10,000. `.tnum` on the figure only; the label around it is body text.
      */}
      <span className="context-ring-goal">
        {t('context.goal')} <span className="tnum">{ring.goal}</span>
        {ring.unit}
      </span>
    </div>
  );
}

function Widget({ widget, t }: { widget: ContextWidget; t: ReturnType<typeof translator> }) {
  return (
    <section
      className={`context-widget context-widget-${widget.key}`}
      aria-label={widget.label}
      data-testid={`context-widget-${widget.key}`}
    >
      <span className="context-widget-label">{widget.label}</span>

      {widget.kind === 'weather' ? (
        <div className="context-weather">
          {/* Degrees lead, because that is what makes a weather card read as
              one - `weather: "rain"` on its own is a category, not a reading. */}
          <span className="context-temp tnum">
            {widget.degrees}
            <span className="context-temp-mark" aria-hidden="true">
              °
            </span>
          </span>
          <span className="context-weather-condition">
            <span className="context-weather-glyph" aria-hidden="true">
              {widget.glyph}
            </span>
            {widget.condition}
          </span>
        </div>
      ) : null}

      {widget.kind === 'rings' ? (
        <div className="context-rings">
          {widget.rings.map((ring) => (
            <Ring key={ring.key} ring={ring} t={t} />
          ))}
        </div>
      ) : null}

      {/* No ring: more screen time is not progress toward anything, and a
          gauge that fills as the number gets worse would read as an
          achievement. The figure carries it alone. */}
      {widget.kind === 'duration' ? (
        <span className="context-duration tnum">{widget.value}</span>
      ) : null}
    </section>
  );
}

export function ContextSheet({
  context,
  lang,
  t,
  onClose,
}: {
  context: DailyContextStats;
  lang: Lang;
  t: ReturnType<typeof translator>;
  onClose: () => void;
}) {
  return (
    <div className="sheet-layer" data-testid="context-sheet">
      <button type="button" className="sheet-scrim" aria-label={t('skill.close')} onClick={onClose} />

      <div className="sheet" role="dialog" aria-modal="true" aria-label={t('stat.context')}>
        <div className="sheet-header">
          <span className="sheet-grip" aria-hidden="true" />
          <h2 className="sheet-title">{t('stat.context')}</h2>
          <button
            type="button"
            className="text-button"
            onClick={onClose}
            data-testid="context-sheet-close"
          >
            {t('skill.close')}
          </button>
        </div>

        <div className="sheet-body">
          <div className="context-widgets">
            {contextWidgets(context, lang).map((widget) => (
              <Widget key={widget.key} widget={widget} t={t} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
