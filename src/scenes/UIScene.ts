import Phaser from 'phaser';
import { UI, DEPTHS } from '../config/constants';
import { WorldScene } from './WorldScene';

export class UIScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text;

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
    titleText.setScrollFactor(0); // Keep UI fixed on screen
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

    // Listen for score changes from WorldScene
    const worldScene = this.scene.get('WorldScene') as WorldScene;
    worldScene.events.on('scoreChanged', (score: number) => {
      this.scoreText.setText(`€${score}`);
    });
  }
}
