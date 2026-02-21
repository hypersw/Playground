# Proper Nix Setup Explained

This project now uses **proper Nix dependency management** with `buildNpmPackage`.

## What Changed

### ❌ Before (Hybrid Approach)
```nix
mkDerivation {
  buildPhase = ''
    npm ci  # Downloads from npm during build (impure!)
    npm run build
  '';
}
```

**Problems:**
- Downloads from internet during build
- Not reproducible (npm registry can change)
- Not cached properly by Nix
- Impure builds

### ✅ After (Proper Nix Approach)
```nix
buildNpmPackage {
  npmDepsHash = "sha256-...";  # Locks dependencies

  buildPhase = ''
    npm run build  # Uses pre-fetched deps from Nix store
  '';
}
```

**Benefits:**
- ✅ **Reproducible** - Same inputs = same output hash
- ✅ **Cached** - Nix stores dependencies permanently
- ✅ **Offline** - No internet access during build
- ✅ **Stateless** - No environment assumptions
- ✅ **Pure** - Build only depends on declared inputs

## How It Works

### 1. Dependency Locking

```nix
npmDepsHash = "sha256-LtAMjWFvIrHM7J74IaO8UuWEtuT2QBDPdddpXafgFas=";
```

This hash represents **all npm dependencies** from `package-lock.json`. Nix:
1. Fetches all npm packages
2. Stores them in `/nix/store/...`
3. Verifies hash matches
4. Reuses cached version on subsequent builds

### 2. Build Process

```bash
nix build
```

**What happens:**
1. Nix checks if output exists in store (by hash)
2. If yes: instant (already built!)
3. If no:
   - Fetches npm deps (uses cache if available)
   - Runs build in isolated environment
   - No network access during build
   - Stores result in `/nix/store/...`

### 3. Result

```bash
$ ls -l result
lrwxrwxrwx result -> /nix/store/2ybcj4r53c3a7b4s8qryagllydkvwwci-avatar-forest-0.1.0
```

The `result` symlink points to the **immutable build output** in the Nix store.

## Updating Dependencies

### When you change `package.json`:

```bash
# 1. Update package.json
vim package.json

# 2. Update lockfile
npm install  # Updates package-lock.json

# 3. Get new hash
nix build  # Will fail with wrong hash

# 4. Update flake.nix with correct hash from error message
vim flake.nix  # Update npmDepsHash

# 5. Build again
nix build  # Success!
```

### Automated Hash Update

You can use `lib.fakeHash` to get the correct hash:

```nix
npmDepsHash = pkgs.lib.fakeHash;  # Will fail with correct hash
```

## Development Workflow

### For Development (Still Manual)

```bash
nix develop
npm install  # Manual install is fine for development
npm run dev
```

**Why manual in dev?**
- Fast iteration (add/remove packages quickly)
- No rebuild needed when experimenting
- Hot reload works normally
- Standard npm workflow

**This is normal!** Even Nix projects use manual npm during development.

### For Production (Fully Managed)

```bash
nix build  # Fully reproducible, locked dependencies
nix run    # Serve the built game
```

## Comparison

| Aspect | Old (mkDerivation) | New (buildNpmPackage) |
|--------|-------------------|----------------------|
| **Reproducibility** | ❌ Depends on npm registry | ✅ Fully reproducible |
| **Network** | ❌ Downloads during build | ✅ Offline builds |
| **Caching** | ⚠️ Basic | ✅ Full Nix caching |
| **Speed** | 🐌 Downloads every time | ⚡ Instant if cached |
| **Purity** | ❌ Impure | ✅ Pure builds |
| **Dependencies** | ❌ Fetched at build time | ✅ Pre-fetched and locked |

## Benefits for You

### 1. Reproducible Builds

```bash
# Build on Machine A
nix build
# Hash: 2ybcj4r53c3a7b4s8qryagllydkvwwci

# Build on Machine B (same hash!)
nix build
# Hash: 2ybcj4r53c3a7b4s8qryagllydkvwwci
```

**Same inputs = same outputs, always.**

### 2. Build Caching

```bash
# First build: ~10 seconds
nix build

# Change a TypeScript file
vim src/objects/Player.ts

# Rebuild: instant! (deps cached)
nix build
```

Nix only rebuilds what changed.

### 3. CI/CD

```yaml
# GitHub Actions
- name: Build
  run: nix build
  # Nix handles all dependencies
  # No npm install needed
  # Fully reproducible
```

### 4. Binary Caching

```bash
# Push to cache
nix build --json | jq -r '.[].outputs.out' | cachix push mycache

# Pull from cache (another machine)
nix build  # Instant download, no rebuild!
```

## What About node_modules?

### During Build

```
/nix/store/.../node_modules/
├── phaser/
├── vite/
├── typescript/
└── ...
```

**Managed by Nix**, not npm. Immutable, cached, shared.

### During Development

```
./node_modules/  # Regular npm install
```

**Managed by npm**, mutable, local. Normal development workflow.

## Advanced: How npmDepsHash Works

### 1. Nix reads package-lock.json

```json
{
  "packages": {
    "node_modules/phaser": {
      "version": "3.80.1",
      "resolved": "https://registry.npmjs.org/phaser/-/phaser-3.80.1.tgz",
      "integrity": "sha512-..."
    }
  }
}
```

### 2. Nix fetches all packages

```bash
# Nix runs internally:
for package in package-lock.json; do
  fetch $package.resolved
  verify $package.integrity
done
```

### 3. Nix computes hash

```bash
sha256sum node_modules/**/*
# Result: sha256-LtAMjWFvIrHM7J74IaO8UuWEtuT2QBDPdddpXafgFas=
```

### 4. Stores in Nix store

```
/nix/store/abc123.../node_modules/
```

### 5. Build uses this

```bash
ln -s /nix/store/abc123.../node_modules ./node_modules
npm run build  # Uses Nix-managed deps
```

## Troubleshooting

### Hash Mismatch

**Error:**
```
error: hash mismatch in fixed-output derivation
  specified: sha256-OLD_HASH
       got: sha256-NEW_HASH
```

**Solution:**
Update `npmDepsHash` in `flake.nix` to the "got" value.

### Build Fails

**Check:**
1. Is `package-lock.json` committed?
2. Did you run `npm install` after changing `package.json`?
3. Are all dependencies compatible?

### Slow First Build

**Normal!** First build:
- Fetches all npm packages
- Builds from scratch
- Stores in Nix cache

**Subsequent builds:** Instant (cached).

## Summary

This is now a **proper Nix project**:
- ✅ Stateless dependency management
- ✅ No environment assumptions
- ✅ Fully reproducible builds
- ✅ Offline-capable
- ✅ Properly cached
- ✅ Standard Nix patterns

**The Nix way!** 🎉
