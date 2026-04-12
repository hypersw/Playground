/**
 * Shared level defaults.
 *
 * Spread these into a per-level config and override only what differs.
 * Import individual pieces — never import the whole object as "the level".
 */

import { LIVES } from '../constants';

export const SHARED_LOGS = {
  spawnInterval: 3000,
  maxCount: 10,
  pointsPerLog: 3,
  minSpawnDistanceTiles: 5,
} as const;

export const SHARED_ANGLERFISH = {
  deactivateDistancePx: 800,
} as const;

export const SHARED_STARTING_LIVES = LIVES.INITIAL;
