/**
 * Level 0 — Home
 *
 * A peaceful hub: small grass island in a large water body.
 * No enemies. Portals lead to playable levels.
 */

import type { LevelDef } from './types';
import { SHARED_LOGS } from './shared';

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
      moneyRequired: 0,      // always open
      label: 'Level 1',
    },
  ],

  logs: { ...SHARED_LOGS },

  startingLives: null,       // carry over from previous level
};

export default level0;
