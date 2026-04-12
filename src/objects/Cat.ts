import Phaser from 'phaser';
import { directionFromVelocity } from '../utils/direction';
import { findPath } from '../utils/pathfinder';

/**
 * Cat — hostile NPC on grass levels.
 *
 * AI priority:
 *   1. Chase nearest mouse within sight range
 *   2. If no mouse nearby, chase the player if within sight range
 *   3. Otherwise idle
 *
 * Navigates on grass only (collides with walls and water).
 * Hurts the player on contact. Hitbox is smaller than beaver — cats are liquid.
 *
 * Sprite frames are 34×52 (padded so the body torso center is at frame center).
 */
// Debug log ring buffer — readable from browser console via window.__catLog
const CAT_LOG: string[] = [];
const CAT_LOG_MAX = 200;
function catLog(msg: string): void {
  if (CAT_LOG.length >= CAT_LOG_MAX) CAT_LOG.shift();
  CAT_LOG.push(`${Date.now() % 100000}: ${msg}`);
  (window as unknown as Record<string, unknown>).__catLog = CAT_LOG;
}

export class Cat extends Phaser.Physics.Arcade.Sprite {
  private static readonly BODY_SIZE = 6;
  public catId: number = 0;  // set by WorldScene after creation
  private target: Phaser.GameObjects.Sprite | null = null;
  private player!: Phaser.GameObjects.Sprite;
  private chaseSpeed: number;
  private sightRange: number;
  private catchRadius: number;
  private lastDirection: string = 'down';

  /** Reference to the scene's mouse group for target selection */
  private getMice: () => Phaser.GameObjects.Sprite[];
  /** Called when cat catches a mouse */
  private onCatchMouse: ((mouse: Phaser.GameObjects.Sprite) => void) | null = null;

  /** Stuck detection: if chasing the same target and barely moving, give up */
  private stuckTarget: Phaser.GameObjects.Sprite | null = null;
  private stuckSince: number = 0;
  /** Blacklisted mice the cat gave up on — maps sprite to expiry timestamp */
  private blacklist = new Map<Phaser.GameObjects.Sprite, number>();
  private static readonly BLACKLIST_DURATION = 5000;

  /** Idle wander state */
  private wanderVx: number = 0;
  private wanderVy: number = 0;
  private wanderUntil: number = 0;
  private wanderMoving: boolean = false;
  private wanderSpeed: number = 0;

  /** Other cats in the scene, for anti-herd steering */
  private getOtherCats: () => Cat[] = () => [];

