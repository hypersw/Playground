/**
 * Game Constants
 *
 * All tunable game values in one place for easy balancing.
 * Modify these to adjust gameplay without changing code logic.
 */

// =============================================================================
// PLAYER
// =============================================================================

export const PLAYER = {
  /** Player movement speed in pixels per second */
  SPEED: 160,

  /** Starting X position (pixels) — used as fallback if no valid spawn tile found */
  START_X: 160,

  /** Starting Y position (pixels) — used as fallback if no valid spawn tile found */
  START_Y: 160,

  /** Physics body size. Must fit within a single tile (16px) for maze navigation */
  BODY: {
    WIDTH: 10,
    HEIGHT: 10,
    /** Offset from sprite origin (32×32 sprite, centered horizontally, at feet) */
    OFFSET_X: 11,
    OFFSET_Y: 16,
  },

  /**
   * Spawn region: top-right island of the original map.
   * In the 60×20 map, the original section occupies cols 40–59.
   * The top-right island is the grass cluster separated by wall cols 53–54.
   * Tile coords (inclusive).
   */
  SPAWN_REGION: {
    MIN_COL: 55,
    MAX_COL: 58,
    MIN_ROW: 1,
    MAX_ROW: 7,
  },
} as const;

// =============================================================================
// ENVIRONMENT
// =============================================================================

export const WATER = {
  /** Tile index for water tiles in the tilemap */
  TILE_INDEX: 4,

  /** Ripple configuration */
  RIPPLES: {
    /** Minimum time between ripples (milliseconds) */
    SPAWN_DELAY: 100,

    /** Ripple line thickness (pixels) */
    LINE_WIDTH: 0.4,

    /** Ripple color (hex) */
    COLOR: 0xffffff,

    /** Ripple starting opacity (0-1) */
    OPACITY: 0.8,

    /** Ripple animation duration (milliseconds) */
    DURATION: 900,

    /** Ripple expansion scale multiplier */
    SCALE: 4,

    /** Vertical offset from player center (pixels) - positions at feet */
    Y_OFFSET: 8,

    /** Depth layer for rendering */
    DEPTH: 5,
  },
} as const;

// =============================================================================
// ANGLERFISH (HOSTILE NPC)
// =============================================================================

export const ANGLERFISH = {
  /** Speed multiplier relative to player (0.75 = 75% of player speed) */
  SPEED_MULTIPLIER: 0.5,

  /** Starting X position (pixels) */
  START_X: 400,

  /** Starting Y position (pixels) */
  START_Y: 300,

  /** Depth layer for rendering (below player so it goes under when hit) */
  DEPTH: 8,

  /** Hit cooldown - time beaver's ripples stay red (milliseconds) */
  HIT_DURATION: 3000,

  /** Ripple configuration */
  RIPPLES: {
    /** Color of anglerfish ripples (red) */
    COLOR: 0xff0000,

    /** Minimum time between ripples (milliseconds) */
    SPAWN_DELAY: 150,
  },
} as const;

// =============================================================================
// COLLECTIBLES
// =============================================================================

export const LOGS = {
  /** How often to spawn a new log (milliseconds) */
  SPAWN_INTERVAL: 3000,

  /** Maximum number of logs that can exist at once */
  MAX_COUNT: 10,

  /** Points awarded per log collected */
  POINTS_PER_LOG: 3,

  /** Minimum distance from player to spawn logs (in tiles) */
  MIN_SPAWN_DISTANCE_TILES: 5,

  /** Animation */
  SWAY: {
    /** How far logs sway side-to-side (pixels) */
    DISTANCE: 2,

    /** Duration of one sway cycle (milliseconds) */
    DURATION: 2000,
  },

  /** Ripples created when log spawns */
  SPAWN_RIPPLES: {
    /** Number of ripples to create */
    COUNT: 3,

    /** Delay between each ripple (milliseconds) */
    DELAY: 150,
  },

  /** Depth layer for rendering (below player so collected logs go under) */
  DEPTH: 8,
} as const;

// =============================================================================
// UI
// =============================================================================

export const UI = {
  /** UI text styling */
  TEXT: {
    /** Title text configuration */
    TITLE: {
      x: 16,
      y: 16,
      fontSize: '20px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    },

    /** Controls hint configuration */
    CONTROLS: {
      x: 16,
      y: 48,
      fontSize: '14px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    },

    /** Attribution text configuration */
    ATTRIBUTION: {
      x: 16,
      y: 72,
      fontSize: '10px',
      color: '#cccccc',
      stroke: '#000000',
      strokeThickness: 2,
    },

    /** Score counter configuration */
    SCORE: {
      x: 16,
      y: 96,
      fontSize: '16px',
      color: '#ffd700', // Gold color for score
      stroke: '#000000',
      strokeThickness: 3,
    },
  },

  /** UI depth (should be above everything) */
  DEPTH: 100,
} as const;

// =============================================================================
// CAMERA
// =============================================================================

export const CAMERA = {
  /** Zoom level (higher = closer). 5.0 paired with 1600×1200 canvas = same visual scale as 2.5 + 800×600, but 2× sharper */
  ZOOM: 5.0,

  /** Camera follow smoothness (0-1, lower = smoother) */
  LERP: 0.1,
} as const;

// =============================================================================
// DEPTH LAYERS
// =============================================================================

/**
 * Depth layering for proper sprite rendering order.
 * Higher numbers render on top.
 */
export const DEPTHS = {
  /** Ground tiles and base layers */
  GROUND: 0,

  /** Environmental effects (ripples, particles) */
  EFFECTS: 5,

  /** Player character */
  PLAYER: 10,

  /** Collectible items */
  COLLECTIBLES: 20,

  /** UI elements */
  UI: 100,
} as const;

// =============================================================================
// GAME CONFIG
// =============================================================================

export const GAME = {
  /** Game canvas dimensions */
  WIDTH: 800,
  HEIGHT: 600,

  /** Target frames per second */
  TARGET_FPS: 60,
} as const;
