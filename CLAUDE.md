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

- **Commit after every meaningful batch of work** — either when a feature is complete and working, or when switching to a different task
- Partition commits by feature/concern; do not bundle unrelated changes
- Always type-check before committing (`tsc --noEmit` must pass)
- Write descriptive commit messages that explain *what* and *why*

## Code conventions

- All tunable values live in `src/config/constants.ts` — never hardcode magic numbers in scene or object files
- `src/utils/` for reusable logic (e.g. pathfinder)
- Objects in `src/objects/`, scenes in `src/scenes/`
- Physics bodies sized to `PLAYER.BODY` dimensions (10×10) for maze navigation
- Anglerfish navigates via A* on water tiles only; player navigates via A* on all non-wall tiles
