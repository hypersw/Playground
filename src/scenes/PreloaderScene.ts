import Phaser from 'phaser';
import { LEVELS } from '../config/levels';
import { MOUSE_GRADES } from '../config/mouseGrades';

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
      frameWidth: 38,
      frameHeight: 48,
    });

    // Cat sprite (CC BY by bluecarrot16 / AntumDeluge) — padded to center body
    this.load.spritesheet('cat', 'assets/sprites/cat.png', {
      frameWidth: 34,
      frameHeight: 68,
    });
  }

  create(): void {
    // Generate hue-shifted mouse sprites for each grade
    this.generateMouseGradeTextures();

    // Once assets are loaded, start the main world scene
    this.scene.start('WorldScene');
    this.scene.launch('UIScene');
  }

  /**
   * For each mouse grade, generate a hue-shifted copy of the base mouse
   * spritesheet and register it as a new texture (e.g. 'mouse-green').
   */
  private generateMouseGradeTextures(): void {
    const baseTexture = this.textures.get('mouse');
    const source = baseTexture.getSourceImage() as HTMLImageElement;

    // Draw base image to a canvas to read pixel data
    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = source.width;
    tmpCanvas.height = source.height;
    const tmpCtx = tmpCanvas.getContext('2d')!;
    tmpCtx.drawImage(source, 0, 0);
    const baseData = tmpCtx.getImageData(0, 0, source.width, source.height);

    for (const grade of MOUSE_GRADES) {
      const canvas = document.createElement('canvas');
      canvas.width = source.width;
      canvas.height = source.height;
      const ctx = canvas.getContext('2d')!;
      const imageData = ctx.createImageData(source.width, source.height);
      const src = baseData.data;
      const dst = imageData.data;

      for (let i = 0; i < src.length; i += 4) {
        const r = src[i], g = src[i + 1], b = src[i + 2], a = src[i + 3];
        if (a === 0) {
          dst[i] = dst[i + 1] = dst[i + 2] = dst[i + 3] = 0;
          continue;
        }

        // RGB -> HSL
        const [h, s, l] = rgbToHsl(r, g, b);

        // Apply hue shift and saturation multiplier
        const newH = (h + grade.hueShift / 360) % 1;
        const newS = Math.min(1, s * grade.saturation);

        // HSL -> RGB
        const [nr, ng, nb] = hslToRgb(newH, newS, l);
        dst[i] = nr;
        dst[i + 1] = ng;
        dst[i + 2] = nb;
        dst[i + 3] = a;
      }

      ctx.putImageData(imageData, 0, 0);

      const key = `mouse-${grade.id}`;
      // addSpriteSheet needs an HTMLImageElement — convert canvas via data URL
      const img = new Image();
      img.src = canvas.toDataURL();
      this.textures.addSpriteSheet(key, img, {
        frameWidth: 38,
        frameHeight: 48,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Color conversion helpers
// ---------------------------------------------------------------------------

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}
