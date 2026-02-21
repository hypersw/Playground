import Phaser from 'phaser';

export class Player extends Phaser.Physics.Arcade.Sprite {
  private speed: number = 160;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player');

    // Add to scene and enable physics
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Set up physics body
    this.setCollideWorldBounds(true);
    this.body!.setSize(24, 28); // Adjust collision box as needed
    this.body!.setOffset(4, 4);

    // Create animations
    this.createAnimations();
  }

  private createAnimations(): void {
    const scene = this.scene;

    // Idle animation (down-facing, frame 0)
    scene.anims.create({
      key: 'idle',
      frames: [{ key: 'player', frame: 0 }],
      frameRate: 1,
    });

    // Walk down animation (row 0)
    scene.anims.create({
      key: 'walk-down',
      frames: scene.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1,
    });

    // Walk up animation (row 1, frames 4-7)
    scene.anims.create({
      key: 'walk-up',
      frames: scene.anims.generateFrameNumbers('player', { start: 4, end: 7 }),
      frameRate: 8,
      repeat: -1,
    });

    // Walk left animation (row 2, frames 8-11)
    scene.anims.create({
      key: 'walk-left',
      frames: scene.anims.generateFrameNumbers('player', { start: 8, end: 11 }),
      frameRate: 8,
      repeat: -1,
    });

    // Walk right animation (row 3, frames 12-15)
    scene.anims.create({
      key: 'walk-right',
      frames: scene.anims.generateFrameNumbers('player', { start: 12, end: 15 }),
      frameRate: 8,
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

    // Set animation based on movement
    if (body.velocity.x < 0) {
      this.anims.play('walk-left', true);
    } else if (body.velocity.x > 0) {
      this.anims.play('walk-right', true);
    } else if (body.velocity.y < 0) {
      this.anims.play('walk-up', true);
    } else if (body.velocity.y > 0) {
      this.anims.play('walk-down', true);
    } else {
      this.anims.play('idle', true);
    }
  }
}
