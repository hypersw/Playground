import Phaser from 'phaser';
import { PLAYER } from '../config/constants';

export class Player extends Phaser.Physics.Arcade.Sprite {
  private speed: number = PLAYER.SPEED;
  private lastDirection: string = 'down';

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'beaver');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.body!.setSize(PLAYER.BODY.WIDTH, PLAYER.BODY.HEIGHT);
    this.body!.setOffset(PLAYER.BODY.OFFSET_X, PLAYER.BODY.OFFSET_Y);

    this.createAnimations();
  }

  private createAnimations(): void {
    const scene = this.scene;

    scene.anims.create({
      key: 'idle-down',
      frames: [{ key: 'beaver', frame: 1 }],
      frameRate: 1,
    });
    scene.anims.create({
      key: 'idle-left',
      frames: [{ key: 'beaver', frame: 4 }],
      frameRate: 1,
    });
    scene.anims.create({
      key: 'idle-right',
      frames: [{ key: 'beaver', frame: 7 }],
      frameRate: 1,
    });
    scene.anims.create({
      key: 'idle-up',
      frames: [{ key: 'beaver', frame: 10 }],
      frameRate: 1,
    });

    scene.anims.create({
      key: 'walk-down',
      frames: scene.anims.generateFrameNumbers('beaver', { start: 0, end: 2 }),
      frameRate: 6,
      repeat: -1,
    });
    scene.anims.create({
      key: 'walk-left',
      frames: scene.anims.generateFrameNumbers('beaver', { start: 3, end: 5 }),
      frameRate: 6,
      repeat: -1,
    });
    scene.anims.create({
      key: 'walk-right',
      frames: scene.anims.generateFrameNumbers('beaver', { start: 6, end: 8 }),
      frameRate: 6,
      repeat: -1,
    });
    scene.anims.create({
      key: 'walk-up',
      frames: scene.anims.generateFrameNumbers('beaver', { start: 9, end: 11 }),
      frameRate: 6,
      repeat: -1,
    });
  }

  /**
   * Update movement and animation.
   *
   * If keyboard keys are held they take full priority.
   * Otherwise `overrideVelocity` (from joystick or path-follow) is applied.
   *
   * Returns true when keyboard input was active this frame, so the caller
   * can cancel touch-driven path following.
   */
  update(
    cursors: Phaser.Types.Input.Keyboard.CursorKeys,
    overrideVelocity?: { x: number; y: number }
  ): boolean {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const keys = this.scene.input.keyboard!;

    const leftPressed  = cursors.left?.isDown  || keys.addKey('A').isDown;
    const rightPressed = cursors.right?.isDown || keys.addKey('D').isDown;
    const upPressed    = cursors.up?.isDown    || keys.addKey('W').isDown;
    const downPressed  = cursors.down?.isDown  || keys.addKey('S').isDown;
    const anyKey = leftPressed || rightPressed || upPressed || downPressed;

    body.setVelocity(0);

    if (anyKey) {
      if (leftPressed)       body.setVelocityX(-this.speed);
      else if (rightPressed) body.setVelocityX(this.speed);
      if (upPressed)         body.setVelocityY(-this.speed);
      else if (downPressed)  body.setVelocityY(this.speed);

      if (body.velocity.x !== 0 && body.velocity.y !== 0) {
        body.velocity.normalize().scale(this.speed);
      }
    } else if (overrideVelocity) {
      body.setVelocity(overrideVelocity.x, overrideVelocity.y);
    }

    // Animation driven by actual velocity so all input modes share the same logic
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
      this.anims.play(`idle-${this.lastDirection}`, true);
    }

    return anyKey;
  }
}
