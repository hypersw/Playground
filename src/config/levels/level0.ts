/**
 * Level 0 — Home
 *
 * A peaceful hub: small grass island in a large water body.
 * No enemies. Portals lead to playable levels.
 */

import type { LevelDef } from './types';


const level0: LevelDef = {
  id: 0,
  name: 'Home',
  mapKey: 'home-map',

  spawnRegion: {
    minCol: 8,
    maxCol: 12,
    minRow: 8,
    maxRow: 11,
  },

  anglerfish: {
    seaBounds: [],          // no enemies on the home level
    deactivateDistancePx: 0,
  },

  portals: [
    {
      col: 11,
      row: 12,
      targetLevel: 1,        // → The Starting Forest
      moneyRequired: 0,
      label: 'Level 1',
    },
    {
      col: 8,
      row: 12,
      targetLevel: 2,        // → Cat and Beaver
      moneyRequired: 0,
      label: 'Level 2',
    },
  ],

  logs: {
    spawnInterval: 0,
    maxCount: 0,
    pointsPerLog: 0,
    minSpawnDistanceTiles: 0,
  },

  startingLives: null,       // carry over from previous level
};

export default level0;
