import Phaser from 'phaser';
import { directionFromVelocity } from '../utils/direction';
import { findPath } from '../utils/pathfinder';

// Debug log ring buffer — readable from browser console via window.__catLog
const CAT_LOG: string[] = [];
const CAT_LOG_MAX = 200;
function catLog(msg: string): void {
  if (CAT_LOG.length >= CAT_LOG_MAX) CAT_LOG.shift();
  CAT_LOG.push(`${Date.now() % 100000}: ${msg}`);
  (window as unknown as Record<string, unknown>).__catLog = CAT_LOG;
}

type CatState = 'idle' | 'chasing' | 'returning' | 'fleeing';

/**
 * Cat — hostile NPC on grass levels.
 *
 * Has a home territory (1/N strip of the map). Behavior by state:
 *   idle     — wander within home territory
 *   chasing  — pursue mouse (slight territory overlap) or player (no limit)
 *   returning — walk back to home center, no chasing
 *   fleeing  — run away after biting player, no chasing for cooldown
 */
export class Cat extends Phaser.Physics.Arcade.Sprite {
  private static readonly BODY_SIZE = 6;
  public catId: number = 0;
  public target: Phaser.GameObjects.Sprite | null = null;
  private player!: Phaser.GameObjects.Sprite;
  private chaseSpeed: number;
  private sightRange: number;
  private catchRadius: number;
  private lastDirection: string = 'down';

  private getMice: () => Phaser.GameObjects.Sprite[];
  private onCatchMouse: ((mouse: Phaser.GameObjects.Sprite) => void) | null = null;

  // State machine
  private aiState: CatState = 'idle';

  // Territory (tile columns, set by WorldScene)
  private homeMinCol: number = 0;
  private homeMaxCol: number = 99;
  private homeCenterX: number = 0;  // world px
  private static readonly TERRITORY_OVERLAP_TILES = 10;

  // Stuck detection
  private stuckTarget: Phaser.GameObjects.Sprite | null = null;
  private stuckSince: number = 0;
  private blacklist = new Map<Phaser.GameObjects.Sprite, number>();
  private static readonly BLACKLIST_DURATION = 5000;

  // Idle wander
  private wanderVx: number = 0;
  private wanderVy: number = 0;
  private wanderUntil: number = 0;
  private wanderMoving: boolean = false;
  private wanderSpeed: number = 0;

  // Other cats reference
  private getOtherCats: () => Cat[] = () => [];

  // Flee after biting player
  private fleeUntil: number = 0;
  private static readonly FLEE_COOLDOWN = 4000;

  // A* pathfinding
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

    this.pickWanderPause();

    this.setDepth(9);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    const half = Cat.BODY_SIZE / 2;
    body.setSize(Cat.BODY_SIZE, Cat.BODY_SIZE);
    body.setOffset(this.width * 0.5 - half, this.height * 0.5 - half);

