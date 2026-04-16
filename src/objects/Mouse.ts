import Phaser from 'phaser';
import { directionFromVelocity } from '../utils/direction';
import type { MouseGrade } from '../config/mouseGrades';

/**
 * Mouse — collectible critter that spawns on grass.
 *
 * Each mouse has a grade that determines its color, speed, and value.
 * Wanders randomly when safe. Flees from nearest threat (player/cat).
 */
export class Mouse extends Phaser.Physics.Arcade.Sprite {
  private static readonly BODY_SIZE = 8;
  public readonly grade: MouseGrade;
  private fleeSpeed: number;
  private wanderSpeed: number;
  private fleeRadius: number;
  private lastDirection: string = 'down';

  // Wander state machine
  private wanderVx: number = 0;
  private wanderVy: number = 0;
  private wanderUntil: number = 0;
  private wanderMoving: boolean = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    grade: MouseGrade,
    fleeRadius: number = 100,
  ) {
    const textureKey = `mouse-${grade.id}`;
    super(scene, x, y, textureKey, 1);

    this.grade = grade;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.fleeSpeed = grade.speed;
    this.wanderSpeed = grade.speed * 0.4;
    this.fleeRadius = fleeRadius;

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    const half = Mouse.BODY_SIZE / 2;
    body.setSize(Mouse.BODY_SIZE, Mouse.BODY_SIZE);
    body.setOffset(this.width * 0.5 - half, this.height * 0.5 - half);

    this.setDepth(8);
    this.createAnimations();
    this.pickWanderLeg();
  }

  private createAnimations(): void {
    const key = this.texture.key;
    if (this.scene.anims.exists(`${key}-idle-down`)) return;

    const s = this.scene;
    // Sprite row order: N, E, S, W (rows 0-3)
    s.anims.create({ key: `${key}-idle-up`,    frames: [{ key, frame: 1 }],  frameRate: 1 });
    s.anims.create({ key: `${key}-idle-right`, frames: [{ key, frame: 4 }],  frameRate: 1 });
    s.anims.create({ key: `${key}-idle-down`,  frames: [{ key, frame: 7 }],  frameRate: 1 });
    s.anims.create({ key: `${key}-idle-left`,  frames: [{ key, frame: 10 }], frameRate: 1 });

    s.anims.create({ key: `${key}-walk-up`,    frames: s.anims.generateFrameNumbers(key, { start: 0, end: 2 }),  frameRate: 8, repeat: -1 });
    s.anims.create({ key: `${key}-walk-right`, frames: s.anims.generateFrameNumbers(key, { start: 3, end: 5 }),  frameRate: 8, repeat: -1 });
    s.anims.create({ key: `${key}-walk-down`,  frames: s.anims.generateFrameNumbers(key, { start: 6, end: 8 }),  frameRate: 8, repeat: -1 });
    s.anims.create({ key: `${key}-walk-left`,  frames: s.anims.generateFrameNumbers(key, { start: 9, end: 11 }), frameRate: 8, repeat: -1 });
  }

  flee(threats: Phaser.GameObjects.Sprite[]): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const now = this.scene.time.now;

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
      const dx = this.x - fleeFromX;
      const dy = this.y - fleeFromY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        body.setVelocity(
          (dx / dist) * this.fleeSpeed,
          (dy / dist) * this.fleeSpeed
        );
      }
      this.wanderUntil = 0;
    } else {
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
    const angle = Math.random() * Math.PI * 2;
    this.wanderVx = Math.cos(angle) * this.wanderSpeed;
    this.wanderVy = Math.sin(angle) * this.wanderSpeed;
    this.wanderMoving = true;
    this.wanderUntil = this.scene.time.now + 500 + Math.random() * 1500;
  }

  private pickWanderPause(): void {
    this.wanderVx = 0;
    this.wanderVy = 0;
    this.wanderMoving = false;
    this.wanderUntil = this.scene.time.now + 300 + Math.random() * 900;
  }

  private updateAnimation(body: Phaser.Physics.Arcade.Body): void {
    const key = this.texture.key;
    const dir = directionFromVelocity(body.velocity.x, body.velocity.y);
    if (dir) {
      this.lastDirection = dir;
      this.anims.play(`${key}-walk-${dir}`, true);
    } else {
      this.anims.play(`${key}-idle-${this.lastDirection}`, true);
    }
  }

  collect(): void {
    if (!this.active) return;
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
