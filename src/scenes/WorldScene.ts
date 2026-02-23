import Phaser from 'phaser';
import { Player } from '../objects/Player';

export class WorldScene extends Phaser.Scene {
  private player!: Player;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private map!: Phaser.Tilemaps.Tilemap;
  private groundLayer!: Phaser.Tilemaps.TilemapLayer | null;
  private lastRippleTime: number = 0;
  private rippleDelay: number = 100; // ms between ripples (2x more frequent)

  constructor() {
    super({ key: 'WorldScene' });
  }

  create(): void {
    // Load the tilemap
    this.map = this.make.tilemap({ key: 'world-map' });
    const tileset = this.map.addTilesetImage('tileset', 'tileset');

    if (!tileset) {
      console.error('Tileset not found. Ensure tileset name in Tiled matches the key used here.');
      return;
    }

    // Create layers (adjust layer names to match your Tiled map)
    this.groundLayer = this.map.createLayer('Ground', tileset, 0, 0);
    const collisionLayer = this.map.createLayer('Collision', tileset, 0, 0);

    // Set layer depths
    if (this.groundLayer) this.groundLayer.setDepth(0);
    if (collisionLayer) collisionLayer.setDepth(0);

    // Set up collision for the collision layer (tile ID 1 = walls)
    if (collisionLayer) {
      collisionLayer.setCollisionByExclusion([-1, 0]); // All tiles except empty (0) collide
    }

    // Create the player at spawn position (center of walkable area)
    this.player = new Player(this, 160, 160);
    this.player.setDepth(10); // Above everything else

    // Enable collision between player and collision layer
    if (collisionLayer) {
      this.physics.add.collider(this.player, collisionLayer);
    }

    // Set up camera to follow player
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(2.5); // Zoom in for pixel art effect
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

    // Set up input
    this.cursors = this.input.keyboard!.createCursorKeys();
  }

  update(time: number): void {
    if (this.player) {
      this.player.update(this.cursors);

      // Check if player is moving on water tiles and create ripples
      const body = this.player.body as Phaser.Physics.Arcade.Body;
      if (body.velocity.length() > 0) {
        // Player is moving
        this.checkAndCreateRipple(time);
      }
    }
  }

  private checkAndCreateRipple(time: number): void {
    // Throttle ripple creation
    if (time - this.lastRippleTime < this.rippleDelay) {
      return;
    }

    // Get the tile the player is standing on
    const tileX = this.map.worldToTileX(this.player.x);
    const tileY = this.map.worldToTileY(this.player.y);

    if (tileX === null || tileY === null || !this.groundLayer) {
      return;
    }

    const tile = this.groundLayer.getTileAt(tileX, tileY);

    // Check if it's a water tile (tile index 4 based on the map)
    if (tile && tile.index === 4) {
      this.createRipple(this.player.x, this.player.y);
      this.lastRippleTime = time;
    }
  }

  private createRipple(x: number, y: number): void {
    // Create a graphics object for the ripple (outline only)
    const ripple = this.add.graphics();
    ripple.lineStyle(0.4, 0xffffff, 0.8); // Very thin line (0.4px), white, 80% opacity
    ripple.strokeCircle(0, 0, 2); // Start small

    // Position at the center/bottom of the sprite (where feet would be)
    ripple.setPosition(x, y + 8); // Offset down to feet position
    ripple.setDepth(5); // Above ground (0) but below player (10)

    // Create a mask from water tiles to clip ripples
    const mask = this.createWaterMask();
    if (mask) {
      ripple.setMask(mask);
    }

    // Animate the ripple expanding and fading (slower)
    this.tweens.add({
      targets: ripple,
      scaleX: 4, // Expand to 4x size (slower than before)
      scaleY: 4,
      alpha: 0, // Fade out
      duration: 900, // 900ms (slower)
      ease: 'Sine.easeOut',
      onComplete: () => {
        ripple.destroy(); // Clean up
      },
    });
  }

  private createWaterMask(): Phaser.Display.Masks.GeometryMask | null {
    if (!this.groundLayer) return null;

    // Create a graphics object that represents all water tiles
    const maskGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    maskGraphics.fillStyle(0xffffff);

    // Draw rectangles for each water tile (tile index 4)
    for (let y = 0; y < this.map.height; y++) {
      for (let x = 0; x < this.map.width; x++) {
        const tile = this.groundLayer.getTileAt(x, y);
        if (tile && tile.index === 4) {
          // This is a water tile
          const worldX = tile.pixelX;
          const worldY = tile.pixelY;
          maskGraphics.fillRect(worldX, worldY, this.map.tileWidth, this.map.tileHeight);
        }
      }
    }

    return maskGraphics.createGeometryMask();
  }
}
