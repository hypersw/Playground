import Phaser from 'phaser';
import { Player } from '../objects/Player';

export class WorldScene extends Phaser.Scene {
  private player!: Player;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  constructor() {
    super({ key: 'WorldScene' });
  }

  create(): void {
    // Load the tilemap
    const map = this.make.tilemap({ key: 'world-map' });
    const tileset = map.addTilesetImage('tileset', 'tileset');

    if (!tileset) {
      console.error('Tileset not found. Ensure tileset name in Tiled matches the key used here.');
      return;
    }

    // Create layers (adjust layer names to match your Tiled map)
    const groundLayer = map.createLayer('Ground', tileset, 0, 0);
    const collisionLayer = map.createLayer('Collision', tileset, 0, 0);

    // Set up collision for the collision layer (tile ID 1 = walls)
    if (collisionLayer) {
      collisionLayer.setCollisionByExclusion([-1, 0]); // All tiles except empty (0) collide
    }

    // Create the player at spawn position (center of walkable area)
    this.player = new Player(this, 160, 160);

    // Enable collision between player and collision layer
    if (collisionLayer) {
      this.physics.add.collider(this.player, collisionLayer);
    }

    // Set up camera to follow player
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(2.5); // Zoom in for pixel art effect
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    // Set up input
    this.cursors = this.input.keyboard!.createCursorKeys();
  }

  update(): void {
    if (this.player) {
      this.player.update(this.cursors);
    }
  }
}
