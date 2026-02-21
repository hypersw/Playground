You are an expert game developer and frontend engineer.
Create a **minimal but well-structured boilerplate** for a browser-based 2D “avatar worlds” game with these constraints:

## High-level requirements

- Target: **runs in the browser**, sharable as a simple static site.
- Tech stack:
  - **TypeScript**
  - **Phaser 3** as the game framework
  - **Vite** as the bundler/dev server
- Architecture:
  - Designed so that it **can be embedded into a SPA** later (e.g. React/Svelte), but for now it's just a single-page app with a `<canvas>`.
- License: assume the project will be published under a permissive license and can be hosted and shared online for free.

## Game features for the boilerplate

Keep the gameplay simple, but wire things so extending is straightforward:

1. **World / map**
   - A single top-down tilemap “room” loaded from a **Tiled JSON** map.
   - Use a placeholder tileset image and placeholder JSON (assume existing files; focus on code and directory layout).
   - Collision layer for walls/blocked tiles.

2. **Player avatar**
   - A controllable sprite with 4-directional movement using cursor keys or WASD.
   - Basic animation (idle + walk cycle) from a spritesheet.
   - Camera follows the player.

3. **Basic systems**
   - Scene structure:
     - `PreloaderScene` – loads assets (tileset, tilemap, player spritesheet).
     - `WorldScene` – main game world (map, player, collisions).
     - Optional `UIScene` – overlay for HUD, even if mostly empty (just a placeholder text like “Avatar World”).
   - Simple config code for Phaser: canvas size, pixel art rendering, scale mode that works well both on desktop and mobile.

4. **Extensibility**
   - Code should be organized so it is easy to add:
     - NPCs
     - Interactable objects
     - Multiple rooms/scenes
     - Avatar customization (layers) later

## Project structure

Propose and implement a structure similar to:

- `src/`
  - `main.ts` – bootstraps Phaser, game config, and initial scene.
  - `scenes/`
    - `PreloaderScene.ts`
    - `WorldScene.ts`
    - `UIScene.ts`
  - `objects/`
    - `Player.ts`
  - `config/`
    - `gameConfig.ts` (or similar)
- `public/`
  - `assets/`
    - `tilesets/` (placeholder PNG)
    - `maps/` (placeholder Tiled JSON)
    - `sprites/` (placeholder player spritesheet)
  - `index.html`
- Root:
  - `package.json`
  - `tsconfig.json`
  - `vite.config.ts`
  - basic `README.md` describing how to run and build

You may stub the actual asset file names and paths, but ensure the code clearly shows **how** they'd be loaded.

## What to output

1. A short explanation (1–2 paragraphs) of the chosen structure and design choices.
2. A **complete `package.json`** with:
   - Dependencies: `phaser`, `vite`, `typescript` and anything else essential.
   - Scripts: `dev`, `build`, `preview`.
3. A **complete `tsconfig.json`** suitable for a modern TS + Vite project.
4. A **minimal `vite.config.ts`** configured for TypeScript and Phaser (include any necessary aliasing or define settings).
5. A **minimal `index.html`** that mounts the game canvas (or a root div that Phaser uses).
6. TypeScript source files:
   - `src/main.ts`
   - `src/config/gameConfig.ts` (or equivalent)
   - `src/scenes/PreloaderScene.ts`
   - `src/scenes/WorldScene.ts`
   - `src/scenes/UIScene.ts`
   - `src/objects/Player.ts`
7. A brief example `README.md` describing:
   - How to install dependencies
   - How to run in dev mode
   - How to build for production
   - Where to add assets (tilesets/maps/sprites)

## Style and quality

- Use **modern TypeScript** with strict typing (`strict: true`).
- Keep the code **idiomatic and clean**, with clear separation of concerns.
- Favor clarity over micro-optimizations.
- Add **short, focused comments** only where needed to explain non-obvious parts.
- Assume the user is comfortable with TypeScript and basic web tooling, but new to Phaser.

Generate all files inline, clearly separated with headings or code fences and filenames so they can be copy-pasted into a new project folder.
