/**
 * PBT-08: shrinking and reproducibility.
 *
 * Shrinking is left at fast-check's default, which is enabled. Overriding it
 * would mean a failure reports the input that happened to break rather than the
 * smallest one that breaks.
 *
 * The seed is logged on every run, and can be pinned with PBT_SEED to replay an
 * exact failing scenario:
 *
 *   PBT_SEED=1234 npm run test --workspace @prompthon/frontend
 */

import fc from 'fast-check';

const envSeed = process.env.PBT_SEED;
const seed = envSeed ? Number(envSeed) : Date.now() % 2_147_483_647;

fc.configureGlobal({ seed, numRuns: 200 });

// eslint-disable-next-line no-console
console.log(`[pbt] seed=${seed}  (replay with PBT_SEED=${seed})`);
