# Assets Directory

Place your game assets in the appropriate subdirectories:

## Tilesets (`tilesets/`)
- **tileset.png** - Your tileset image (referenced in PreloaderScene)
- Use 16×16 or 32×32 tiles for best results with pixel art

## Maps (`maps/`)
- **world-map.json** - Your Tiled map JSON export
- Create maps using [Tiled Map Editor](https://www.mapeditor.org/)
- Ensure your tileset in Tiled is named "tileset" (matching the code)
- Add custom property `collides: true` to tiles that should block movement

## Sprites (`sprites/`)
- **player.png** - Player character spritesheet
- Expected format: 32×32 pixel frames
- Layout (4 rows × 4 columns):
  - Row 0: Walk down (frames 0-3)
  - Row 1: Walk up (frames 4-7)
  - Row 2: Walk left (frames 8-11)
  - Row 3: Walk right (frames 12-15)

## Placeholder Assets

Until you add your own assets, you can:
1. Use [Kenney's free assets](https://kenney.nl/assets)
2. Create simple colored rectangles in any image editor
3. Use [OpenGameArt](https://opengameart.org/) for CC-licensed assets
