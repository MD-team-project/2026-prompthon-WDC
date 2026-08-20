/**
 * Device state, rendered as one grouped panel.
 *
 * This was the lower half of the old combined stat header. Progression moved to
 * the halo arc (and the HUD's level+exp pill), and splitting the two apart makes
 * FE-R-2 stronger rather than weaker: this component takes `deviceStats` and has
 * no prop that could carry a level or an exp value, and `CharacterStage` takes
 * progression and has no prop that could carry a device attribute. There is
 * still no shape anywhere that holds both, and now neither half can even reach
 * the other's data.
 *
 * All of a character's attributes render inside one bordered panel with one
 * visible title, rather than as chips loose on the screen, so "device state" reads
 * as a single instrument rather than a scatter of unrelated numbers.
 *
 * FE-R-7: nothing here is interactive. No slider, no toggle, no stepper. A
 * control panel is the thing this product exists to remove, and a row of chips
 * that reads like an instrument panel is the closest a display should get.
 *
 * Generic renderer, Q3 A. FR-1.5 makes device state per-product and BE owns the
 * attribute vocabulary, so this iterates whatever arrived, in the order it
 * arrived - order is display order and BE decides it. An unknown key is
 * humanised rather than hidden, because hiding it makes a BE-side addition
 * invisible instead of merely unpolished. That is also why the strip scrolls
 * horizontally instead of using fixed slots: the massage chair returns four
 * attributes and the shoe case three, and neither count is special.
 */

import type { DeviceStats, Lang } from '@prompthon/shared';
import { attributeLabel, attributeValue, type translator } from '../strings';

interface Props {
  deviceStats: DeviceStats | null;
  pending: boolean;
  lang: Lang;
  t: ReturnType<typeof translator>;
}

export function DeviceStatStrip({ deviceStats, pending, lang, t }: Props) {
  return (
    <section
      className="stat-panel"
      data-pending={pending}
      aria-label={t('stat.device')}
      data-testid="stat-device"
    >
      <div className="stat-panel-header">
        <span className="stat-panel-title">{t('stat.device')}</span>

        {/* FE-R-3: the in-flight marker sits on the BLOCK, not on individual
            attributes. A generic renderer cannot know which attribute a request
            will affect, and guessing which one to mark would be prediction
            through the back door. */}
        {pending ? (
          <span className="stat-pending" data-testid="stat-pending-marker">
            <i aria-hidden="true" />
            {t('stat.updating')}
          </span>
        ) : null}
      </div>

      {deviceStats === null ? (
        <span className="stat-empty">{t('stat.none')}</span>
      ) : (
        <dl className="stat-list">
          {deviceStats.attributes.map((attribute) => (
            <div className="stat-chip" key={attribute.key} data-testid="stat-attribute">
              <dt>{attributeLabel(attribute.key, lang)}</dt>
              <dd className="tnum">
                {attributeValue(attribute.value, lang)}
                {attribute.unit ? <span className="stat-unit">{attribute.unit}</span> : null}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
