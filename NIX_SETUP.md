# Nix Setup Guide for Avatar Forest

This project uses **Nix flakes** to provide a reproducible development environment.

## ✅ What's Included

The Nix flake (`flake.nix`) provides:
- **Node.js 24** with npm
- **Git** for version control
- **ImageMagick** for asset generation
- **TypeScript** and **typescript-language-server** for IDE support

## 🚀 Quick Start (3 Ways)

### Option 1: One-Command Run (Recommended)

```bash
./run.sh
```

This script automatically:
1. Enters the Nix development environment
2. Installs npm dependencies
3. Generates placeholder assets
4. Starts the dev server

### Option 2: Manual Nix Shell

```bash
# Enter the Nix development environment
nix develop

# Now run commands normally
npm install
npm run generate-assets
npm run dev
```

### Option 3: One-Off Commands

```bash
# Run commands without entering the shell
nix develop --command npm install
nix develop --command npm run dev
```

## 📁 Project Structure

```
AvatarForest/
├── flake.nix           # Nix flake definition (dev environment)
├── flake.lock          # Locked dependency versions
├── .envrc              # direnv integration (optional)
├── run.sh              # Automatic setup + run script
├── index.html          # Vite entry point (root)
├── public/assets/      # Game assets (images, maps)
├── src/                # TypeScript source code
├── dist/               # Production build output
└── node_modules/       # npm dependencies (gitignored)
```

## 🔧 Available npm Scripts

Inside the Nix shell (or via `nix develop --command`):

```bash
npm run dev              # Start dev server (http://localhost:3000)
npm run build            # Build for production (outputs to dist/)
npm run preview          # Preview production build
npm run generate-assets  # Create placeholder PNG assets
```

## 🎯 Build for Production

```bash
nix develop --command bash -c "npm run build"

# Output is in dist/ - ready to deploy!
ls -lh dist/
```

## 🧪 Using direnv (Optional)

If you have [direnv](https://direnv.net/) installed:

```bash
# Allow the .envrc file
direnv allow

# Now the Nix environment loads automatically when you cd into the project
cd AvatarForest  # Environment loads automatically!
npm run dev      # Works without nix develop
```

## 🐛 Troubleshooting

### "error: Git tree is dirty"

This is just a warning - the flake works fine. To silence it:
```bash
git add -A && git commit -m "Update"
```

### "Could not resolve entry module"

Make sure `index.html` is at the project root (not in `public/`).

### Assets not loading

Run the asset generator:
```bash
nix develop --command npm run generate-assets
```

Or manually place assets in `public/assets/`.

### npm install fails

Make sure you're in the Nix shell:
```bash
nix develop
npm install
```

## 📦 What Gets Installed

The flake installs these packages from nixpkgs:
- `nodejs_24` - Node.js v24.x with npm
- `git` - Version control (required by flakes)
- `imagemagick` - Image generation for placeholder assets
- `nodePackages.typescript` - TypeScript compiler
- `nodePackages.typescript-language-server` - LSP for IDEs

npm dependencies (from `package.json`):
- `phaser` - Game engine
- `vite` - Dev server and bundler
- `typescript` - Type checking

## 🔒 Reproducibility

The `flake.lock` file pins exact versions of all Nix dependencies. This ensures:
- Same Node.js version for all developers
- Same tool versions across machines
- Reproducible builds

To update dependencies:
```bash
nix flake update
```

## 💡 Tips

- **VSCode/IDEs**: Install the Nix extension for editor integration
- **CI/CD**: Use `nix develop --command` to run builds in CI
- **Docker**: Can export the Nix environment to Docker if needed

## 📚 Learn More

- **Nix Flakes**: https://nixos.wiki/wiki/Flakes
- **Nix Language**: https://nixos.org/manual/nix/stable/language/
- **direnv**: https://direnv.net/

---

**Questions?** Check the main [README.md](README.md) or [HOW_TO_RUN.md](HOW_TO_RUN.md)
