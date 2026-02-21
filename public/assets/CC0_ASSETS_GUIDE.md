# How to Replace Placeholder Assets with CC0 Art

The demo ships with simple colored-square placeholders. Here's how to get real CC0 (public domain) game art:

## 🎨 Recommended CC0 Asset Sources

### 1. **Kenney.nl** (Top Choice!)
- **URL**: https://kenney.nl/assets
- **License**: CC0 (Public Domain)
- **Best for**: Tileset, characters, UI elements

**What to download:**
- **Tilesets**: "Roguelike/RPG Pack" or "Micro Roguelike"
- **Characters**: "Sokoban" pack or "Tiny Town" for top-down sprites

### 2. **RGS_Dev Top-Down Tileset Template**
- **URL**: Search on OpenGameArt.org for "Free CC0 Top Down Tileset Template"
- **License**: CC0
- **Best for**: Top-down outdoor/indoor tiles (grass, walls, floors)

### 3. **OpenGameArt.org**
- **URL**: https://opengameart.org/
- **Search tips**: Use filters "CC0" or "Public Domain"
- Look for: "16x16 tileset", "top-down character", "rpg tileset"

## 📝 How to Replace Assets

### Tileset (`public/assets/tilesets/tileset.png`)

1. Download a 16×16 tile-based tileset (can be any size grid)
2. Save as `tileset.png` in `public/assets/tilesets/`
3. Update `public/assets/maps/world-map.json`:
   - Change `tilewidth` and `tileheight` if not 16×16
   - Update `imagewidth`, `imageheight`, `columns`, and `tilecount` to match

**Or** edit the map in [Tiled Map Editor](https://www.mapeditor.org/):
- Open `world-map.json`
- Replace the tileset image
- Redraw the map
- Export as JSON

### Player Sprite (`public/assets/sprites/player.png`)

1. Download a top-down character spritesheet
2. Ensure it has 4 directions (down, up, left, right)
3. Ideally 4 frames per direction for animation
4. Save as `player.png` in `public/assets/sprites/`
5. If frame size is NOT 32×32, update `src/scenes/PreloaderScene.ts`:
   ```typescript
   this.load.spritesheet('player', 'assets/sprites/player.png', {
     frameWidth: YOUR_FRAME_WIDTH,  // e.g., 16 or 32
     frameHeight: YOUR_FRAME_HEIGHT, // e.g., 16 or 32
   });
   ```
6. Update animation frame ranges in `src/objects/Player.ts` if layout differs

### Map (`public/assets/maps/world-map.json`)

The included map is a simple 20×20 room with walls and some obstacles. To create your own:

1. Download [Tiled Map Editor](https://www.mapeditor.org/) (free, open source)
2. Create a new map:
   - Orientation: Orthogonal
   - Tile size: 16×16 (or match your tileset)
3. Add your tileset image
4. Create layers:
   - **Ground**: Visual tiles (floor, grass, etc.)
   - **Collision**: Walls/obstacles (mark collidable tiles)
5. For collision: Select tiles in the Collision layer, add custom property:
   - Name: `collides`
   - Type: `bool`
   - Value: `true`
6. Export: File → Export As → JSON format
7. Save to `public/assets/maps/world-map.json`

## 🔍 Quick Example: Using Kenney's Assets

```bash
# 1. Download Kenney's "Micro Roguelike" (CC0)
#    https://kenney.nl/assets/micro-roguelike
# 2. Extract the PNG spritesheet
# 3. Copy to your project:
cp ~/Downloads/Kenney_MicroRoguelike/Tilemap/tilemap.png public/assets/tilesets/tileset.png

# 4. Update the map JSON to match Kenney's tile size (8×8 or 16×16)
# 5. Restart dev server:
npm run dev
```

## 📐 Asset Specifications Summary

- **Tileset**: Any size, PNG format, organized in a grid
- **Player spritesheet**: 4 rows (down/up/left/right), 4+ frames per row, PNG
- **Map**: Tiled JSON export, orthogonal orientation

## 🆘 Troubleshooting

- **"Tileset not found"**: Check that tileset name in Tiled matches `'tileset'` in code
- **Player animation looks wrong**: Verify frame order in spritesheet matches animation setup
- **Collision not working**: Ensure collision tiles have custom property `collides: true`
