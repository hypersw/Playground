import Phaser from 'phaser';
import { UI, DEPTHS, LIVES } from '../config/constants';
import { WorldScene } from './WorldScene';
import { ShopModal } from '../ui/ShopModal';

export class UIScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text;
  private heartTexts: Phaser.GameObjects.Text[] = [];
  private shopModal!: ShopModal;

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
    // Shop button
    // -------------------------------------------------------------------------
    const shopBtn = this.add.text(
      UI.TEXT.SHOP_BUTTON.x,
      UI.TEXT.SHOP_BUTTON.y,
      '🛒 Shop',
      {
        fontSize: UI.TEXT.SHOP_BUTTON.fontSize,
        color: UI.TEXT.SHOP_BUTTON.color,
        stroke: UI.TEXT.SHOP_BUTTON.stroke,
        strokeThickness: UI.TEXT.SHOP_BUTTON.strokeThickness,
      }
    );
    shopBtn.setScrollFactor(0);
    shopBtn.setDepth(DEPTHS.UI);
    shopBtn.setInteractive({ useHandCursor: true });

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

    // livesUpdated = shop purchase/sale (no fly animation, just re-sync display)
    worldScene.events.on('livesUpdated', (lives: number, score: number) => {
      this.syncHearts(lives);
      this.scoreText.setText(`€${score}`);
      this.shopModal.update(score, lives);
    });

    worldScene.events.on('gameOver', () => {
      this.startBloodTransition();
    });

    worldScene.events.on('levelComplete', (score: number) => {
      this.showLevelComplete(score);
    });

    // -------------------------------------------------------------------------
    // Shop modal
    // -------------------------------------------------------------------------
    this.shopModal = new ShopModal(
      (qty) => worldScene.buyHearts(qty),
      (qty) => worldScene.sellHearts(qty),
      () => {
        this.shopModal.hide();
        worldScene.closeShop();
      },
    );

    shopBtn.on('pointerdown', () => {
      if (worldScene.isGameOver) return;
      worldScene.openShop();
      this.shopModal.show(worldScene.score, worldScene.lives);
    });
  }

  // ---------------------------------------------------------------------------
  // Hearts helpers
  // ---------------------------------------------------------------------------

  /** Set heart visibility to match the given lives count (no animation). */
  private syncHearts(lives: number): void {
    for (let i = 0; i < this.heartTexts.length; i++) {
      this.heartTexts[i].setVisible(i < lives);
    }
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

  // ---------------------------------------------------------------------------
  // Doom-style blood transition
  // ---------------------------------------------------------------------------

  private startBloodTransition(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const NUM_COLS = 42;
    const colW = W / NUM_COLS;
    const tipR = colW * 0.52; // drip-tip circle radius slightly wider than column

    const gfx = this.add.graphics();
    gfx.setDepth(DEPTHS.UI + 10);

    // Per-column state
    interface Col { h: number; speed: number; delay: number }
    const cols: Col[] = Array.from({ length: NUM_COLS }, () => ({
      h: 0,
      speed: Phaser.Math.Between(10, 28),   // canvas px per frame
      delay: Phaser.Math.Between(0, 22),    // frames before this column starts
    }));

    // Slight per-column colour variation for organic look
    const colColours = cols.map(() => {
      const r = Phaser.Math.Between(130, 180);
      const g = 0;
      const b = 0;
      return (r << 16) | (g << 8) | b;
    });

    const onUpdate = () => {
      gfx.clear();

      let allDone = true;

      for (let i = 0; i < NUM_COLS; i++) {
        const col = cols[i];

        if (col.delay > 0) {
          col.delay--;
          allDone = false;
          continue;
        }

        if (col.h < H + tipR) {
          col.h += col.speed;
          allDone = false;
        }

        const x = i * colW;
        const bodyH = Math.min(col.h, H); // rectangle never exceeds canvas

        // Main blood column — dark red
        gfx.fillStyle(colColours[i], 1);
        gfx.fillRect(x, 0, colW, bodyH);

        // Drip tip — brighter blob hanging below the column front
        if (col.h < H + tipR) {
          gfx.fillStyle(0xdd1111, 1);
          gfx.fillCircle(x + colW / 2, col.h, tipR);
        }
      }

      if (allDone) {
        this.events.off('update', onUpdate);
        this.showYouDied();
      }
    };

    this.events.on('update', onUpdate);
  }

  private showLevelComplete(score: number): void {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    // Dark overlay
    const overlay = this.add.rectangle(cx, cy, this.scale.width, this.scale.height, 0x000022, 0);
    overlay.setDepth(DEPTHS.UI + 10);
    this.tweens.add({ targets: overlay, fillAlpha: 0.75, duration: 600, ease: 'Sine.easeIn' });

    const title = this.add.text(cx, cy - 80, 'LEVEL COMPLETE', {
      fontSize: '96px',
      color: '#00ffcc',
      stroke: '#003322',
      strokeThickness: 8,
      fontStyle: 'bold',
    });
    title.setOrigin(0.5).setDepth(DEPTHS.UI + 11).setAlpha(0);

    const sub = this.add.text(cx, cy + 30, `Score: €${score}`, {
      fontSize: '48px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    });
    sub.setOrigin(0.5).setDepth(DEPTHS.UI + 11).setAlpha(0);

    this.tweens.add({ targets: title, alpha: 1, y: cy - 60, duration: 900, ease: 'Back.easeOut', delay: 300 });
    this.tweens.add({ targets: sub,   alpha: 1,             duration: 700, ease: 'Sine.easeIn',  delay: 800 });
  }

  private showYouDied(): void {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    const text = this.add.text(cx, cy, 'WASTED', {
      fontSize: '120px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 8,
      fontStyle: 'bold',
    });
    text.setOrigin(0.5, 0.5);
    text.setDepth(DEPTHS.UI + 11);
    text.setAlpha(0);

    this.tweens.add({
      targets: text,
      alpha: 1,
      duration: 1200,
      ease: 'Sine.easeIn',
    });
  }
}
