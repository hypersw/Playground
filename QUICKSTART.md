# ⚡ QUICKSTART - Avatar Forest Demo

## Run the Demo in 3 Commands

```bash
# 1. Install dependencies
npm install

# 2. Generate placeholder assets (uses Nix + ImageMagick)
npm run generate-assets

# 3. Start the game
npm run dev
```

Then open **http://localhost:3000** and play!

## 🎮 Controls

- **Arrow Keys** or **WASD** to move
- Walk around the room and collide with walls

## ✅ What's Included

- ✓ Phaser 3 + TypeScript + Vite setup
- ✓ Top-down 2D world with tilemap
- ✓ Player character with 4-direction movement
- ✓ Collision detection
- ✓ Placeholder CC0-style assets (simple colors)
- ✓ Scene architecture (Preloader → World → UI)
- ✓ Pixel-perfect rendering
- ✓ Hot reload for development

## 📚 Documentation

- **[README.md](README.md)** - Project overview, features, build instructions
- **[HOW_TO_RUN.md](HOW_TO_RUN.md)** - Detailed setup guide & troubleshooting
- **[CC0_ASSETS_GUIDE.md](public/assets/CC0_ASSETS_GUIDE.md)** - Replace placeholders with real art

## 🎨 Upgrade Assets

Replace the colored-square placeholders with real CC0 game art:

**Free Sources:**
- **Kenney.nl/assets** (CC0, huge collection)
- **OpenGameArt.org** (search "CC0")
- **RGS_Dev Top-Down Tileset** (CC0)

See [CC0_ASSETS_GUIDE.md](public/assets/CC0_ASSETS_GUIDE.md) for details.

## 🚀 Next Steps

1. **Customize the map**: Use [Tiled Map Editor](https://www.mapeditor.org/)
2. **Add NPCs**: Create classes in `src/objects/`
3. **Add items/pickups**: Use overlap detection
4. **Multiple rooms**: Create new scenes
5. **Better art**: Download CC0 assets

## 📂 Project Structure

```
AvatarForest/
├── src/               # TypeScript source code
│   ├── main.ts        # Entry point
│   ├── config/        # Phaser configuration
│   ├── scenes/        # Game scenes (Preloader, World, UI)
│   └── objects/       # Game objects (Player, NPCs, etc.)
├── public/            # Static assets
│   ├── index.html
│   └── assets/        # Images, maps, sprites
├── scripts/           # Build & asset generation scripts
└── dist/              # Production build (after `npm run build`)
```

## 💡 Pro Tips

- **Change player speed**: Edit `this.speed` in `src/objects/Player.ts`
- **Adjust camera zoom**: Change `setZoom()` in `src/scenes/WorldScene.ts`
- **Debug physics**: Set `debug: true` in `src/config/gameConfig.ts`
- **See collision boxes**: Enable physics debug mode

---

**Have fun building your avatar world!** 🌲✨
