/**
 * Level registry.
 *
 * Import every level definition and expose them as a Map keyed by level ID.
 * To add a new level: create levelN.ts, import it here, add to the map.
 */

import type { LevelDef } from './types';
import level0 from './level0';
import level1 from './level1';

export const LEVELS = new Map<number, LevelDef>([
  [level0.id, level0],
  [level1.id, level1],
]);

/** The level the player starts on when beginning a new game */
export const STARTING_LEVEL = 1;

export type { LevelDef, PortalDef, SeaBounds } from './types';
