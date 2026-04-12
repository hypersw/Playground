import Phaser from 'phaser';
import { directionFromVelocity } from '../utils/direction';

/**
 * Mouse — collectible critter that spawns on grass.
 *
 * Wanders randomly when safe. Flees from nearest threat (player/cat)
 * when one gets close. Collected by the player on overlap for money.
 *
 * Sprite frames are 36×36 (padded so the body torso center is at frame center).
 */
export class Mouse extends Phaser.Physics.Arcade.Sprite {
  private static readonly BODY_SIZE = 8;
  private fleeSpeed: number;
  private wanderSpeed: number;
  private fleeRadius: number;
  private lastDirection: string = 'down';

  // Wander state machine
  private wanderVx: number = 0;
  private wanderVy: number = 0;
  /** Time (ms) when current wander leg or pause ends */
  private wanderUntil: number = 0;
  /** true = moving, false = pausing */
  private wanderMoving: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number, speed: number = 120, fleeRadius: number = 80) {
    super(scene, x, y, 'mouse', 1);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.fleeSpeed = speed;
    this.wanderSpeed = speed * 0.4;
    this.fleeRadius = fleeRadius;

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    const half = Mouse.BODY_SIZE / 2;
    body.setSize(Mouse.BODY_SIZE, Mouse.BODY_SIZE);
    body.setOffset(this.width * 0.5 - half, this.height * 0.5 - half);

    this.setDepth(8);
    this.createAnimations();

    // Start with a random wander leg so mice don't all sit still at spawn
    this.pickWanderLeg();
  }

  private createAnimations(): void {
    if (!this.scene.anims.exists('mouse-idle-down')) {
      const s = this.scene;
      // Sprite row order: N, E, S, W (rows 0-3) — confirmed by user
      s.anims.create({ key: 'mouse-idle-up',    frames: [{ key: 'mouse', frame: 1 }],  frameRate: 1 });
      s.anims.create({ key: 'mouse-idle-right', frames: [{ key: 'mouse', frame: 4 }],  frameRate: 1 });
      s.anims.create({ key: 'mouse-idle-down',  frames: [{ key: 'mouse', frame: 7 }],  frameRate: 1 });
      s.anims.create({ key: 'mouse-idle-left',  frames: [{ key: 'mouse', frame: 10 }], frameRate: 1 });

      s.anims.create({ key: 'mouse-walk-up',    frames: s.anims.generateFrameNumbers('mouse', { start: 0, end: 2 }),  frameRate: 8, repeat: -1 });
      s.anims.create({ key: 'mouse-walk-right', frames: s.anims.generateFrameNumbers('mouse', { start: 3, end: 5 }),  frameRate: 8, repeat: -1 });
      s.anims.create({ key: 'mouse-walk-down',  frames: s.anims.generateFrameNumbers('mouse', { start: 6, end: 8 }),  frameRate: 8, repeat: -1 });
      s.anims.create({ key: 'mouse-walk-left',  frames: s.anims.generateFrameNumbers('mouse', { start: 9, end: 11 }), frameRate: 8, repeat: -1 });
    }
  }

  /**
   * Called each frame from WorldScene.update().
   * @param threats Array of game objects (player + cats) to flee from.
   */
  flee(threats: Phaser.GameObjects.Sprite[]): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const now = this.scene.time.now;

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
      // Flee: run away from threat at full speed
      const dx = this.x - fleeFromX;
      const dy = this.y - fleeFromY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        body.setVelocity(
          (dx / dist) * this.fleeSpeed,
          (dy / dist) * this.fleeSpeed
        );
      }
      // Reset wander so the mouse picks a new direction after fleeing ends
      this.wanderUntil = 0;
    } else {
      // Wander: alternate between walking in a random direction and pausing
      if (now >= this.wanderUntil) {
        if (this.wanderMoving) {
          this.pickWanderPause();
        } else {
          this.pickWanderLeg();
        }
      }

      if (this.wanderMoving) {
        body.setVelocity(this.wanderVx, this.wanderVy);
      } else {
        body.setVelocity(0, 0);
      }
    }

    this.updateAnimation(body);
  }

  private pickWanderLeg(): void {
    // Random direction
    const angle = Math.random() * Math.PI * 2;
    this.wanderVx = Math.cos(angle) * this.wanderSpeed;
    this.wanderVy = Math.sin(angle) * this.wanderSpeed;
    this.wanderMoving = true;
    // Walk for 0.5–2 seconds
    this.wanderUntil = this.scene.time.now + 500 + Math.random() * 1500;
  }

  private pickWanderPause(): void {
    this.wanderVx = 0;
    this.wanderVy = 0;
    this.wanderMoving = false;
    // Pause for 0.3–1.2 seconds
    this.wanderUntil = this.scene.time.now + 300 + Math.random() * 900;
  }

  private updateAnimation(body: Phaser.Physics.Arcade.Body): void {
    const dir = directionFromVelocity(body.velocity.x, body.velocity.y);
    if (dir) {
      this.lastDirection = dir;
      this.anims.play(`mouse-walk-${dir}`, true);
    } else {
      this.anims.play(`mouse-idle-${this.lastDirection}`, true);
    }
  }

  /** Called when collected by the player or eaten by a cat */
  collect(): void {
    if (!this.active) return;  // already collected
    this.active = false;
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
