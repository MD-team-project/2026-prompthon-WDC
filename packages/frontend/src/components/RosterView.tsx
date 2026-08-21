/**
 * The roster. FR-7.2, FR-7.3 - three characters, no login step.
 *
 * Reworked as a character-select screen rather than a list of rows: each card
 * carries the character's own tint, its art and its progression, so the choice
 * is between three characters rather than between three labels. Switching
 * afterwards no longer needs this screen at all - the stage has its own switcher
 * - so this is the entry point and not a hub the demo keeps returning to.
 *
 * Holds the language toggle. One toggle in one place: if rehearsal shows it is
 * needed mid-demo without going back, moving it is a one-line change.
 */

import type { Character, Lang } from '@prompthon/shared';
import { characterIdleArt } from '../characters';
import { productLabel, type translator } from '../strings';
import { progressRatio } from '../pure';

interface Props {
  characters: Character[];
  unseen: Record<string, number>;
  loadError: boolean;
  lang: Lang;
  t: ReturnType<typeof translator>;
  onSelect: (characterId: string) => void;
  onToggleLang: () => void;
}

export function RosterView({ characters, unseen, loadError, lang, t, onSelect, onToggleLang }: Props) {
  return (
    <div className="roster">
      <header className="roster-header">
        <div>
          <h1 className="roster-title">{t('app.title')}</h1>
          <p className="roster-subtitle">{t('roster.subtitle')}</p>
        </div>
        <button
          type="button"
          className="lang-toggle"
          onClick={onToggleLang}
          data-testid="roster-lang-toggle"
        >
          {t('lang.toggle')}
        </button>
      </header>

      {loadError ? (
        <p className="roster-error" role="status" data-testid="roster-load-error">
          {t('error.load')}
        </p>
      ) : null}

      <ul className="roster-list">
        {characters.map((character) => (
          <CharacterTile
            key={character.id}
            character={character}
            unseenCount={unseen[character.id] ?? 0}
            lang={lang}
            t={t}
            onSelect={() => onSelect(character.id)}
          />
        ))}
      </ul>
    </div>
  );
}

function CharacterTile({
  character,
  unseenCount,
  lang,
  t,
  onSelect,
}: {
  character: Character;
  unseenCount: number;
  lang: Lang;
  t: ReturnType<typeof translator>;
  onSelect: () => void;
}) {
  // Does not derive level from exp. BE owns the curve.
  const ratio = progressRatio(character.exp, character.expToNext);

  return (
    <li>
      <button
        type="button"
        className="tile"
        data-product={character.productId}
        onClick={onSelect}
        data-testid="roster-character-tile"
        aria-label={`${character.name}, ${productLabel(character.productId, lang)}, ${t('stat.level')} ${character.level}${
          unseenCount > 0 ? `, ${t('roster.discovered')}` : ''
        }`}
      >
        <span className="tile-aura" aria-hidden="true" />

        <span className="tile-art" aria-hidden="true">
          <img className="tile-art-image" src={characterIdleArt(character.productId)} alt="" />
        </span>

        <span className="tile-body">
          <span className="tile-heading">
            <span className="tile-name">{character.name}</span>
            <span className="tile-product">{productLabel(character.productId, lang)}</span>
          </span>
          <span className="tile-meta">
            <span className="tile-level tnum">
              {t('stat.level')} {character.level}
            </span>
            <span className="tile-exp tnum">
              {character.exp}
              {character.expToNext > 0 ? ` / ${character.expToNext}` : ''}
            </span>
          </span>
          <span className="bar bar-sm" aria-hidden="true">
            <span className="bar-fill" style={{ width: `${ratio * 100}%` }} />
          </span>
        </span>

        {/* FE-R-28: a badge, and nothing that takes the screen. */}
        {unseenCount > 0 ? (
          <span className="badge tnum" data-testid="roster-tile-badge">
            {unseenCount}
          </span>
        ) : null}
      </button>
    </li>
  );
}
