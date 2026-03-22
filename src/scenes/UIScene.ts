import Phaser from 'phaser';
import { UI, DEPTHS, LIVES } from '../config/constants';
import { WorldScene } from './WorldScene';

export class UIScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text;
  private heartTexts: Phaser.GameObjects.Text[] = [];
  private gameOverOverlay!: Phaser.GameObjects.Rectangle;

  constructor() {
    super({ key: 'UIScene' });
  }

  create(): void {
    // Title
    const titleText = this.add.text(
      UI.TEXT.TITLE.x,
      UI.TEXT.TITLE.y,
      '🦫 Beaver World - CC0 Demo',
      {
        fontSize: UI.TEXT.TITLE.fontSize,
        color: UI.TEXT.TITLE.color,
        stroke: UI.TEXT.TITLE.stroke,
        strokeThickness: UI.TEXT.TITLE.strokeThickness,
      }
    );
    titleText.setScrollFactor(0);
    titleText.setDepth(DEPTHS.UI);

    // Controls hint
    const controlsText = this.add.text(
      UI.TEXT.CONTROLS.x,
      UI.TEXT.CONTROLS.y,
      'Move: Arrow Keys / WASD',
      {
        fontSize: UI.TEXT.CONTROLS.fontSize,
        color: UI.TEXT.CONTROLS.color,
        stroke: UI.TEXT.CONTROLS.stroke,
        strokeThickness: UI.TEXT.CONTROLS.strokeThickness,
      }
    );
    controlsText.setScrollFactor(0);
    controlsText.setDepth(DEPTHS.UI);

    // Attribution
    const attrText = this.add.text(
      UI.TEXT.ATTRIBUTION.x,
      UI.TEXT.ATTRIBUTION.y,
      'Sprites: bleutailfly, pixel_emm (CC BY-SA)',
      {
        fontSize: UI.TEXT.ATTRIBUTION.fontSize,
        color: UI.TEXT.ATTRIBUTION.color,
        stroke: UI.TEXT.ATTRIBUTION.stroke,
        strokeThickness: UI.TEXT.ATTRIBUTION.strokeThickness,
      }
    );
    attrText.setScrollFactor(0);
    attrText.setDepth(DEPTHS.UI);

    // Score counter
    this.scoreText = this.add.text(
      UI.TEXT.SCORE.x,
      UI.TEXT.SCORE.y,
      '€0',
      {
        fontSize: UI.TEXT.SCORE.fontSize,
        color: UI.TEXT.SCORE.color,
        stroke: UI.TEXT.SCORE.stroke,
        strokeThickness: UI.TEXT.SCORE.strokeThickness,
      }
    );
    this.scoreText.setScrollFactor(0);
    this.scoreText.setDepth(DEPTHS.UI);

    // -------------------------------------------------------------------------
    // Hearts row
    // -------------------------------------------------------------------------
    for (let i = 0; i < LIVES.INITIAL; i++) {
      const heart = this.add.text(
        UI.TEXT.HEARTS.x + i * UI.TEXT.HEARTS.spacing,
        UI.TEXT.HEARTS.y,
        '❤️',
        { fontSize: UI.TEXT.HEARTS.fontSize }
      );
      heart.setScrollFactor(0);
      heart.setDepth(DEPTHS.UI);
      this.heartTexts.push(heart);
    }

    // -------------------------------------------------------------------------
    // Game-over red overlay (hidden initially)
    // -------------------------------------------------------------------------
    const cw = this.scale.width;
    const ch = this.scale.height;
    this.gameOverOverlay = this.add.rectangle(
      cw / 2,
      ch / 2,
      cw,
      ch,
      0xff0000,
      LIVES.OVERLAY_ALPHA
    );
    this.gameOverOverlay.setScrollFactor(0);
    this.gameOverOverlay.setDepth(DEPTHS.UI - 1);
    this.gameOverOverlay.setVisible(false);

    // -------------------------------------------------------------------------
    // WorldScene event listeners
    // -------------------------------------------------------------------------
    const worldScene = this.scene.get('WorldScene') as WorldScene;

    worldScene.events.on('scoreChanged', (score: number) => {
      this.scoreText.setText(`€${score}`);
    });

    worldScene.events.on('livesChanged', (lives: number, worldX: number, worldY: number) => {
      this.onLifeLost(lives, worldX, worldY);
    });

    worldScene.events.on('gameOver', () => {
      this.gameOverOverlay.setVisible(true);
    });
  }

  // ---------------------------------------------------------------------------
  // Heart fly animation
  // ---------------------------------------------------------------------------

  private onLifeLost(lives: number, playerWorldX: number, playerWorldY: number): void {
    // Index of the heart to animate out (lives already decremented, e.g. 3→2: index 2)
    const heartIndex = lives;
    if (heartIndex < 0 || heartIndex >= this.heartTexts.length) return;

    this.heartTexts[heartIndex].setVisible(false);

    const startX = this.heartTexts[heartIndex].x;
    const startY = this.heartTexts[heartIndex].y;

    const clone = this.add.text(startX, startY, '❤️', {
      fontSize: UI.TEXT.HEARTS.fontSize,
    });
    clone.setScrollFactor(0);
    clone.setDepth(DEPTHS.UI + 1);

    const worldScene = this.scene.get('WorldScene') as WorldScene;
    const cam = worldScene.cameras.main;

    // Single tween on a plain state object drives everything each frame.
    // cam.worldView gives the visible world rectangle (accounts for zoom),
    // so we can map world→canvas coords without touching cam.zoom directly.
    const state = { t: 0 };
    this.tweens.add({
      targets: state,
      t: 1,
      duration: LIVES.ANIMATION_DURATION,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        // Track player's latest world position
        const wx = worldScene.player?.x ?? playerWorldX;
        const wy = worldScene.player?.y ?? playerWorldY;

        // Map world position to UIScene canvas coordinates via worldView
        const wv = cam.worldView;
        const destX = ((wx - wv.x) / wv.width) * this.scale.width;
        const destY = ((wy - wv.y) / wv.height) * this.scale.height;

        const t = state.t;
        clone.x = Phaser.Math.Linear(startX, destX, t);
        clone.y = Phaser.Math.Linear(startY, destY, t);

        // Scale: ease from 2× down to 1× over the first half of the flight
        const scale = t < 0.5 ? Phaser.Math.Linear(2, 1, t * 2) : 1;
        clone.setScale(scale);
      },
      onComplete: () => {
        clone.destroy();
      },
    });
  }
}
