# Nix Flake Commands Reference

The flake provides several convenient commands for building and running Avatar Forest.

## 🎯 Quick Commands

### (a) Build Ready-for-Distribution Output

```bash
# Build the game package
nix build

# Output is in: ./result/
# Contains: Built game + serve script
```

**What you get:**
- `result/index.html` - The game (and all assets)
- `result/bin/avatar-forest-serve` - Script to serve it

**To distribute:**
```bash
# Copy the built game
cp -r result/* ~/my-game/

# Or create a tarball
tar -czf avatar-forest.tar.gz -C result .

# Or zip it
cd result && zip -r ../avatar-forest.zip .
```

### (b) Run Directly (Build + Serve)

```bash
# Build and serve in one command
nix run

# Opens at http://localhost:8000
# Press Ctrl+C to stop
```

**This:**
1. Builds the entire game from scratch
2. Installs it to the Nix store
3. Serves it on http://localhost:8000

**Custom port:**
```bash
nix run . -- 3000
# Serves on http://localhost:3000
```

## 📋 All Available Flake Commands

### Build Commands

```bash
# Build the distribution package
nix build

# Build and show the output path
nix build --print-out-paths

# Build from a specific commit/ref
nix build github:yourusername/avatar-forest
```

### Run Commands

```bash
# Run the default app (serve the built game)
nix run
nix run .#default

# Run with explicit serve target
nix run .#serve

# Run development server (hot reload)
nix run .#dev
```

### Development Shell

```bash
# Enter dev environment
nix develop

# Run a single command in dev environment
nix develop --command npm run build

# Run shell with specific command
nix develop --command bash -c "npm install && npm run dev"
```

### Info Commands

```bash
# Show flake info
nix flake show

# Show flake metadata
nix flake metadata

# Check flake for issues
nix flake check
```

## 🔍 Detailed Command Breakdown

### `nix build`

**Purpose:** Build the game as a Nix package

**What it does:**
1. Creates isolated build environment
2. Installs Node.js dependencies
3. Generates placeholder assets (if needed)
4. Runs `npm run build`
5. Copies output to Nix store
6. Creates `result` symlink

**Output location:** `./result/` (symlink to `/nix/store/...`)

**Files in result:**
```
result/
├── index.html           # Game entry point
├── assets/              # Bundled JS and assets
│   ├── index.js
│   ├── maps/
│   ├── sprites/
│   └── tilesets/
└── bin/
    └── avatar-forest-serve  # Server script
```

**Usage:**
```bash
nix build

# Check what was built
ls -lh result/

# Run the built version
result/bin/avatar-forest-serve

# Or copy it somewhere
cp -r result/* /var/www/my-game/
```

### `nix run` (default)

**Purpose:** Build and immediately serve the game

**What it does:**
1. Runs `nix build` if not already built
2. Serves the game on http://localhost:8000
3. Uses Python's built-in HTTP server

**Usage:**
```bash
# Default port (8000)
nix run

# Custom port
nix run . -- 8080

# From GitHub (without cloning)
nix run github:yourusername/avatar-forest
```

**When to use:**
- Quick testing of production build
- Sharing on local network
- Verifying the build works

### `nix run .#dev`

**Purpose:** Run development server with hot reload

**What it does:**
1. Checks if you're in the project directory
2. Installs npm dependencies (if needed)
3. Generates assets (if needed)
4. Runs `npm run dev` (Vite dev server)

**Usage:**
```bash
# Must be in project directory
cd /path/to/AvatarForest
nix run .#dev

# Opens at http://localhost:3000 with hot reload
```

**When to use:**
- Active development
- Need hot reload (instant updates)
- Testing code changes

### `nix develop`

**Purpose:** Enter development environment shell

**What it includes:**
- Node.js 24
- npm
- Git
- ImageMagick
- TypeScript LSP

**Usage:**
```bash
# Enter the shell
nix develop

# Now you have access to all tools
node --version
npm --version
git --version
magick --version

# Run commands
npm install
npm run dev

# Exit the shell
exit
```

**When to use:**
- Manual development workflow
- Running multiple commands
- IDE integration (some IDEs can use nix develop)

## 🎮 Usage Examples

### Example 1: Quick Play

```bash
# Just want to play the game
nix run
# Opens browser to http://localhost:8000
```

### Example 2: Build for Distribution

```bash
# Build the game
nix build

# Create distributable archive
cd result
zip -r ../avatar-forest-v0.1.0.zip .
cd ..

# Upload avatar-forest-v0.1.0.zip to itch.io, GitHub releases, etc.
```

### Example 3: Development Workflow

```bash
# Enter dev environment
nix develop

# Install and run
npm install
npm run generate-assets
npm run dev

# Make changes, see them live at http://localhost:3000
```

### Example 4: Build on One Machine, Run on Another

```bash
# On build machine
nix build
tar -czf game.tar.gz -C result .

# Transfer game.tar.gz to another machine

# On other machine (with Nix)
tar -xzf game.tar.gz -C my-game
cd my-game
nix run nixpkgs#python3 -- -m http.server 8000
```

### Example 5: Test from GitHub (Without Cloning)

```bash
# Run someone else's fork without cloning
nix run github:username/avatar-forest

# Build it
nix build github:username/avatar-forest
```

## 🚀 CI/CD Integration

### GitHub Actions Example

```yaml
name: Build and Deploy

on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: cachix/install-nix-action@v22
      - run: nix build
      - run: cp -r result/* dist/
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

## 🔧 Advanced Usage

### Custom Build

```bash
# Build with verbose output
nix build -L

# Build without cache
nix build --rebuild

# Build and show build logs
nix build --print-build-logs
```

### Garbage Collection

```bash
# Clean old builds
nix-collect-garbage

# Clean everything older than 30 days
nix-collect-garbage --delete-older-than 30d

# See what would be deleted
nix-collect-garbage --dry-run
```

## 📊 Comparison

| Command | Purpose | Build Time | Output | Hot Reload |
|---------|---------|------------|--------|------------|
| `nix build` | Distribution | ~1-2 min | `./result/` | ❌ |
| `nix run` | Quick play | ~1-2 min | Served | ❌ |
| `nix run .#dev` | Development | ~30 sec | Served | ✅ |
| `nix develop` | Manual dev | Instant | Shell | N/A |

## 💡 Tips

- **First build is slow** (~2 min) - subsequent builds use cache
- **Use `nix run .#dev`** for development (much faster)
- **Use `nix run`** to test production builds
- **Use `nix build`** when you need the files (for deployment)
- **The result is cached** in `/nix/store` - rebuilding is fast if nothing changed

## 🆘 Troubleshooting

### "error: Git tree is dirty"

Just a warning - the build still works. To silence:
```bash
git add -A && git commit -m "Update"
```

### "error: builder failed"

Check the full build log:
```bash
nix build -L
```

### Build is stuck/slow

First build downloads dependencies - can take 1-2 minutes. Use:
```bash
nix build -L  # Show live progress
```

### "nix: command not found"

Install Nix:
```bash
curl -L https://nixos.org/nix/install | sh
```

---

**Summary:** Use `nix build` for distribution, `nix run` to play/test!
