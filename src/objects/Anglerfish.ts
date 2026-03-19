import Phaser from 'phaser';
import { PLAYER, ANGLERFISH, WATER } from '../config/constants';

/**
 * Anglerfish - Hostile NPC that chases the player
 *
 * A menacing deep-sea predator that pursues the beaver through the water.
 * Moves at 75% of player speed and creates red ripples when swimming.
 */
export class Anglerfish extends Phaser.Physics.Arcade.Sprite {
  private target!: Phaser.GameObjects.Sprite;
  private lastRippleTime: number = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    target: Phaser.GameObjects.Sprite
  ) {
    super(scene, x, y, 'anglerfish', 0);

    // Add to scene and enable physics
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Set depth
    this.setDepth(ANGLERFISH.DEPTH);

    // Configure physics
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);

    // Store reference to target (player)
    this.target = target;

    // Create animations
    this.createAnimations();
  }

  private createAnimations(): void {
    if (!this.scene.anims.exists('anglerfish-swim')) {
      this.scene.anims.create({
        key: 'anglerfish-swim',
        frames: this.scene.anims.generateFrameNumbers('anglerfish', {
          start: 0,
          end: 1,
        }),
        frameRate: 4,
        repeat: -1,
      });
    }

    // Start swimming animation
    this.anims.play('anglerfish-swim', true);
  }

  public update(time: number, groundLayer: Phaser.Tilemaps.TilemapLayer | null): void {
    const body = this.body as Phaser.Physics.Arcade.Body;

    // Calculate direction to target
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 10) {
      // Normalize and apply speed
      const speed = PLAYER.SPEED * ANGLERFISH.SPEED_MULTIPLIER;
      body.setVelocity(
        (dx / distance) * speed,
        (dy / distance) * speed
      );

      // Create ripples when moving on water
      if (body.velocity.length() > 0 && groundLayer) {
        this.checkAndCreateRipple(time, groundLayer);
      }
    } else {
      // Stop when close to target
      body.setVelocity(0, 0);
    }
  }

  private checkAndCreateRipple(
    time: number,
    groundLayer: Phaser.Tilemaps.TilemapLayer
  ): void {
    // Throttle ripple creation
    if (time - this.lastRippleTime < ANGLERFISH.RIPPLES.SPAWN_DELAY) {
      return;
    }

    // Get the tile the anglerfish is on
    const map = groundLayer.tilemap;
    const tileX = map.worldToTileX(this.x);
    const tileY = map.worldToTileY(this.y);

    if (tileX === null || tileY === null) {
      return;
    }

    const tile = groundLayer.getTileAt(tileX, tileY);

    // Check if it's a water tile
    if (tile && tile.index === WATER.TILE_INDEX) {
      // Emit event for WorldScene to create ripple
      this.scene.events.emit('anglerfishRipple', this.x, this.y);
      this.lastRippleTime = time;
    }
  }
}