    this.createAnimations();
  }

  private createAnimations(): void {
    if (!this.scene.anims.exists('cat-idle-down')) {
      const s = this.scene;
      // Cat sprite row order: N(0), E(1), S(2), W(3)
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

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  setTerritory(minCol: number, maxCol: number, tileWidth: number): void {
    this.homeMinCol = minCol;
    this.homeMaxCol = maxCol;
    this.homeCenterX = ((minCol + maxCol) / 2) * tileWidth + tileWidth / 2;
  }

  setOtherCats(fn: () => Cat[]): void {
    this.getOtherCats = fn;
  }

  /** Called by WorldScene when this cat bites the player */
  startFleeing(): void {
    this.aiState = 'fleeing';
    this.fleeUntil = this.scene.time.now + Cat.FLEE_COOLDOWN;
    this.target = null;
    this.path = [];
    this.lastPathTime = 0; // force recompute

    catLog(`cat${this.catId} FLEE start`);
  }

  // ---------------------------------------------------------------------------
  // Main update
  // ---------------------------------------------------------------------------

  update(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const now = this.scene.time.now;

    // Expire old blacklist entries
    for (const [sprite, expiry] of this.blacklist) {
      if (now > expiry || !sprite.active) this.blacklist.delete(sprite);
    }

    switch (this.aiState) {
      case 'fleeing':
        this.updateFleeing(body, now);
        break;
      case 'returning':
        this.updateReturning(body, now);
        break;
      case 'idle':
      case 'chasing':
        this.updateChasing(body, now);
        break;
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

  // ---------------------------------------------------------------------------
  // State: fleeing (after biting player)
  // ---------------------------------------------------------------------------

  private updateFleeing(body: Phaser.Physics.Arcade.Body, now: number): void {
    if (now > this.fleeUntil) {
      this.aiState = this.isInHomeTerritory() ? 'idle' : 'returning';
      this.path = [];
      body.setVelocity(0, 0);
      catLog(`cat${this.catId} FLEE done -> ${this.aiState}`);
      return;
    }

    // Pathfind away from player
    if (now - this.lastPathTime > Cat.PATH_RECOMPUTE_MS) {
      this.computeFleePath();
      this.lastPathTime = now;
    }
    this.followPath(body, this.chaseSpeed);
  }

  private computeFleePath(): void {
    if (!this.walkableGrid || !this.tilemap) return;
    const map = this.tilemap;
    const catTileX = map.worldToTileX(this.x) ?? 0;
    const catTileY = map.worldToTileY(this.y) ?? 0;

    // Pick a flee target: opposite direction from player, ~half viewport away
    const dx = this.x - this.player.x;
    const dy = this.y - this.player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const fleeDist = 8; // tiles (~half viewport at 15 tiles visible)

    let targetTileX: number, targetTileY: number;
    if (dist > 1) {
      targetTileX = Math.round(catTileX + (dx / dist) * fleeDist);
      targetTileY = Math.round(catTileY + (dy / dist) * fleeDist);
    } else {
      // Player is on top of us, flee toward home center
      targetTileX = Math.round(this.homeCenterX / (this.tilemap?.tileWidth ?? 16));
      targetTileY = catTileY;
    }

    // Clamp to map
    const rows = this.walkableGrid.length;
    const cols = rows > 0 ? this.walkableGrid[0].length : 0;
    targetTileX = Math.max(0, Math.min(cols - 1, targetTileX));
    targetTileY = Math.max(0, Math.min(rows - 1, targetTileY));

    // Find nearest walkable to target
    if (!this.walkableGrid[targetTileY]?.[targetTileX]) {
      const nearest = this.nearestWalkableTile(targetTileX, targetTileY);
      if (!nearest) { this.path = []; return; }
      targetTileX = nearest.x;
      targetTileY = nearest.y;
    }

    this.path = findPath(this.walkableGrid, catTileX, catTileY, targetTileX, targetTileY);
  }

  // ---------------------------------------------------------------------------
  // State: returning to home territory
  // ---------------------------------------------------------------------------

  private updateReturning(body: Phaser.Physics.Arcade.Body, now: number): void {
    if (this.isInHomeTerritory()) {
      this.aiState = 'idle';
      this.path = [];
      body.setVelocity(0, 0);
      return;
    }

    // Walk toward home center
    if (now - this.lastPathTime > Cat.PATH_RECOMPUTE_MS) {
      this.computeReturnPath();
      this.lastPathTime = now;
    }
    this.followPath(body, this.chaseSpeed * 0.7);
  }

  private computeReturnPath(): void {
    if (!this.walkableGrid || !this.tilemap) return;
    const map = this.tilemap;
    const catTileX = map.worldToTileX(this.x) ?? 0;
    const catTileY = map.worldToTileY(this.y) ?? 0;

    let targetTileX = Math.round(this.homeCenterX / map.tileWidth);
    const targetTileY = Math.round(map.height / 2);

    const cols = this.walkableGrid[0]?.length ?? 0;
    targetTileX = Math.max(0, Math.min(cols - 1, targetTileX));

    if (!this.walkableGrid[targetTileY]?.[targetTileX]) {
      const nearest = this.nearestWalkableTile(targetTileX, targetTileY);
      if (!nearest) { this.path = []; return; }
      targetTileX = nearest.x;
    }

    this.path = findPath(this.walkableGrid, catTileX, catTileY, targetTileX, targetTileY);
  }

  // ---------------------------------------------------------------------------
  // State: idle / chasing
  // ---------------------------------------------------------------------------

  private updateChasing(body: Phaser.Physics.Arcade.Body, now: number): void {
    // Collect targets other cats are chasing
    const otherCatTargets = new Set<Phaser.GameObjects.Sprite>();
    for (const other of this.getOtherCats()) {
      if (other !== this && other.target && other.active) {
        otherCatTargets.add(other.target);
      }
    }

    // Target selection
    const playerDist = Phaser.Math.Distance.Between(this.x, this.y, this.player.x, this.player.y);
    const aggroRange = this.sightRange * 0.6;

    this.target = null;

    // Player within aggro range — chase regardless of territory
    if (playerDist < aggroRange) {
      this.target = this.player;
    } else {
      // Pick nearest mouse, but enforce territory for mice
      const mice = this.getMice();
      let bestScore = Infinity;

      for (const m of mice) {
        if (!m.active || this.blacklist.has(m)) continue;
        // Territory check: mouse must be within home ± overlap
        const mTileX = (this.tilemap?.worldToTileX(m.x)) ?? 0;
        if (mTileX < this.homeMinCol - Cat.TERRITORY_OVERLAP_TILES ||
            mTileX > this.homeMaxCol + Cat.TERRITORY_OVERLAP_TILES) continue;

        let d = Phaser.Math.Distance.Between(this.x, this.y, m.x, m.y);
        if (d >= this.sightRange) continue;
        if (otherCatTargets.has(m)) d *= 2;
        if (d < bestScore) {
          bestScore = d;
          this.target = m;
        }
      }

      // No mouse — chase player if in sight
      if (!this.target && playerDist < this.sightRange) {
        this.target = this.player;
      }
    }

    if (this.target) {
      this.aiState = 'chasing';
      const directDist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
      const isMouseTarget = this.target !== this.player;

      // Catch mouse
      if (isMouseTarget && directDist <= this.catchRadius && this.target.active) {
        catLog(`cat${this.catId} CATCH dist=${directDist.toFixed(1)}`);
        this.onCatchMouse?.(this.target);
        this.blacklist.delete(this.target);
        this.stuckTarget = null;
        this.target = null;
        this.path = [];
        body.setVelocity(0, 0);
        // After catching, check if we're outside home territory
        if (!this.isInHomeTerritory()) {
          this.aiState = 'returning';
        } else {
          this.aiState = 'idle';
        }
      } else {
        // A* chase
        if (now - this.lastPathTime > Cat.PATH_RECOMPUTE_MS) {
          this.recomputePath();
          this.lastPathTime = now;
        }
        this.followPath(body, this.chaseSpeed);

        // Stuck detection for mice
        if (isMouseTarget) {
          const speed = body.velocity.length();
          if (speed < this.chaseSpeed * 0.2) {
            if (this.stuckTarget !== this.target) {
              this.stuckTarget = this.target;
              this.stuckSince = now;
            } else if (now - this.stuckSince > 2000) {
              catLog(`cat${this.catId} BLACKLIST`);
              this.blacklist.set(this.target, now + Cat.BLACKLIST_DURATION);
              this.stuckTarget = null;
              this.target = null;
              this.path = [];
              body.setVelocity(0, 0);
            }
          } else {
            this.stuckSince = now;
          }
        }
      }
    } else {
      // No target — idle wander within territory
      this.aiState = 'idle';
      this.stuckTarget = null;
      this.path = [];
      this.idleWander(body, now);
    }
  }

  // ---------------------------------------------------------------------------
  // Idle wander within home territory
  // ---------------------------------------------------------------------------

  private idleWander(body: Phaser.Physics.Arcade.Body, now: number): void {
    // If outside home territory, switch to returning
    if (!this.isInHomeTerritory()) {
      this.aiState = 'returning';
      return;
    }

    if (now >= this.wanderUntil) {
      if (this.wanderMoving) {
        this.pickWanderPause();
      } else {
        this.pickWanderLeg();
      }
    }

    if (this.wanderMoving) {
      body.setVelocity(this.wanderVx, this.wanderVy);

      // Steer back if approaching territory edge
      const tileWidth = this.tilemap?.tileWidth ?? 16;
      const minX = this.homeMinCol * tileWidth;
      const maxX = (this.homeMaxCol + 1) * tileWidth;
      if (this.x < minX + tileWidth * 2 && this.wanderVx < 0) {
        this.wanderVx = Math.abs(this.wanderVx);
      } else if (this.x > maxX - tileWidth * 2 && this.wanderVx > 0) {
        this.wanderVx = -Math.abs(this.wanderVx);
      }
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
    this.wanderUntil = this.scene.time.now + 1000 + Math.random() * 2000;
  }

  private pickWanderPause(): void {
    this.wanderVx = 0;
    this.wanderVy = 0;
    this.wanderMoving = false;
    this.wanderUntil = this.scene.time.now + 2000 + Math.random() * 3000;
  }

  private isInHomeTerritory(): boolean {
    const tileWidth = this.tilemap?.tileWidth ?? 16;
    const tileX = this.x / tileWidth;
    return tileX >= this.homeMinCol && tileX <= this.homeMaxCol;
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

    if (!this.walkableGrid[destTileY]?.[destTileX]) {
      const nearest = this.nearestWalkableTile(destTileX, destTileY);
      if (!nearest) { this.path = []; return; }
      destTileX = nearest.x;
      destTileY = nearest.y;
    }

    this.path = findPath(this.walkableGrid, catTileX, catTileY, destTileX, destTileY);
  }

  private followPath(body: Phaser.Physics.Arcade.Body, speed: number): void {
    if (this.path.length === 0 || !this.tilemap) {
      // No path — chase directly as fallback
      if (this.target) {
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > 4) {
          body.setVelocity((dx / d) * speed, (dy / d) * speed);
        } else {
          body.setVelocity(0, 0);
        }
      }
      return;
    }

    const tileSize = this.tilemap.tileWidth;
    const arrivalRadius = tileSize * 0.75;

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
      body.setVelocity((steerX / d) * speed, (steerY / d) * speed);
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
