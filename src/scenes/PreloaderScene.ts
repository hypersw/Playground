import Phaser from 'phaser';
import { LEVELS } from '../config/levels';

export class PreloaderScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloaderScene' });
  }

  preload(): void {
    // Display loading progress
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

    const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
      fontSize: '20px',
      color: '#ffffff',
    });
    loadingText.setOrigin(0.5);

    const percentText = this.add.text(width / 2, height / 2, '0%', {
      fontSize: '18px',
      color: '#ffffff',
    });
    percentText.setOrigin(0.5);

    // Update progress bar as assets load
    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0xffffff, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
      percentText.setText(`${Math.floor(value * 100)}%`);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      percentText.destroy();
    });

    // Load game assets
    // Tileset image
    this.load.image('tileset', 'assets/tilesets/tileset.png');

    // Load all level tilemaps
    for (const [, levelDef] of LEVELS) {
      this.load.tilemapTiledJSON(levelDef.mapKey, `assets/maps/${levelDef.mapKey}.json`);
    }

    // Player spritesheet - Placeholder (simple colored squares)
    this.load.spritesheet('player', 'assets/sprites/player.png', {
      frameWidth: 32,
      frameHeight: 32,
    });

    // Beaver sprite (CC BY-SA by bleutailfly)
    this.load.spritesheet('beaver', 'assets/sprites/beaver.png', {
      frameWidth: 32,
      frameHeight: 32,
    });

    // Log sprite (CC BY-SA by Redfill Production)
    this.load.spritesheet('log', 'assets/sprites/log.png', {
      frameWidth: 16,
      frameHeight: 16,
    });

    // Anglerfish sprite (CC BY-SA 4.0 by pixel_emm)
    this.load.spritesheet('anglerfish', 'assets/sprites/anglerfish.png', {
      frameWidth: 48,
      frameHeight: 48,
    });

    // Mouse sprite (CC BY by Reemax / AntumDeluge) — padded to center body
    this.load.spritesheet('mouse', 'assets/sprites/mouse.png', {
      frameWidth: 36,
      frameHeight: 36,
    });

    // Cat sprite (CC BY by bluecarrot16 / AntumDeluge) — padded to center body
    this.load.spritesheet('cat', 'assets/sprites/cat.png', {
      frameWidth: 34,
      frameHeight: 52,
    });
  }

  create(): void {
    // Once assets are loaded, start the main world scene
    this.scene.start('WorldScene');
    this.scene.launch('UIScene');
  }
}
