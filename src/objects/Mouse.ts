import Phaser from 'phaser';

/** Per-direction body center in sprite-local pixel coords (32×32 frame).
 *  Measured from the torso center in the pixel art, excluding head/tail. */
const MOUSE_BODY_CENTER: Record<string, { x: number; y: number }> = {
  down:  { x: 15.5, y: 23.5 },  // South: torso rows 21-26, cols 11-20
  left:  { x: 14,   y: 25   },  // West:  torso rows 23-27, cols 6-22
  right: { x: 15.5, y: 22.5 },  // East:  torso rows 18-27, cols 11-20
  up:    { x: 18,   y: 25   },  // North: torso rows 23-27, cols 10-26
};

/**
 * Mouse — collectible critter that spawns on grass.
 *
 * Runs away from the nearest threat (player or cat).
 * Collected by the player on overlap for money.
 */
export class Mouse extends Phaser.Physics.Arcade.Sprite {
  private fleeSpeed: number;
  private fleeRadius: number;
  private lastDirection: string = 'down';
  private static readonly BODY_SIZE = 8;

  constructor(scene: Phaser.Scene, x: number, y: number, speed: number = 120, fleeRadius: number = 80) {
    super(scene, x, y, 'mouse', 1);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Origin at average body center; per-direction offset updated each frame
    this.setOrigin(0.50, 0.75);

    this.fleeSpeed = speed;
    this.fleeRadius = fleeRadius;

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setSize(Mouse.BODY_SIZE, Mouse.BODY_SIZE);
    this.syncBodyOffset();

    this.setDepth(8);
    this.createAnimations();
  }

  private createAnimations(): void {
    if (!this.scene.anims.exists('mouse-idle-down')) {
      const s = this.scene;
      s.anims.create({ key: 'mouse-idle-down',  frames: [{ key: 'mouse', frame: 1 }],  frameRate: 1 });
      s.anims.create({ key: 'mouse-idle-left',  frames: [{ key: 'mouse', frame: 4 }],  frameRate: 1 });
      s.anims.create({ key: 'mouse-idle-right', frames: [{ key: 'mouse', frame: 7 }],  frameRate: 1 });
      s.anims.create({ key: 'mouse-idle-up',    frames: [{ key: 'mouse', frame: 10 }], frameRate: 1 });

      s.anims.create({ key: 'mouse-walk-down',  frames: s.anims.generateFrameNumbers('mouse', { start: 0, end: 2 }),  frameRate: 8, repeat: -1 });
      s.anims.create({ key: 'mouse-walk-left',  frames: s.anims.generateFrameNumbers('mouse', { start: 3, end: 5 }),  frameRate: 8, repeat: -1 });
      s.anims.create({ key: 'mouse-walk-right', frames: s.anims.generateFrameNumbers('mouse', { start: 6, end: 8 }),  frameRate: 8, repeat: -1 });
      s.anims.create({ key: 'mouse-walk-up',    frames: s.anims.generateFrameNumbers('mouse', { start: 9, end: 11 }), frameRate: 8, repeat: -1 });
    }
  }

  /**
   * Flee from threats. Call each frame from WorldScene.update().
   * @param threats Array of game objects (player + cats) to flee from.
   */
  flee(threats: Phaser.GameObjects.Sprite[]): void {
    const body = this.body as Phaser.Physics.Arcade.Body;

    // Find nearest threat within flee radius
    let nearestDist = Infinity;
    let fleeFromX = 0;
    let fleeFromY = 0;
    let hasThreat = false;

    for (const t of threats) {
      if (!t.active) continue;
      const dist = Phaser.Math.Distance.Between(this.x, this.y, t.x, t.y);
      if (dist < this.fleeRadius && dist < nearestDist) {
        nearestDist = dist;
        fleeFromX = t.x;
        fleeFromY = t.y;
        hasThreat = true;
      }
    }

    if (hasThreat) {
      // Run away from threat
      const dx = this.x - fleeFromX;
      const dy = this.y - fleeFromY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        body.setVelocity(
          (dx / dist) * this.fleeSpeed,
          (dy / dist) * this.fleeSpeed
        );
      }
    } else {
      body.setVelocity(0, 0);
    }

    // Animation
    if (body.velocity.x < 0) {
      this.anims.play('mouse-walk-left', true);
      this.lastDirection = 'left';
    } else if (body.velocity.x > 0) {
      this.anims.play('mouse-walk-right', true);
      this.lastDirection = 'right';
    } else if (body.velocity.y < 0) {
      this.anims.play('mouse-walk-up', true);
      this.lastDirection = 'up';
    } else if (body.velocity.y > 0) {
      this.anims.play('mouse-walk-down', true);
      this.lastDirection = 'down';
    } else {
      this.anims.play(`mouse-idle-${this.lastDirection}`, true);
    }

    this.syncBodyOffset();
  }

  /** Update physics body offset to match the current direction's torso center */
  private syncBodyOffset(): void {
    const c = MOUSE_BODY_CENTER[this.lastDirection];
    const half = Mouse.BODY_SIZE / 2;
    (this.body as Phaser.Physics.Arcade.Body).setOffset(c.x - half, c.y - half);
  }

  /** Called when collected by the player */
  collect(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setEnable(false);
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      scale: 0,
      alpha: 0,
      duration: 200,
      ease: 'Sine.easeIn',
      onComplete: () => this.destroy(),
    });
  }
}
