import Phaser from 'phaser';
import { PLAYER, ANGLERFISH, WATER } from '../config/constants';
import { findPath, buildWalkableGrid } from '../utils/pathfinder';

/**
 * Anglerfish - Hostile NPC that chases the player
 *
 * Navigates via A* over water tiles, matching the player's collision-body
 * size so it can sail narrow passages.
 */
export class Anglerfish extends Phaser.Physics.Arcade.Sprite {
  private target!: Phaser.GameObjects.Sprite;
  private lastRippleTime: number = 0;

  // Pathfinding state
  private walkableGrid: boolean[][] | null = null;
  private path: Array<{ x: number; y: number }> = [];
  private lastPathTime: number = 0;
  private readonly PATH_RECOMPUTE_INTERVAL = 800; // ms

  /** When true the AI does nothing (too far from player) */
  private sleeping: boolean = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    target: Phaser.GameObjects.Sprite
  ) {
    super(scene, x, y, 'anglerfish', 0);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(ANGLERFISH.DEPTH);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);

    // Match player collision body so narrow passages are navigable
    body.setSize(PLAYER.BODY.WIDTH, PLAYER.BODY.HEIGHT);
    body.setOffset(PLAYER.BODY.OFFSET_X, PLAYER.BODY.OFFSET_Y);

    this.target = target;
    this.createAnimations();
  }

  private createAnimations(): void {
    if (!this.scene.anims.exists('anglerfish-swim')) {
      this.scene.anims.create({
        key: 'anglerfish-swim',
        frames: this.scene.anims.generateFrameNumbers('anglerfish', { start: 0, end: 1 }),
        frameRate: 4,
        repeat: -1,
      });
    }
    this.anims.play('anglerfish-swim', true);
  }

  public update(time: number, groundLayer: Phaser.Tilemaps.TilemapLayer | null): void {
    // Distance-based sleep
    const distToPlayer = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
    if (distToPlayer > ANGLERFISH.DEACTIVATE_DISTANCE_PX) {
      if (!this.sleeping) {
        this.sleeping = true;
        (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      }
      return;
    }
    this.sleeping = false;

    if (!groundLayer) {
      this.chaseDirectly();
      return;
    }

    // Build walkable grid once
    if (!this.walkableGrid) {
      this.walkableGrid = buildWalkableGrid(groundLayer, WATER.TILE_INDEX);
    }

    // Periodically recompute A* path
    if (time - this.lastPathTime > this.PATH_RECOMPUTE_INTERVAL) {
      this.recomputePath(groundLayer);
      this.lastPathTime = time;
    }

    this.followPath(time, groundLayer);
  }

  // ---------------------------------------------------------------------------

  private recomputePath(groundLayer: Phaser.Tilemaps.TilemapLayer): void {
    const map = groundLayer.tilemap;
    const fishTileX = map.worldToTileX(this.x);
    const fishTileY = map.worldToTileY(this.y);
    const targetTileX = map.worldToTileX(this.target.x);
    const targetTileY = map.worldToTileY(this.target.y);

    if (
      fishTileX === null || fishTileY === null ||
      targetTileX === null || targetTileY === null ||
      !this.walkableGrid
    ) {
      this.path = [];
      return;
    }

    // If target is not on water, find nearest water tile to target
    let destX = targetTileX;
    let destY = targetTileY;
    if (!this.walkableGrid[destY]?.[destX]) {
      const nearest = this.nearestWaterTile(targetTileX, targetTileY);
      if (!nearest) { this.path = []; return; }
      destX = nearest.x;
      destY = nearest.y;
    }

    this.path = findPath(this.walkableGrid, fishTileX, fishTileY, destX, destY);
  }

  private followPath(time: number, groundLayer: Phaser.Tilemaps.TilemapLayer): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const speed = PLAYER.SPEED * ANGLERFISH.SPEED_MULTIPLIER;

    if (this.path.length === 0) {
      this.chaseDirectly();
      return;
    }

    const tileSize = groundLayer.tilemap.tileWidth;
    const arrivalRadius = tileSize * 0.75;

    // Advance past any waypoints already within arrival radius
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

    // Lookahead steering: blend direction toward next 1-2 waypoints so the
    // fish starts rounding corners before it reaches the exact centre of a tile.
    let steerX = 0;
    let steerY = 0;
    let totalWeight = 0;
    const lookahead = Math.min(2, this.path.length);
    for (let i = 0; i < lookahead; i++) {
      const w = lookahead - i; // nearer waypoints get higher weight
      steerX += (this.path[i].x * tileSize + tileSize / 2 - this.x) * w;
      steerY += (this.path[i].y * tileSize + tileSize / 2 - this.y) * w;
      totalWeight += w;
    }
    steerX /= totalWeight;
    steerY /= totalWeight;

    const steerDist = Math.sqrt(steerX * steerX + steerY * steerY);
    if (steerDist > 0) {
      body.setVelocity((steerX / steerDist) * speed, (steerY / steerDist) * speed);
    }

    if (body.velocity.length() > 0) {
      this.checkAndCreateRipple(time, groundLayer);
    }
  }

  private chaseDirectly(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > 10) {
      const speed = PLAYER.SPEED * ANGLERFISH.SPEED_MULTIPLIER;
      body.setVelocity((dx / distance) * speed, (dy / distance) * speed);
    } else {
      body.setVelocity(0, 0);
    }
  }

  /** BFS scan outward from (tx, ty) to find the nearest walkable (water) tile */
  private nearestWaterTile(tx: number, ty: number): { x: number; y: number } | null {
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
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
        const k = ny * cols + nx;
        if (visited.has(k)) continue;
        visited.add(k);
        queue.push({ x: nx, y: ny });
      }
    }
    return null;
  }

  private checkAndCreateRipple(
    time: number,
    groundLayer: Phaser.Tilemaps.TilemapLayer
  ): void {
    if (time - this.lastRippleTime < ANGLERFISH.RIPPLES.SPAWN_DELAY) return;

    const map = groundLayer.tilemap;
    const tileX = map.worldToTileX(this.x);
    const tileY = map.worldToTileY(this.y);
    if (tileX === null || tileY === null) return;

    const tile = groundLayer.getTileAt(tileX, tileY);
    if (tile && tile.index === WATER.TILE_INDEX) {
      this.scene.events.emit('anglerfishRipple', this.x, this.y);
      this.lastRippleTime = time;
    }
  }
}
