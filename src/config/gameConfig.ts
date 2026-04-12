import Phaser from 'phaser';
import { PreloaderScene } from '../scenes/PreloaderScene';
import { WorldScene } from '../scenes/WorldScene';
import { UIScene } from '../scenes/UIScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 1600,  // 2× canvas resolution for sharpness on HiDPI displays
  height: 1200, // FIT scale mode scales it back down to window size
  pixelArt: true, // Crisp pixel art rendering (no bilinear filtering)
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [PreloaderScene, WorldScene, UIScene],
  backgroundColor: '#2d2d2d',
};
