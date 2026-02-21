#!/usr/bin/env node

/**
 * Generates minimal placeholder PNG assets for the Avatar Forest demo.
 * Run with: node scripts/generate-placeholder-assets.js
 *
 * This creates simple colored rectangles as placeholders.
 * Replace with real CC0 assets from Kenney.nl or OpenGameArt.org
 */

import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const assetsDir = path.join(__dirname, '..', 'public', 'assets');

// Create a simple 4-tile tileset (16x16 pixels each, 2x2 grid)
function generateTileset() {
  const canvas = createCanvas(64, 16);
  const ctx = canvas.getContext('2d');

  // Tile 1: Dark gray (wall)
  ctx.fillStyle = '#555555';
  ctx.fillRect(0, 0, 16, 16);

  // Tile 2: Light green (grass/floor)
  ctx.fillStyle = '#7cb342';
  ctx.fillRect(16, 0, 16, 16);

  // Tile 3: Brown (dirt)
  ctx.fillStyle = '#8b6f47';
  ctx.fillRect(32, 0, 16, 16);

  // Tile 4: Blue (water)
  ctx.fillStyle = '#4a90e2';
  ctx.fillRect(48, 0, 16, 16);

  const buffer = canvas.toBuffer('image/png');
  const outputPath = path.join(assetsDir, 'tilesets', 'tileset.png');
  fs.writeFileSync(outputPath, buffer);
  console.log('✓ Created tileset.png (64x16, 4 tiles)');
}

// Create a simple player spritesheet (32x32 per frame, 4 directions x 4 frames)
function generatePlayerSpritesheet() {
  const frameWidth = 32;
  const frameHeight = 32;
  const cols = 4; // 4 animation frames per direction
  const rows = 4; // 4 directions (down, up, left, right)

  const canvas = createCanvas(frameWidth * cols, frameHeight * rows);
  const ctx = canvas.getContext('2d');

  // Draw a simple colored square for each frame
  const colors = ['#e74c3c', '#e67e22', '#f39c12', '#e8b62d']; // Red to yellow gradient

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * frameWidth;
      const y = row * frameHeight;

      // Body (main color)
      ctx.fillStyle = colors[col];
      ctx.fillRect(x + 8, y + 8, 16, 20);

      // Head
      ctx.fillStyle = '#f9c794';
      ctx.fillRect(x + 10, y + 6, 12, 10);

      // Direction indicator (arrow)
      ctx.fillStyle = '#000000';
      if (row === 0) {
        // Down arrow
        ctx.fillRect(x + 14, y + 24, 4, 4);
      } else if (row === 1) {
        // Up arrow
        ctx.fillRect(x + 14, y + 10, 4, 4);
      } else if (row === 2) {
        // Left arrow
        ctx.fillRect(x + 10, y + 16, 4, 4);
      } else {
        // Right arrow
        ctx.fillRect(x + 18, y + 16, 4, 4);
      }
    }
  }

  const buffer = canvas.toBuffer('image/png');
  const outputPath = path.join(assetsDir, 'sprites', 'player.png');
  fs.writeFileSync(outputPath, buffer);
  console.log('✓ Created player.png (128x128, 4x4 frames)');
}

// Main
try {
  console.log('Generating placeholder assets...\n');
  generateTileset();
  generatePlayerSpritesheet();
  console.log('\n✓ All placeholder assets generated!');
  console.log('\nReplace these with real CC0 assets:');
  console.log('  • Kenney.nl/assets (CC0 license)');
  console.log('  • OpenGameArt.org (search for CC0/Public Domain)');
  console.log('  • RGS_Dev Top-Down Tileset (CC0)\n');
} catch (error) {
  console.error('Error generating assets:', error.message);
  console.error('\nMake sure you have installed dependencies:');
  console.error('  npm install canvas\n');
  process.exit(1);
}
