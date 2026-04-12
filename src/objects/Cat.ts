import Phaser from 'phaser';

/**
 * Cat — hostile NPC on grass levels.
 *
 * AI priority:
 *   1. Chase nearest mouse within sight range
 *   2. If no mouse nearby, chase the player if within sight range
 *   3. Otherwise idle
 *
 * Navigates on grass only (collides with walls and water).
 * Hurts the player on contact. Hitbox is smaller than beaver — cats are liquid.
 *
 * Sprite frames are 34×52 (padded so the body torso center is at frame center).
 */
export class Cat extends Phaser.Physics.Arcade.Sprite {
  private static readonly BODY_SIZE = 6;
  private target: Phaser.GameObjects.Sprite | null = null;
  private player!: Phaser.GameObjects.Sprite;
  private chaseSpeed: number;
  private sightRange: number;
  private lastDirection: string = 'down';

  /** Reference to the scene's mouse group for target selection */
  private getMice: () => Phaser.GameObjects.Sprite[];

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    player: Phaser.GameObjects.Sprite,
    getMice: () => Phaser.GameObjects.Sprite[],
    speed: number = 100,
    sightRange: number = 120,
  ) {
    super(scene, x, y, 'cat', 1);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.player = player;
    this.getMice = getMice;
    this.chaseSpeed = speed;
    this.sightRange = sightRange;

    this.setDepth(9);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    // Body centered on the frame center (body center is pre-aligned in the sprite)
    const half = Cat.BODY_SIZE / 2;
    body.setSize(Cat.BODY_SIZE, Cat.BODY_SIZE);
    body.setOffset(this.width * 0.5 - half, this.height * 0.5 - half);

    this.createAnimations();
  }

  private createAnimations(): void {
    if (!this.scene.anims.exists('cat-idle-down')) {
      const s = this.scene;
      s.anims.create({ key: 'cat-idle-down',  frames: [{ key: 'cat', frame: 1 }],  frameRate: 1 });
      s.anims.create({ key: 'cat-idle-left',  frames: [{ key: 'cat', frame: 4 }],  frameRate: 1 });
      s.anims.create({ key: 'cat-idle-right', frames: [{ key: 'cat', frame: 7 }],  frameRate: 1 });
      s.anims.create({ key: 'cat-idle-up',    frames: [{ key: 'cat', frame: 10 }], frameRate: 1 });

      s.anims.create({ key: 'cat-walk-down',  frames: s.anims.generateFrameNumbers('cat', { start: 0, end: 2 }),  frameRate: 6, repeat: -1 });
      s.anims.create({ key: 'cat-walk-left',  frames: s.anims.generateFrameNumbers('cat', { start: 3, end: 5 }),  frameRate: 6, repeat: -1 });
      s.anims.create({ key: 'cat-walk-right', frames: s.anims.generateFrameNumbers('cat', { start: 6, end: 8 }),  frameRate: 6, repeat: -1 });
      s.anims.create({ key: 'cat-walk-up',    frames: s.anims.generateFrameNumbers('cat', { start: 9, end: 11 }), frameRate: 6, repeat: -1 });
    }
  }

  update(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;

    // Pick target: nearest mouse in range, else player if in range
    this.target = null;
    const mice = this.getMice();
    let bestDist = this.sightRange;

    for (const m of mice) {
      if (!m.active) continue;
      const d = Phaser.Math.Distance.Between(this.x, this.y, m.x, m.y);
      if (d < bestDist) {
        bestDist = d;
        this.target = m;
      }
    }

    if (!this.target) {
      const dp = Phaser.Math.Distance.Between(this.x, this.y, this.player.x, this.player.y);
      if (dp < this.sightRange) {
        this.target = this.player;
      }
    }

    if (this.target) {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 4) {
        body.setVelocity(
          (dx / dist) * this.chaseSpeed,
          (dy / dist) * this.chaseSpeed
        );
      } else {
        body.setVelocity(0, 0);
      }
    } else {
      body.setVelocity(0, 0);
    }

    // Animation
    if (body.velocity.x < 0) {
      this.anims.play('cat-walk-left', true);
      this.lastDirection = 'left';
    } else if (body.velocity.x > 0) {
      this.anims.play('cat-walk-right', true);
      this.lastDirection = 'right';
    } else if (body.velocity.y < 0) {
      this.anims.play('cat-walk-up', true);
      this.lastDirection = 'up';
    } else if (body.velocity.y > 0) {
      this.anims.play('cat-walk-down', true);
      this.lastDirection = 'down';
    } else {
      this.anims.play(`cat-idle-${this.lastDirection}`, true);
    }
  }
}
