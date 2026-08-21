/**
 * The character roster.
 *
 * BE (construction/be, PR #7) has no `/api/characters` route at all - no name, no
 * art reference, no starting level ever arrives from the network. That is
 * presentation, not device data, so it lives here as FE's own static config
 * rather than being fetched. `level`/`exp` are seed values for demo variety;
 * see `applyExpBump` in `pure.ts` and the note on progression in `state.ts` for
 * how they move from here once the app is running.
 */

import type { Character, ProductId } from '@prompthon/shared';

export const CHARACTER_DEFAULTS: Character[] = [
  {
    id: 'massagechair',
    productId: 'massagechair',
    name: '문띵',
    level: 1,
    exp: 10,
    expToNext: 60,
    artRef: 'massagechair/base',
  },
  { id: 'pral', productId: 'pral', name: '프띵', level: 2, exp: 40, expToNext: 100, artRef: 'pral/base' },
  {
    id: 'shoecase',
    productId: 'shoecase',
    name: '슈띵',
    level: 3,
    exp: 120,
    expToNext: 200,
    artRef: 'shoecase/base',
  },
];

/**
 * The character's idle art, product-scoped rather than per-character - it's
 * the same image `CharacterStage` falls back to at rest. Massagechair has no
 * standalone idle file of its own; frame 0 of its `surprise` sequence IS its
 * idle pose (see `CharacterStage`'s note on that).
 */
export function characterIdleArt(productId: ProductId): string {
  if (productId === 'massagechair') return '/characters/massagechair/surprise/frame-0.webp';
  return `/characters/${productId}/idle.webp`;
}
