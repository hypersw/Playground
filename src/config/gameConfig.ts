import Phaser from 'phaser';
import { PreloaderScene } from '../scenes/PreloaderScene';
import { WorldScene } from '../scenes/WorldScene';
import { UIScene } from '../scenes/UIScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 800,
  height: 600,
  pixelArt: true, // Crisp pixel art rendering
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [PreloaderScene, WorldScene, UIScene],
  backgroundColor: '#2d2d2d',
};
