/**
 * Level 2 — Cat and Beaver
 *
 * Open grassy meadow with scattered obstacles and small ponds.
 * Catch mice for money, avoid cats. Fish patrol the ponds.
 */

import type { LevelDef } from './types';
import { SHARED_ANGLERFISH } from './shared';

const level2: LevelDef = {
  id: 2,
  name: 'Cat and Beaver',
  mapKey: 'level2-map',

  spawnRegion: {
    minCol: 1,
    maxCol: 5,
    minRow: 1,
    maxRow: 5,
  },

  anglerfish: {
    seaBounds: [
      { minCol: 14, maxCol: 20 },   // pond 1
      { minCol: 49, maxCol: 55 },   // pond 2
      { minCol: 74, maxCol: 80 },   // pond 3
    ],
    ...SHARED_ANGLERFISH,
  },

  portals: [
    {
      col: 1,
      row: 1,
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

  // Level 2 specific: mice and cats
  mice: {
    maxCount: 25,
    initialCount: 15,
    spawnInterval: 2000,
    pointsPerMouse: 0,   // unused — grades define value now
    fleeSpeed: 0,        // unused — grades define speed now
    fleeRadius: 100,
  },

  cats: {
    count: 4,
    speed: 130,
    sightRange: 120,
  },
};

export default level2;
