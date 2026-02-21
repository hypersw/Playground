# Nix-Powered Scripts - No System Dependencies Needed!

All scripts in this project use **Nix shebangs** to provide dependencies automatically. You don't need Python, Node.js, or ImageMagick installed on your system - Nix handles everything!

## 🎯 Available Scripts

### `./run.sh` - Complete Development Setup

**What it does:**
1. Provides Node.js 24 and ImageMagick via Nix
2. Installs npm dependencies
3. Generates placeholder assets
4. Starts dev server on http://localhost:3000

**Usage:**
```bash
./run.sh
```

**First run:** Takes ~30 seconds (installs dependencies)
**Subsequent runs:** Instant (uses cache)

**No need for:**
- ❌ Node.js installed
- ❌ npm installed
- ❌ ImageMagick installed

Nix provides them all automatically!

---

### `./serve.sh` - Serve Built Game

**What it does:**
1. Provides Python 3 via Nix
2. Serves the `dist/` folder on http://localhost:8000

**Usage:**
```bash
# First build the game
nix build
# OR
npm run build

# Then serve it
./serve.sh

# Custom port
./serve.sh 3000
```

**No need for:**
- ❌ Python installed
- ❌ http-server installed

Nix provides Python automatically!

---

## 🔍 How It Works

### The Nix Shebang Magic

Traditional script:
```bash
#!/usr/bin/env bash
# Requires: python3, node, etc installed on system
```

Nix-powered script:
```bash
#!/usr/bin/env nix-shell
#! nix-shell -i bash -p python3 nodejs_24
# Nix provides python3 and nodejs automatically!
```

### Benefits

✅ **No system dependencies** - Nix provides everything
✅ **Reproducible** - Same versions across all machines
✅ **Isolated** - Doesn't pollute your system
✅ **Declarative** - Dependencies listed in the script

## 📋 Script Comparison

| Script | Provides | Purpose | Port |
|--------|----------|---------|------|
| `./run.sh` | Node.js + ImageMagick | Dev server | 3000 |
| `./serve.sh` | Python 3 | Serve build | 8000 |
| `scripts/generate-placeholder-assets.sh` | ImageMagick | Create assets | N/A |

## 🚀 Quick Workflows

### Development

```bash
# One command - everything automated
./run.sh
```

Nix provides: Node.js, npm, ImageMagick
Opens: http://localhost:3000

### Testing Production Build

```bash
# Build (if not already built)
nix develop --command npm run build

# Serve
./serve.sh
```

Nix provides: Python 3
Opens: http://localhost:8000

### From Scratch (No Dependencies)

```bash
# Just clone and run - Nix handles the rest!
git clone https://github.com/yourusername/avatar-forest
cd avatar-forest
./run.sh
```

## 🛠️ Script Internals

### `run.sh` Shebang

```bash
#!/usr/bin/env nix-shell
#! nix-shell -i bash -p nodejs_24 imagemagick
```

**Means:**
- Run with `bash` interpreter
- Provide `nodejs_24` package (Node.js v24)
- Provide `imagemagick` package

### `serve.sh` Shebang

```bash
#!/usr/bin/env nix-shell
#! nix-shell -i bash -p python3
```

**Means:**
- Run with `bash` interpreter
- Provide `python3` package

## 💡 Advanced: Custom Scripts

You can create your own Nix-powered scripts!

**Example: Deploy Script**

```bash
#!/usr/bin/env nix-shell
#! nix-shell -i bash -p nodejs_24 rsync openssh

# Build the game
npm run build

# Deploy via rsync
rsync -avz dist/ user@server:/var/www/game/
```

**Example: Asset Processing Script**

```bash
#!/usr/bin/env nix-shell
#! nix-shell -i bash -p imagemagick pngquant

# Optimize all PNGs
find public/assets -name "*.png" -exec pngquant --force --ext .png {} \;
```

## 🔧 Troubleshooting

### "nix-shell: command not found"

**Solution:** Install Nix:
```bash
curl -L https://nixos.org/nix/install | sh
```

### Scripts are slow the first time

**Why:** Nix downloads packages on first run
**Solution:** Just wait - subsequent runs are instant (cached)

### "permission denied"

**Solution:** Make scripts executable:
```bash
chmod +x run.sh serve.sh
```

## 📚 Learn More

- **Nix Shebangs**: https://nixos.wiki/wiki/Nix-shell_shebang
- **Nix Packages**: https://search.nixos.org/packages
- **Nix Pills**: https://nixos.org/guides/nix-pills/

---

**TL;DR:** All scripts use Nix - just run them! No system dependencies needed. 🎉