  /** A* pathfinding state */
  private walkableGrid: boolean[][] | null = null;
  private tilemap: Phaser.Tilemaps.Tilemap | null = null;
  private path: Array<{ x: number; y: number }> = [];
  private lastPathTime: number = 0;
  private static readonly PATH_RECOMPUTE_MS = 600;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    player: Phaser.GameObjects.Sprite,
    getMice: () => Phaser.GameObjects.Sprite[],
    onCatchMouse: (mouse: Phaser.GameObjects.Sprite) => void,
    walkableGrid: boolean[][],
    tilemap: Phaser.Tilemaps.Tilemap,
    speed: number = 100,
    sightRange: number = 120,
  ) {
    super(scene, x, y, 'cat', 1);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.player = player;
    this.getMice = getMice;
    this.onCatchMouse = onCatchMouse;
    this.walkableGrid = walkableGrid;
    this.tilemap = tilemap;
    this.chaseSpeed = speed;
    this.wanderSpeed = speed * 0.3;
    this.sightRange = sightRange;
    this.catchRadius = 20;

    // Start idle with a pause
    this.pickWanderPause();

    this.setDepth(9);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    // Body centered on the frame center (body center is pre-aligned in the sprite)
    const half = Cat.BODY_SIZE / 2;
    body.setSize(Cat.BODY_SIZE, Cat.BODY_SIZE);
    body.setOffset(this.width * 0.5 - half, this.height * 0.5 - half);

    this.createAnimations();
  }

  private createAnimations(): void {
    if (!this.scene.anims.exists('cat-idle-down')) {
      const s = this.scene;
      // Cat sprite row order: N(0), E(1), S(2), W(3) — confirmed by user
      s.anims.create({ key: 'cat-idle-up',    frames: [{ key: 'cat', frame: 1 }],  frameRate: 1 });
      s.anims.create({ key: 'cat-idle-right', frames: [{ key: 'cat', frame: 4 }],  frameRate: 1 });
      s.anims.create({ key: 'cat-idle-down',  frames: [{ key: 'cat', frame: 7 }],  frameRate: 1 });
      s.anims.create({ key: 'cat-idle-left',  frames: [{ key: 'cat', frame: 10 }], frameRate: 1 });

      s.anims.create({ key: 'cat-walk-up',    frames: s.anims.generateFrameNumbers('cat', { start: 0, end: 2 }),  frameRate: 6, repeat: -1 });
      s.anims.create({ key: 'cat-walk-right', frames: s.anims.generateFrameNumbers('cat', { start: 3, end: 5 }),  frameRate: 6, repeat: -1 });
      s.anims.create({ key: 'cat-walk-down',  frames: s.anims.generateFrameNumbers('cat', { start: 6, end: 8 }),  frameRate: 6, repeat: -1 });
      s.anims.create({ key: 'cat-walk-left',  frames: s.anims.generateFrameNumbers('cat', { start: 9, end: 11 }), frameRate: 6, repeat: -1 });
    }
  }

  update(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const now = this.scene.time.now;

    // Expire old blacklist entries
    for (const [sprite, expiry] of this.blacklist) {
      if (now > expiry || !sprite.active) this.blacklist.delete(sprite);
    }

    // Collect targets other cats are chasing (for anti-herd)
    const otherCatTargets = new Set<Phaser.GameObjects.Sprite>();
    for (const other of this.getOtherCats()) {
      if (other !== this && other.target && other.active) {
        otherCatTargets.add(other.target);
      }
    }

    // Priority: if player is close (within aggro range), chase them
    const playerDist = Phaser.Math.Distance.Between(this.x, this.y, this.player.x, this.player.y);
    const aggroRange = this.sightRange * 0.6;

    this.target = null;

    if (playerDist < aggroRange) {
      this.target = this.player;
    } else {
      // Otherwise pick nearest non-blacklisted mouse in range
      // Penalize mice that another cat is already chasing (anti-herd)
      const mice = this.getMice();
      let bestScore = Infinity;

      for (const m of mice) {
        if (!m.active || this.blacklist.has(m)) continue;
        let d = Phaser.Math.Distance.Between(this.x, this.y, m.x, m.y);
        if (d >= this.sightRange) continue;
        if (otherCatTargets.has(m)) d *= 2;
        if (d < bestScore) {
          bestScore = d;
          this.target = m;
        }
      }

      // No mouse in range — chase player if within sight range
      if (!this.target && playerDist < this.sightRange) {
        this.target = this.player;
      }
    }

    if (this.target) {
      const directDist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);

      // Catch mouse if close enough
      const isMouseTarget = this.target !== this.player;
      if (isMouseTarget && directDist <= this.catchRadius && this.target.active) {
        catLog(`cat${this.catId} CATCH dist=${directDist.toFixed(1)} active=${this.target.active}`);
        this.onCatchMouse?.(this.target);
        this.blacklist.delete(this.target);
        this.stuckTarget = null;
        this.target = null;
        this.path = [];
        body.setVelocity(0, 0);
      } else {
        // Recompute A* path periodically
        if (now - this.lastPathTime > Cat.PATH_RECOMPUTE_MS) {
          this.recomputePath();
          this.lastPathTime = now;
        }
        this.followPath(body);

        // Log state periodically when chasing a mouse
        if (isMouseTarget && now % 1000 < 20) {
          const speed = body.velocity.length();
          const tBody = (this.target as Phaser.Physics.Arcade.Sprite).body as Phaser.Physics.Arcade.Body;
          catLog(`cat${this.catId} chase dist=${directDist.toFixed(1)} speed=${speed.toFixed(1)} ` +
            `pos=(${this.x.toFixed(1)},${this.y.toFixed(1)}) tgt=(${this.target.x.toFixed(1)},${this.target.y.toFixed(1)}) ` +
            `tgtBody=(${tBody?.enable},${tBody?.x.toFixed(1)},${tBody?.y.toFixed(1)}) ` +
            `path=${this.path.length} bl=${this.blacklist.size} stuckFor=${this.stuckTarget === this.target ? now - this.stuckSince : 0}`);
        }

        // Stuck detection: if barely moving while chasing a mouse, blacklist
        if (isMouseTarget) {
          const speed = body.velocity.length();
          if (speed < this.chaseSpeed * 0.2) {
            if (this.stuckTarget !== this.target) {
              this.stuckTarget = this.target;
              this.stuckSince = now;
              catLog(`cat${this.catId} STUCK_START speed=${speed.toFixed(1)}`);
            } else if (now - this.stuckSince > 2000) {
              catLog(`cat${this.catId} BLACKLIST after ${now - this.stuckSince}ms`);
              this.blacklist.set(this.target, now + Cat.BLACKLIST_DURATION);
              this.stuckTarget = null;
              this.target = null;
              this.path = [];
              body.setVelocity(0, 0);
            }
          } else {
            if (this.stuckTarget === this.target) {
              catLog(`cat${this.catId} UNSTUCK speed=${speed.toFixed(1)}`);
            }
            this.stuckSince = now;
          }
        }
      }
    } else {
      // Idle: wander lazily
      this.stuckTarget = null;
      this.path = [];
      this.idleWander(body, now);
    }

    // Animation
    const dir = directionFromVelocity(body.velocity.x, body.velocity.y);
    if (dir) {
      this.lastDirection = dir;
      this.anims.play(`cat-walk-${dir}`, true);
    } else {
      this.anims.play(`cat-idle-${this.lastDirection}`, true);
    }
  }

  /** Set after all cats are created so each cat knows about the others */
  setOtherCats(fn: () => Cat[]): void {
    this.getOtherCats = fn;
  }

  // ---------------------------------------------------------------------------
  // Idle wander (cat-style: walk a bit, sit for a while)
  // ---------------------------------------------------------------------------

  private idleWander(body: Phaser.Physics.Arcade.Body, now: number): void {
    if (now >= this.wanderUntil) {
      if (this.wanderMoving) {
        this.pickWanderPause();
      } else {
        this.pickWanderLeg();
      }
    }

    if (this.wanderMoving) {
      body.setVelocity(this.wanderVx, this.wanderVy);
    } else {
      body.setVelocity(0, 0);
    }
  }

  private pickWanderLeg(): void {
    const angle = Math.random() * Math.PI * 2;
    this.wanderVx = Math.cos(angle) * this.wanderSpeed;
    this.wanderVy = Math.sin(angle) * this.wanderSpeed;
    this.wanderMoving = true;
    // Walk for 1–3 seconds
    this.wanderUntil = this.scene.time.now + 1000 + Math.random() * 2000;
  }

  private pickWanderPause(): void {
    this.wanderVx = 0;
    this.wanderVy = 0;
    this.wanderMoving = false;
    // Sit for 2–5 seconds (cats are lazy)
    this.wanderUntil = this.scene.time.now + 2000 + Math.random() * 3000;
  }

  // ---------------------------------------------------------------------------
  // A* pathfinding
  // ---------------------------------------------------------------------------

  private recomputePath(): void {
    if (!this.target || !this.walkableGrid || !this.tilemap) {
      this.path = [];
      return;
    }

    const map = this.tilemap;
    const catTileX = map.worldToTileX(this.x);
    const catTileY = map.worldToTileY(this.y);
    let destTileX = map.worldToTileX(this.target.x);
    let destTileY = map.worldToTileY(this.target.y);

    if (catTileX === null || catTileY === null || destTileX === null || destTileY === null) {
      this.path = [];
      return;
    }

    // If target is on a non-walkable tile, find nearest walkable
    if (!this.walkableGrid[destTileY]?.[destTileX]) {
      const nearest = this.nearestWalkableTile(destTileX, destTileY);
      if (!nearest) { this.path = []; return; }
      destTileX = nearest.x;
      destTileY = nearest.y;
    }

    this.path = findPath(this.walkableGrid, catTileX, catTileY, destTileX, destTileY);
  }

  private followPath(body: Phaser.Physics.Arcade.Body): void {
    if (this.path.length === 0 || !this.tilemap) {
      // No path — chase directly as fallback
      if (this.target) {
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > 4) {
          body.setVelocity((dx / d) * this.chaseSpeed, (dy / d) * this.chaseSpeed);
        } else {
          body.setVelocity(0, 0);
        }
      }
      return;
    }

    const tileSize = this.tilemap.tileWidth;
    const arrivalRadius = tileSize * 0.75;

    // Advance past reached waypoints
    while (
      this.path.length > 0 &&
      Phaser.Math.Distance.Between(
        this.x, this.y,
        this.path[0].x * tileSize + tileSize / 2,
        this.path[0].y * tileSize + tileSize / 2
      ) < arrivalRadius
    ) {
      this.path.shift();
    }

    if (this.path.length === 0) {
      body.setVelocity(0, 0);
      return;
    }

    // Lookahead steering toward next 1-2 waypoints
    let steerX = 0, steerY = 0, totalW = 0;
    const look = Math.min(2, this.path.length);
    for (let i = 0; i < look; i++) {
      const w = look - i;
      steerX += (this.path[i].x * tileSize + tileSize / 2 - this.x) * w;
      steerY += (this.path[i].y * tileSize + tileSize / 2 - this.y) * w;
      totalW += w;
    }
    steerX /= totalW;
    steerY /= totalW;

    const d = Math.sqrt(steerX * steerX + steerY * steerY);
    if (d > 0) {
      body.setVelocity((steerX / d) * this.chaseSpeed, (steerY / d) * this.chaseSpeed);
    }
  }

  private nearestWalkableTile(tx: number, ty: number): { x: number; y: number } | null {
    if (!this.walkableGrid) return null;
    const rows = this.walkableGrid.length;
    const cols = rows > 0 ? this.walkableGrid[0].length : 0;
    const visited = new Set<number>();
    const queue: Array<{ x: number; y: number }> = [{ x: tx, y: ty }];
    visited.add(ty * cols + tx);
    const DIRS = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    while (queue.length > 0) {
      const { x, y } = queue.shift()!;
      if (this.walkableGrid[y]?.[x]) return { x, y };
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
        const k = ny * cols + nx;
        if (visited.has(k)) continue;
        visited.add(k);
        queue.push({ x: nx, y: ny });
      }
    }
    return null;
  }
}
