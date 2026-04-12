/**
 * Per-level configuration types.
 *
 * Each level gets its own file that exports a LevelDef.
 * Shared defaults live in ./shared.ts and can be spread into any level.
 */

/** A portal that transports the player to another level */
export interface PortalDef {
  /** Tile column of the portal */
  col: number;
  /** Tile row of the portal */
  row: number;
  /** Level ID the portal leads to */
  targetLevel: number;
  /** EUR the player must have before the portal opens (0 = always open) */
  moneyRequired: number;
  /** Label shown above the portal (e.g. "Home", "Level 1") */
  label: string;
}

/** Water body region where an anglerfish can spawn */
export interface SeaBounds {
  minCol: number;
  maxCol: number;
}

export interface LevelDef {
  /** Unique level identifier */
  id: number;
  /** Display name shown in UI */
  name: string;
  /** Tilemap asset key (matches the key used in PreloaderScene) */
  mapKey: string;

  /** Player spawn region (tile coords, inclusive) */
  spawnRegion: {
    minCol: number;
    maxCol: number;
    minRow: number;
    maxRow: number;
  };

  /** Anglerfish configuration for this level */
  anglerfish: {
    /** Each entry spawns one anglerfish in that water region */
    seaBounds: SeaBounds[];
    /** Distance (px) beyond which AI deactivates */
    deactivateDistancePx: number;
  };

  /** Exit portals — a level can have multiple */
  portals: PortalDef[];

  /** Collectible log settings */
  logs: {
    spawnInterval: number;
    maxCount: number;
    pointsPerLog: number;
    minSpawnDistanceTiles: number;
  };

  /** Starting lives for this level (null = carry over from previous level) */
  startingLives: number | null;

  /** Mouse (collectible critter) configuration — omit if level has no mice */
  mice?: {
    maxCount: number;
    /** Mice to spawn immediately on level start */
    initialCount: number;
    spawnInterval: number;
    pointsPerMouse: number;
    fleeSpeed: number;
    fleeRadius: number;
  };

  /** Cat (hostile NPC on grass) configuration — omit if level has no cats */
  cats?: {
    count: number;
    speed: number;
    sightRange: number;
  };
}
