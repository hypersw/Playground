# Avatar Forest - Playable Demo

A minimal but fully playable 2D browser-based avatar worlds game built with **Phaser 3**, **TypeScript**, and **Vite**.

## 🎮 Features

- Top-down 2D world with tilemap support (Tiled JSON format)
- Controllable player avatar with 4-directional movement
- **Controls**: Arrow Keys **OR** WASD
- Collision detection with walls and obstacles
- Scene architecture: Preloader → World → UI overlay
- Pixel-perfect rendering optimized for both desktop and mobile
- Uses CC0-licensed placeholder assets (easily replaceable)
- Designed to be embeddable in React/Svelte SPAs later

## 🚀 Quick Start

### NixOS / Nix Users (Recommended)

```bash
# One-command run (automatic setup + dev server)
./run.sh

# Or manually:
nix develop            # Enter development environment
npm install            # Install dependencies
npm run generate-assets  # Create placeholder assets
npm run dev            # Start dev server
```

> 📖 **See [NIX_SETUP.md](NIX_SETUP.md)** for complete Nix usage guide.

### Traditional Setup (Node.js installed)

**Prerequisites:** Node.js v18+ and npm

```bash
# 1. Install dependencies
npm install

# 2. Generate placeholder assets (requires ImageMagick)
npm run generate-assets

# 3. Start the dev server
npm run dev
```

**That's it!** Open `http://localhost:3000` and use **Arrow Keys** or **WASD** to move around.

> 📖 **See [HOW_TO_RUN.md](HOW_TO_RUN.md)** for detailed instructions and troubleshooting.

### Build for Production

Create an optimized production build:

```bash
npm run build
```

The output will be in the `dist/` folder.

### Serve the Built Game

**Important:** Modern browsers block ES modules on `file://` due to CORS security. You need a simple server:

```bash
# Easiest - use the included script
./serve.sh

# Or use npm preview
npm run preview

# Or use Python
cd dist && python3 -m http.server 8000
```

Then open **http://localhost:8000** in your browser.

## Project Structure

```
avatar-forest/
├── public/
│   ├── index.html
│   └── assets/
│       ├── tilesets/        # PNG tileset images
│       ├── maps/            # Tiled JSON map files
│       └── sprites/         # Character spritesheets
├── src/
│   ├── main.ts              # Game bootstrap
│   ├── config/
│   │   └── gameConfig.ts    # Phaser configuration
│   ├── scenes/
│   │   ├── PreloaderScene.ts  # Asset loading
│   │   ├── WorldScene.ts      # Main game world
│   │   └── UIScene.ts         # HUD overlay
│   └── objects/
│       └── Player.ts          # Player sprite logic
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 🎨 Upgrading from Placeholder Assets

The demo includes simple colored-square placeholders. See **[CC0_ASSETS_GUIDE.md](public/assets/CC0_ASSETS_GUIDE.md)** for:
- Where to download free CC0 game art (Kenney, OpenGameArt, RGS_Dev)
- Step-by-step replacement instructions
- Tiled Map Editor usage guide

### Quick Asset Replacement

1. **Tileset**: Replace `public/assets/tilesets/tileset.png` with a 16×16 grid tileset
2. **Player**: Replace `public/assets/sprites/player.png` with a 4-direction spritesheet (32×32 frames)
3. **Map**: Edit `public/assets/maps/world-map.json` in [Tiled](https://www.mapeditor.org/) or create your own

See the [asset guide](public/assets/CC0_ASSETS_GUIDE.md) for detailed instructions and troubleshooting.

## Extending the Game

### Adding NPCs

1. Create a new class in `src/objects/` (e.g., `NPC.ts`)
2. Extend `Phaser.Physics.Arcade.Sprite`
3. Instantiate in `WorldScene.ts`

### Adding Interactable Objects

1. Create a new class in `src/objects/` (e.g., `Chest.ts`)
2. Use `this.physics.add.overlap()` in `WorldScene.ts` to detect player interaction

### Multiple Rooms/Scenes

1. Create new scene files in `src/scenes/`
2. Register them in `src/config/gameConfig.ts`
3. Use `this.scene.start('NewSceneName')` to transition

### Avatar Customization

The `Player` class can be extended to support layered sprites:
- Head, body, accessories as separate sprites
- Composite rendering using containers or multiple sprites

## License

MIT

## Credits

Built with:
- [Phaser 3](https://phaser.io/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
