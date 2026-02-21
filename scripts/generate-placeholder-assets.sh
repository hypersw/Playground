#!/usr/bin/env bash

# Generates minimal placeholder PNG assets for the Avatar Forest demo.
# Uses ImageMagick via Nix (no npm dependencies needed)
# Run with: bash scripts/generate-placeholder-assets.sh

set -e

ASSETS_DIR="$(dirname "$0")/../public/assets"
TILESET_PATH="$ASSETS_DIR/tilesets/tileset.png"
PLAYER_PATH="$ASSETS_DIR/sprites/player.png"

echo "Generating placeholder assets with ImageMagick..."
echo ""

# Detect ImageMagick command
if command -v magick &> /dev/null; then
    CONVERT_CMD="magick"
elif command -v convert &> /dev/null; then
    CONVERT_CMD="convert"
elif command -v nix &> /dev/null; then
    echo "Using ImageMagick via nix..."
    CONVERT_CMD="nix run nixpkgs#imagemagick --"
else
    echo "Error: ImageMagick not found. Install it or use nix."
    exit 1
fi

# Create tileset (64x16, 4 tiles of 16x16 each)
echo "✓ Creating tileset.png (64x16, 4 tiles)..."
$CONVERT_CMD -size 64x16 xc:none \
  \( -size 16x16 xc:"#555555" \) -geometry +0+0 -composite \
  \( -size 16x16 xc:"#7cb342" \) -geometry +16+0 -composite \
  \( -size 16x16 xc:"#8b6f47" \) -geometry +32+0 -composite \
  \( -size 16x16 xc:"#4a90e2" \) -geometry +48+0 -composite \
  "$TILESET_PATH"

# Create player spritesheet (128x128, 4x4 grid of 32x32 frames)
echo "✓ Creating player.png (128x128, 4x4 frames)..."
$CONVERT_CMD -size 128x128 xc:none \
  \( -size 16x20 xc:"#e74c3c" \) -geometry +8+8 -composite \
  \( -size 16x20 xc:"#e67e22" \) -geometry +40+8 -composite \
  \( -size 16x20 xc:"#f39c12" \) -geometry +72+8 -composite \
  \( -size 16x20 xc:"#e8b62d" \) -geometry +104+8 -composite \
  \( -size 16x20 xc:"#3498db" \) -geometry +8+40 -composite \
  \( -size 16x20 xc:"#2980b9" \) -geometry +40+40 -composite \
  \( -size 16x20 xc:"#1abc9c" \) -geometry +72+40 -composite \
  \( -size 16x20 xc:"#16a085" \) -geometry +104+40 -composite \
  \( -size 16x20 xc:"#9b59b6" \) -geometry +8+72 -composite \
  \( -size 16x20 xc:"#8e44ad" \) -geometry +40+72 -composite \
  \( -size 16x20 xc:"#34495e" \) -geometry +72+72 -composite \
  \( -size 16x20 xc:"#2c3e50" \) -geometry +104+72 -composite \
  \( -size 16x20 xc:"#e67e22" \) -geometry +8+104 -composite \
  \( -size 16x20 xc:"#d35400" \) -geometry +40+104 -composite \
  \( -size 16x20 xc:"#e74c3c" \) -geometry +72+104 -composite \
  \( -size 16x20 xc:"#c0392b" \) -geometry +104+104 -composite \
  "$PLAYER_PATH"

echo ""
echo "✓ All placeholder assets generated!"
echo ""
echo "Assets created at:"
echo "  • $TILESET_PATH"
echo "  • $PLAYER_PATH"
echo ""
echo "To use better CC0 art, replace these with:"
echo "  • Kenney.nl/assets (CC0 license)"
echo "  • OpenGameArt.org (search CC0/Public Domain)"
echo "  • RGS_Dev Top-Down Tileset (CC0)"
echo ""
