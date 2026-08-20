/**
 * Today's readings from the phone-side integrations - weather, the health app's
 * step count and distance, screen time.
 *
 * A SECOND panel rather than four more chips inside `DeviceStatStrip`, and that
 * separation is the point rather than a layout preference. The device panel's
 * whole claim is that every value in it came back from the appliance
 * (FE-R-1/FR-5.5); dropping weather into it would put a reading from a phone
 * inside the one region whose credibility rests on where its numbers came from.
 * Two panels, two sources, and nothing in this file can reach `deviceStats`.
 *
 * FE-R-7 applies here too: nothing is interactive. These are readings, and
 * there is nothing for the user to set - which is also why there is no refresh
 * button. `App.tsx` refetches when a character is opened.
 *
 * Not per-character: one user, one reading, so the same panel shows the same
 * figures behind whichever character is on screen. It takes no `characterId`
 * and there is nothing to key it by.
 *
 * Unlike the device panel this one is typed rather than generic - see
 * `DailyContextStats` for why a generic renderer would buy nothing here.
 */

import type { DailyContextStats } from '@prompthon/shared';
import type { Lang } from '@prompthon/shared';
import { contextChips, type translator } from '../strings';

interface Props {
  /** `null` while it is still loading, or after a load failed - `failed` tells them apart. */
  context: DailyContextStats | null;
  failed: boolean;
  lang: Lang;
  t: ReturnType<typeof translator>;
}

export function ContextStatStrip({ context, failed, lang, t }: Props) {
  return (
    <section className="stat-panel stat-panel-context" aria-label={t('stat.context')} data-testid="stat-context">
      <div className="stat-panel-header">
        <span className="stat-panel-title">{t('stat.context')}</span>
      </div>

      {context === null ? (
        // FE-R-19: a failure says so. Silently rendering the loading text
        // forever would make an unreachable integration look like a slow one.
        <span className="stat-empty">{t(failed ? 'context.unavailable' : 'context.none')}</span>
      ) : (
        <dl className="stat-list">
          {contextChips(context, lang).map((chip) => (
            <div className="stat-chip" key={chip.key} data-testid="context-attribute">
              <dt>
                <span className="stat-glyph" aria-hidden="true">
                  {chip.glyph}
                </span>
                {chip.label}
              </dt>
              <dd className="tnum">
                {chip.value}
                {chip.unit ? <span className="stat-unit">{chip.unit}</span> : null}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
