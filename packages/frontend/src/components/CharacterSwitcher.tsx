/**
 * Character switching from the stage itself.
 *
 * The roster still exists and is still the entry point (FR-7.2, FR-7.3), but
 * switching used to require leaving the character screen, which made three
 * characters read as three rows in a list rather than three characters sharing a
 * stage. These dots plus a horizontal swipe on the stage keep the character on
 * screen for the whole demo.
 *
 * FE-R-28: an unseen announcement raises a badge here too. It is a badge and
 * nothing that takes the screen - no toast, no forced navigation.
 */

import type { Character } from '@prompthon/shared';
import type { translator } from '../strings';

interface Props {
  characters: Character[];
  activeId: string;
  unseen: Record<string, number>;
  t: ReturnType<typeof translator>;
  onSelect: (characterId: string) => void;
}

/*
 * `group` with `aria-current`, not `tablist`/`tab`. Proper tabs need an
 * `aria-controls` target carrying `role="tabpanel"`, and what these switch is
 * the whole screen rather than a panel. Claiming the tab pattern without its
 * wiring is worse than not claiming it.
 */
export function CharacterSwitcher({ characters, activeId, unseen, t, onSelect }: Props) {
  if (characters.length < 2) return null;

  return (
    <div
      className="switcher"
      role="group"
      aria-label={t('stage.switch')}
      data-testid="character-switcher"
    >
      {characters.map((character) => {
        const active = character.id === activeId;
        const unseenCount = unseen[character.id] ?? 0;

        return (
          <button
            key={character.id}
            type="button"
            className="switcher-dot"
            data-product={character.productId}
            data-active={active}
            aria-current={active}
            aria-label={`${character.name}${unseenCount > 0 ? `, ${t('roster.discovered')}` : ''}`}
            onClick={() => {
              if (!active) onSelect(character.id);
            }}
            data-testid="character-switcher-dot"
          >
            {unseenCount > 0 ? (
              <span className="switcher-mark" data-testid="character-switcher-badge" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
