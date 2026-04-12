import Phaser from 'phaser';

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

  constructor(scene: Phaser.Scene, x: number, y: number, speed: number = 120, fleeRadius: number = 80) {
    super(scene, x, y, 'mouse', 1);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.fleeSpeed = speed;
    this.fleeRadius = fleeRadius;

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    // Small body centered on the 32x32 frame
    body.setSize(8, 8);
    body.setOffset(12, 12);

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
