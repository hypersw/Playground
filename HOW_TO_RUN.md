# 🚀 How to Run the Avatar Forest Demo

## Complete Setup (First Time)

Follow these steps to get the demo running on your machine:

### Step 1: Install Dependencies

```bash
npm install
```

This installs:
- `phaser` (game engine)
- `vite` (dev server & bundler)
- `typescript` (type safety)

### Step 2: Generate Placeholder Assets

The demo needs images for tiles and the player character. Generate simple placeholders:

```bash
npm run generate-assets
```

This uses **ImageMagick via Nix** to create:
- `public/assets/tilesets/tileset.png` (4 colored tiles)
- `public/assets/sprites/player.png` (simple animated character)

**Note**: If you don't have Nix, the script will try to use system ImageMagick. If neither is available, see the [CC0 Assets Guide](public/assets/CC0_ASSETS_GUIDE.md) for manual asset creation.

### Step 3: Start the Dev Server

```bash
npm run dev
```

You should see:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:3000/
```

### Step 4: Play the Game!

1. Open **http://localhost:3000** in your browser
2. Use **Arrow Keys** or **WASD** to move the player around
3. You'll see a top-down room with walls (collision) and open spaces

## What You Should See

- **Title**: "Avatar World - CC0 Demo" (top-left)
- **Controls**: "Move: Arrow Keys / WASD" (below title)
- **Player**: A colorful square character in the center
- **Map**: A room with gray walls and green/brown floor tiles
- **Obstacles**: Some wall blocks in the middle of the room

## 🎮 Controls

| Key | Action |
|-----|--------|
| **Arrow Keys** | Move player (up/down/left/right) |
| **W / A / S / D** | Alternative movement controls |

## 🔧 Development Workflow

### Hot Reload
Vite provides instant hot reload. Edit any file in `src/` and save:
- Changes appear in the browser automatically
- No manual refresh needed (usually)

### Build for Production
```bash
npm run build
```
Creates optimized files in `dist/` ready for deployment.

### Preview Production Build
```bash
npm run preview
```
Test the production build locally before deploying.

## 🛠 Common Issues

### "Cannot find module 'phaser'"
**Solution**: Run `npm install` first.

### "Failed to load tileset.png"
**Solution**: Run `npm run generate-assets` to create placeholder images.

### "ImageMagick not found"
**Solutions** (pick one):
1. Install Nix: https://nixos.org/download.html
2. Install ImageMagick: `sudo apt install imagemagick` (Debian/Ubuntu)
3. Download CC0 assets manually (see [CC0_ASSETS_GUIDE.md](public/assets/CC0_ASSETS_GUIDE.md))

### Player sprite shows as blank/wrong
**Check**:
1. `public/assets/sprites/player.png` exists
2. Frame size matches what's in `PreloaderScene.ts` (default: 32×32)

### Collision not working
**Check**:
1. `public/assets/maps/world-map.json` has a "Collision" layer
2. Tiles marked with `collides: true` property

## 🎨 Next Steps

### Replace Placeholder Assets
See **[CC0_ASSETS_GUIDE.md](public/assets/CC0_ASSETS_GUIDE.md)** for:
- Free CC0 art sources (Kenney.nl, OpenGameArt)
- How to use Tiled Map Editor
- Custom spritesheet configuration

### Extend the Game
- Add NPCs: Create new classes in `src/objects/`
- Add items: Use `this.physics.add.overlap()` for pickups
- Multiple rooms: Create new scenes in `src/scenes/`
- Custom UI: Edit `src/scenes/UIScene.ts`

## 📁 Project Structure

```
AvatarForest/
├── public/
│   ├── index.html           # HTML entry point
│   └── assets/
│       ├── tilesets/        # Tile images
│       ├── maps/            # Tiled JSON maps
│       └── sprites/         # Character spritesheets
├── src/
│   ├── main.ts              # Game bootstrap
│   ├── config/
│   │   └── gameConfig.ts    # Phaser config
│   ├── scenes/
│   │   ├── PreloaderScene.ts  # Asset loading
│   │   ├── WorldScene.ts      # Main game world
│   │   └── UIScene.ts         # HUD overlay
│   └── objects/
│       └── Player.ts          # Player logic
├── scripts/
│   └── generate-placeholder-assets.sh  # Asset generator
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 📚 Learn More

- **Phaser 3 Docs**: https://photonstorm.github.io/phaser3-docs/
- **Phaser Examples**: https://phaser.io/examples
- **Tiled Map Editor**: https://doc.mapeditor.org/
- **TypeScript**: https://www.typescriptlang.org/docs/

## 💡 Tips

- **Camera follows player**: Edit zoom in `WorldScene.ts` (default: 2.5×)
- **Player speed**: Change `this.speed` in `Player.ts` (default: 160)
- **Map size**: Edit `world-map.json` or create new maps in Tiled
- **Physics debug**: Set `debug: true` in `gameConfig.ts` to see collision boxes

## 🐛 Need Help?

If you encounter issues not covered here:
1. Check browser console (F12) for error messages
2. Verify all files in `public/assets/` exist
3. Try deleting `node_modules/` and running `npm install` again
4. Check that you're using Node.js v18 or higher: `node --version`

---

**Enjoy building your avatar world!** 🌲🎮
