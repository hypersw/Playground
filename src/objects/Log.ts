import Phaser from 'phaser';
import { LOGS } from '../config/constants';

/**
 * Log - Collectible resource that spawns on water
 *
 * Logs float on water with a gentle swaying animation.
 * When collected by the player, they grant points.
 */
export class Log extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    // Use frame 1 (top-down view of log)
    super(scene, x, y, 'log', 1);

    // Add to scene and enable physics
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Set depth so logs appear above player
    this.setDepth(LOGS.DEPTH);

    // Configure physics
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);

    // Start swaying animation
    this.startSwaying();
  }

  /**
   * Gentle swaying animation to simulate floating on water
   */
  private startSwaying(): void {
    // Sway side to side
    this.scene.tweens.add({
      targets: this,
      x: this.x + LOGS.SWAY.DISTANCE,
      duration: LOGS.SWAY.DURATION / 2,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Slight rotation for extra floating effect
    this.scene.tweens.add({
      targets: this,
      angle: 5,
      duration: LOGS.SWAY.DURATION,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /**
   * Called when log is collected
   * @param player - Reference to the player sprite to track during animation
   */
  public collect(player: Phaser.GameObjects.Sprite): void {
    // Disable physics body immediately to prevent multiple collections
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setEnable(false);

    // Stop all animations
    this.scene.tweens.killTweensOf(this);

    // Play collection animation - track player position in real-time
    this.scene.tweens.add({
      targets: this,
      scale: 0,
      alpha: 0.3,
      duration: 300,
      ease: 'Sine.easeIn',
      onUpdate: () => {
        // Move toward current player position each frame
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 1) {
          const speed = 0.2; // How fast to move toward player (0-1)
          this.x += dx * speed;
          this.y += dy * speed;
        }
      },
      onComplete: () => {
        this.destroy();
      },
    });
  }
}
