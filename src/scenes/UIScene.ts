import Phaser from 'phaser';

export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
  }

  create(): void {
    // Simple HUD overlay
    const titleText = this.add.text(16, 16, '🦫 Beaver World - CC0 Demo', {
      fontSize: '20px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    });
    titleText.setScrollFactor(0); // Keep UI fixed on screen
    titleText.setDepth(100);

    // Controls hint
    const controlsText = this.add.text(16, 48, 'Move: Arrow Keys / WASD', {
      fontSize: '14px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    });
    controlsText.setScrollFactor(0);
    controlsText.setDepth(100);

    // Attribution
    const attrText = this.add.text(16, 72, 'Beaver sprite by bleutailfly (CC BY-SA)', {
      fontSize: '10px',
      color: '#cccccc',
      stroke: '#000000',
      strokeThickness: 2,
    });
    attrText.setScrollFactor(0);
    attrText.setDepth(100);

    // Placeholder for future HUD elements (health, inventory, etc.)
  }
}
