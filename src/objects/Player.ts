import Phaser from 'phaser';
import { PLAYER } from '../config/constants';

export class Player extends Phaser.Physics.Arcade.Sprite {
  private speed: number = PLAYER.SPEED;
  private lastDirection: string = 'down'; // Track last facing direction

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'beaver'); // Use beaver sprite

    // Add to scene and enable physics
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Set up physics body — small enough to fit through single-tile (16px) maze corridors
    this.setCollideWorldBounds(true);
    this.body!.setSize(PLAYER.BODY.WIDTH, PLAYER.BODY.HEIGHT);
    this.body!.setOffset(PLAYER.BODY.OFFSET_X, PLAYER.BODY.OFFSET_Y);

    // Create animations
    this.createAnimations();
  }

  private createAnimations(): void {
    const scene = this.scene;

    // Beaver sprite layout: 3 frames per direction, 4 rows
    // Row 0: South (down) - frames 0-2
    // Row 1: West (left) - frames 3-5
    // Row 2: East (right) - frames 6-8
    // Row 3: North (up) - frames 9-11

    // Idle animations (center frame of each direction)
    scene.anims.create({
      key: 'idle-down',
      frames: [{ key: 'beaver', frame: 1 }], // Center frame of down row
      frameRate: 1,
    });

    scene.anims.create({
      key: 'idle-left',
      frames: [{ key: 'beaver', frame: 4 }], // Center frame of left row
      frameRate: 1,
    });

    scene.anims.create({
      key: 'idle-right',
      frames: [{ key: 'beaver', frame: 7 }], // Center frame of right row
      frameRate: 1,
    });

    scene.anims.create({
      key: 'idle-up',
      frames: [{ key: 'beaver', frame: 10 }], // Center frame of up row
      frameRate: 1,
    });

    // Walk down animation (row 0, frames 0-2)
    scene.anims.create({
      key: 'walk-down',
      frames: scene.anims.generateFrameNumbers('beaver', { start: 0, end: 2 }),
      frameRate: 6,
      repeat: -1,
    });

    // Walk left animation (row 1, frames 3-5)
    scene.anims.create({
      key: 'walk-left',
      frames: scene.anims.generateFrameNumbers('beaver', { start: 3, end: 5 }),
      frameRate: 6,
      repeat: -1,
    });

    // Walk right animation (row 2, frames 6-8)
    scene.anims.create({
      key: 'walk-right',
      frames: scene.anims.generateFrameNumbers('beaver', { start: 6, end: 8 }),
      frameRate: 6,
      repeat: -1,
    });

    // Walk up animation (row 3, frames 9-11)
    scene.anims.create({
      key: 'walk-up',
      frames: scene.anims.generateFrameNumbers('beaver', { start: 9, end: 11 }),
      frameRate: 6,
      repeat: -1,
    });
  }

  update(cursors: Phaser.Types.Input.Keyboard.CursorKeys): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const keys = this.scene.input.keyboard!;

    // Reset velocity
    body.setVelocity(0);

    // Check both arrow keys and WASD
    const leftPressed = cursors.left?.isDown || keys.addKey('A').isDown;
    const rightPressed = cursors.right?.isDown || keys.addKey('D').isDown;
    const upPressed = cursors.up?.isDown || keys.addKey('W').isDown;
    const downPressed = cursors.down?.isDown || keys.addKey('S').isDown;

    // Horizontal movement
    if (leftPressed) {
      body.setVelocityX(-this.speed);
    } else if (rightPressed) {
      body.setVelocityX(this.speed);
    }

    // Vertical movement
    if (upPressed) {
      body.setVelocityY(-this.speed);
    } else if (downPressed) {
      body.setVelocityY(this.speed);
    }

    // Normalize diagonal movement
    if (body.velocity.x !== 0 && body.velocity.y !== 0) {
      body.velocity.normalize().scale(this.speed);
    }

    // Set animation based on movement and track last direction
    if (body.velocity.x < 0) {
      this.anims.play('walk-left', true);
      this.lastDirection = 'left';
    } else if (body.velocity.x > 0) {
      this.anims.play('walk-right', true);
      this.lastDirection = 'right';
    } else if (body.velocity.y < 0) {
      this.anims.play('walk-up', true);
      this.lastDirection = 'up';
    } else if (body.velocity.y > 0) {
      this.anims.play('walk-down', true);
      this.lastDirection = 'down';
    } else {
      // When stopped, use idle animation for last direction
      this.anims.play(`idle-${this.lastDirection}`, true);
    }
  }
}
