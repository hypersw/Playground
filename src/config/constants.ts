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

  /** Sprite origin — shifted down from center so rotation/scale centers on
   *  the visual center of mass (the side-facing beaver sits lower in frame) */
  ORIGIN_X: 0.5,
  ORIGIN_Y: 0.58,

  /** Physics body size. Must fit within a single tile (16px) for maze navigation */
  BODY: {
    WIDTH: 10,
    HEIGHT: 10,
    /** Offset from sprite origin (32×32 sprite, origin at 0.5/0.58) */
    OFFSET_X: 11,
    OFFSET_Y: 13,
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
  /** Speed multiplier relative to player */
  SPEED_MULTIPLIER: 0.5,

  /** Starting X position (pixels) — fallback only */
  START_X: 400,

  /** Starting Y position (pixels) — fallback only */
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
// LIVES
// =============================================================================

// =============================================================================
// EXIT PORTAL (visual constants — positions are per-level in levels/)
// =============================================================================

export const EXIT = {
  /** Tile index used to mark the exit on the Ground layer */
  TILE_INDEX: 3,
} as const;

// =============================================================================
// TOUCH / POINTER INPUT
// =============================================================================

export const TOUCH = {
  /** Pixels of movement before a press is treated as a drag (not a tap) */
  DRAG_THRESHOLD: 15,

  /** Milliseconds of stationary press before joystick activates */
  HOLD_DELAY: 150,

  /** Desired outer-ring radius in CSS pixels — scaled to canvas space at runtime */
  JOYSTICK_TARGET_CSS_PX: 65,

  /** Inner knob radius as a fraction of the outer ring radius */
  JOYSTICK_KNOB_RATIO: 0.38,

  JOYSTICK_OUTER_ALPHA: 0.35,
  JOYSTICK_INNER_ALPHA: 0.65,
} as const;

// =============================================================================
// LIVES
// =============================================================================

export const LIVES = {
  /** Starting number of lives */
  INITIAL: 5,

  /** Duration of the heart-fly animation (milliseconds) — also the immunity window */
  ANIMATION_DURATION: 1000,

  /** Alpha of the red game-over overlay */
  OVERLAY_ALPHA: 0.55,
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
// SHOP
// =============================================================================

// BUY_RATE and SELL_RATE are derived at runtime — do NOT hardcode them.
// Adjust BASE_RATE or SPREAD and the rates recalculate automatically.
export const SHOP = {
  /** Base exchange rate: EUR per heart */
  BASE_RATE: 50,

  /** Spread fraction (0.2 = 20%) applied symmetrically around the base rate */
  SPREAD: 0.2,

  /** EUR cost to buy one heart — derived: BASE_RATE × (1 + SPREAD) */
  get BUY_RATE() { return Math.round(this.BASE_RATE * (1 + this.SPREAD)); },

  /** EUR gained when selling one heart — derived: BASE_RATE × (1 − SPREAD) */
  get SELL_RATE() { return Math.round(this.BASE_RATE * (1 - this.SPREAD)); },
};

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

    /** Hearts row configuration */
    HEARTS: {
      /** X position of the first heart */
      x: 16,
      /** Y position of the hearts row */
      y: 120,
      /** Gap between hearts (pixels) */
      spacing: 22,
      fontSize: '18px',
    },

    /** Shop button configuration */
    SHOP_BUTTON: {
      x: 16,
      y: 144,
      fontSize: '16px',
      color: '#ffdd88',
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
