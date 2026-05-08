/**
 * Level 3 — The Forest
 *
 * Dense 100×100 forest with trees and clearings. No enemies yet —
 * gameplay to be added later.
 */

import type { LevelDef } from './types';

const level3: LevelDef = {
  id: 3,
  name: 'The Forest',
  mapKey: 'level3-map',

  spawnRegion: {
    minCol: 1,
    maxCol: 6,
    minRow: 1,
    maxRow: 6,
  },

  anglerfish: {
    seaBounds: [],
    deactivateDistancePx: 0,
  },

  portals: [
    {
      col: 2,
      row: 2,
      targetLevel: 0,       // → Home
      moneyRequired: 0,     // always open
      label: 'Home',
    },
  ],

  logs: {
    spawnInterval: 0,
    maxCount: 0,
    pointsPerLog: 0,
    minSpawnDistanceTiles: 0,
  },

  startingLives: null,
};

export default level3;
