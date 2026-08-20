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

import type { Character } from '@prompthon/shared';

export const CHARACTER_DEFAULTS: Character[] = [
  { id: 'pral', productId: 'pral', name: '프라엘', level: 2, exp: 40, expToNext: 100, artRef: 'pral/base' },
  {
    id: 'shoecase',
    productId: 'shoecase',
    name: '슈케이스',
    level: 3,
    exp: 120,
    expToNext: 200,
    artRef: 'shoecase/base',
  },
  {
    id: 'massagechair',
    productId: 'massagechair',
    name: '안마의자',
    level: 1,
    exp: 10,
    expToNext: 60,
    artRef: 'massagechair/base',
  },
];
