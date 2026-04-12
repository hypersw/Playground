/**
 * Level 1 — The Starting Forest
 *
 * This is the first level the player enters. Collect €150 worth of logs
 * to open the portal home.
 */

import type { LevelDef } from './types';
import { SHARED_LOGS, SHARED_ANGLERFISH } from './shared';

const level1: LevelDef = {
  id: 1,
  name: 'The Starting Forest',
  mapKey: 'level1-map',

  spawnRegion: {
    minCol: 95,
    maxCol: 98,
    minRow: 1,
    maxRow: 7,
  },

  anglerfish: {
    seaBounds: [
      { minCol: 0, maxCol: 27 },   // left sea
      { minCol: 65, maxCol: 99 },   // right sea
    ],
    ...SHARED_ANGLERFISH,
  },

  portals: [
    {
      col: 3,
      row: 18,
      targetLevel: 0,       // → Home
      moneyRequired: 150,
      label: 'Home',
    },
  ],

  logs: { ...SHARED_LOGS },

  startingLives: null,  // carry over (first play uses LIVES.INITIAL)
};

export default level1;
