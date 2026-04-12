# AvatarForest — Claude Instructions

## Mandatory context restoration

Before doing any work, read the full project prompt:

**`claude_phaser_avatar_world_prompt.md`** — describes the game concept, goals, and design intentions. Reading this file is mandatory at the start of every session.

## Tech stack

- Phaser 3 + TypeScript, bundled with Vite
- Nix-based dev environment — use `nix run nixpkgs#<tool> -- <args>` for anything not on PATH
- Type-check: `nix-shell -p nodejs --run "npx tsc --noEmit"`
- Dev server: `nix run .#dev`

## Git discipline

- **Commit and push as soon as a piece of functionality is complete** — do not wait for the user to ask
- Partition commits by feature/concern; do not bundle unrelated changes
- Always type-check before committing (`tsc --noEmit` must pass)
- Write descriptive commit messages that explain *what* and *why*

## Code conventions

- **Global tunables** live in `src/config/constants.ts` — never hardcode magic numbers in scene or object files
- **Per-level config** lives in `src/config/levels/levelN.ts` — spawn regions, portals, anglerfish placement, log settings. Shared defaults in `shared.ts`, types in `types.ts`, registry in `index.ts`
- To add a new level: create `src/config/levels/levelN.ts` + map JSON in `public/assets/maps/` + register in `index.ts`
- Level 0 = Home hub (peaceful, no enemies); Level 1 = starting level; portals define navigation between levels
- `src/ui/` for DOM overlays (ShopModal, DebugPanel)
- `src/utils/` for reusable logic (e.g. pathfinder)
- Objects in `src/objects/`, scenes in `src/scenes/`
- Physics bodies sized to `PLAYER.BODY` dimensions (10×10) for maze navigation
- Anglerfish navigates via A* on water tiles only; player navigates via A* on all non-wall tiles
