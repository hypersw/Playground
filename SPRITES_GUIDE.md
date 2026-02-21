# Sprite Setup Guide - Beaver Character

## 🦫 Current Sprite: Beaver

The game now uses a **beaver sprite** as the main character!

**Source:** [OpenGameArt.org - Beaver by bleutailfly](https://opengameart.org/content/beaver)

**Details:**
- **Dimensions:** 32×32 pixels per frame
- **Animation:** 3 frames per direction
- **Directions:** South, West, East, North (SWEN format)
- **License:** CC BY-SA 3.0 / 4.0 (requires attribution)
- **Creator:** bleutailfly (for Stendhal game)

## 📁 File Locations

```
public/assets/sprites/
├── beaver.png          ← Beaver sprite (current)
├── player.png          ← Placeholder sprite (colored squares)
└── ATTRIBUTION.txt     ← License & credit info
```

## 🎮 How It's Set Up

### 1. Preloader (src/scenes/PreloaderScene.ts)

```typescript
// Loads the beaver sprite
this.load.spritesheet('beaver', 'assets/sprites/beaver.png', {
  frameWidth: 32,
  frameHeight: 32,
});
```

### 2. Player Class (src/objects/Player.ts)

```typescript
// Uses 'beaver' as the texture
super(scene, x, y, 'beaver');

// Animation frame mapping:
// Frames 0-2:  Walk down (South)
// Frames 3-5:  Walk left (West)
// Frames 6-8:  Walk right (East)
// Frames 9-11: Walk up (North)
```

## 🔄 Switching to a Different Sprite

Want to use a different character? Here's how:

### Option 1: Replace the Beaver Image

1. Get a new sprite sheet (32×32 frames, same layout)
2. Replace `public/assets/sprites/beaver.png`
3. Update attribution in `ATTRIBUTION.txt`
4. Rebuild: `nix develop --command npm run build`

### Option 2: Add a New Character

1. Add new sprite to `public/assets/sprites/`, e.g., `cat.png`

2. Load it in `PreloaderScene.ts`:
   ```typescript
   this.load.spritesheet('cat', 'assets/sprites/cat.png', {
     frameWidth: 32,
     frameHeight: 32,
   });
   ```

3. Change Player constructor in `src/objects/Player.ts`:
   ```typescript
   super(scene, x, y, 'cat'); // Change 'beaver' to 'cat'
   ```

4. Update animations if frame layout differs

### Option 3: Back to Placeholder

To revert to the simple colored squares:

```typescript
// In src/objects/Player.ts constructor:
super(scene, x, y, 'player'); // Change 'beaver' back to 'player'
```

## 📐 Sprite Sheet Format

The beaver uses **SWEN format** (RPG Maker style):

```
Row 0: [S0] [S1] [S2]    ← South (Down)
Row 1: [W0] [W1] [W2]    ← West (Left)
Row 2: [E0] [E1] [E2]    ← East (Right)
Row 3: [N0] [N1] [N2]    ← North (Up)
```

**Total:** 3 columns × 4 rows = 12 frames

## 🎨 Finding More Sprites

### CC0/Free Sources

1. **Kenney.nl/assets** - Tons of game sprites (CC0)
   - Good for: Modern, clean pixel art
   - Search: "top down", "character"

2. **OpenGameArt.org** - Community-submitted (various licenses)
   - Good for: Unique characters, themed sets
   - Filter: CC0, CC BY, or CC BY-SA
   - Our beaver: https://opengameart.org/content/beaver

3. **itch.io** - Game assets marketplace
   - Filter: Free, CC0, Pixel Art
   - Many top-down character packs

### What to Look For

✅ **Top-down perspective** (not side-view)
✅ **4 directions** (up, down, left, right)
✅ **32×32 or 16×16** tiles (easiest to work with)
✅ **Walk animations** (3-4 frames per direction)
✅ **Free license** (CC0, CC BY, CC BY-SA)

## 🔧 Adjusting Collision Box

Different sprites need different collision sizes. In `Player.ts`:

```typescript
// Adjust these values based on your sprite
this.body!.setSize(20, 24);    // Collision box size
this.body!.setOffset(6, 8);    // Offset from top-left
```

**Tips:**
- Enable physics debug: `debug: true` in `gameConfig.ts`
- You'll see the collision box in red
- Adjust until it matches the character's body

## ⚖️ License Compliance

**Important:** The beaver sprite is **CC BY-SA**, which requires:

1. ✅ **Attribution** - Credit bleutailfly (done in ATTRIBUTION.txt and UI)
2. ✅ **Share-Alike** - If you modify and distribute, use same license
3. ✅ **Indicate Changes** - Note if you edited the sprite

Already complied with:
- Attribution in `public/assets/sprites/ATTRIBUTION.txt`
- Credit shown in game UI
- Original README preserved

If you distribute this game, keep the attribution!

## 🎭 Animation Speed

Adjust animation speed in `Player.ts`:

```typescript
scene.anims.create({
  key: 'walk-down',
  frames: scene.anims.generateFrameNumbers('beaver', { start: 0, end: 2 }),
  frameRate: 6,  // ← Change this (lower = slower, higher = faster)
  repeat: -1,
});
```

**Current:** `frameRate: 6` (normal walk speed)
**Suggestions:**
- `4` - Slow walk
- `6` - Normal walk (current)
- `8` - Fast walk
- `10` - Running

## 📊 Comparison: Beaver vs Placeholder

| Feature | Beaver | Placeholder |
|---------|--------|-------------|
| **File** | `beaver.png` | `player.png` |
| **Frames** | 12 (3 per direction) | 16 (4 per direction) |
| **Size** | 96×128 px (32×32 tiles) | 128×128 px |
| **License** | CC BY-SA 3.0/4.0 | None (generated) |
| **Quality** | Professional art | Simple colors |
| **Animation** | Smooth 3-frame walk | Basic 4-frame |

## 🚀 Quick Test

After changing sprites:

```bash
# Development mode (hot reload)
nix run .#dev

# Production build
nix build
./serve.sh
```

Open http://localhost:3000 (dev) or http://localhost:8000 (prod) and move around!

---

**Now you have a cute beaver to control!** 🦫✨

## Sources

- [Beaver Sprite on OpenGameArt](https://opengameart.org/content/beaver)
- [CC BY-SA 3.0 License](https://creativecommons.org/licenses/by-sa/3.0/)
