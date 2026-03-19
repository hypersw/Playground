# Avatar Forest - Design Document

## Game Concept

A 2D top-down exploration game where a beaver character explores a world, collects resources, and interacts with the environment.

## Design Decisions & Rationale

### Character Design

**Decision:** Use a beaver as the main character
- **Rationale:** Beavers are associated with water and logs, creating a natural thematic connection
- **Sprite:** Beaver sprite by bleutailfly (CC BY-SA 3.0/4.0)
- **Animation:** 3 frames per direction (South, West, East, North)
- **Movement:** 4-directional with WASD + Arrow key support

**Decision:** Keep last facing direction when idle
- **Rationale:** More natural behavior - characters don't randomly turn when they stop moving
- **Implementation:** Track lastDirection state, use directional idle animations

### Environmental Effects

**Decision:** Water ripple effects on blue tiles
- **Rationale:** Adds visual feedback and life to the environment, shows water is interactive
- **Design:**
  - Outlined circles (no fill) - looks like water waves, not smoke
  - Thin lines (0.4px) - subtle and not distracting
  - Spawns every 100ms during movement - frequent enough to be visible
  - Expands slowly (900ms, 4x scale) - natural wave propagation
  - Clipped to water tiles only - respects tile boundaries
  - Positioned at character's feet - shows where contact happens
  - Depth 5 (above ground, below player) - correct layering
- **Color:** White (#ffffff, 80% opacity) for visibility on blue water

### Resource Collection System

**Decision:** Floating log collectibles
- **Rationale:** Beavers collect wood in nature, creates core gameplay loop
- **Sprite:** Wood log sprite by Redfill Production (CC BY-SA 3.0/4.0)
- **Spawn Mechanics:**
  - Periodic spawning every 3 seconds
  - Maximum 10 logs active at once (prevents overcrowding)
  - Only spawns on water tiles (thematically appropriate)
  - Minimum 5 tiles away from player (prevents instant collection)
  - Appears with ripple effects (visual feedback of "surfacing")
  - Slight swaying animation (shows they're floating)
- **Collection:**
  - Contact-based (overlap detection)
  - Grants 3 points per log (arbitrary but balanced for early game)
  - Visual feedback: ripples + counter update
  - Logs move toward beaver during collection (magnetic pull effect)
  - Tracks real-time beaver position (follows if moving)
  - Renders below beaver depth (goes "under" when collected)

### Hostile NPCs

**Decision:** Anglerfish as predator
- **Rationale:** Creates challenge and tension, encourages strategic movement
- **Sprite:** Deep-sea creature by pixel_emm (CC BY-SA 4.0)
- **Behavior:**
  - AI-driven chase behavior (pursues player)
  - Speed: 75% of player speed (catchable but escapable)
  - Creates red ripples when swimming (visual threat indicator)
  - Collides with terrain (can't phase through walls)
- **Combat Mechanics:**
  - Contact causes "hit" status for 3 seconds
  - During hit: beaver's ripples turn red (visual feedback)
  - No health/damage system (status effect only)
  - Can be hit multiple times with cooldown
- **Design Philosophy:**
  - Depth 8 (same as logs, below player) - goes under beaver sprite
  - Adds risk/reward to log collection
  - Creates dynamic gameplay situations

## Technical Architecture

### Scene Structure

1. **PreloaderScene** - Loads all assets
2. **WorldScene** - Main game world, handles:
   - Map rendering
   - Player movement
   - Environmental effects (ripples)
   - Collectible spawning and collection
3. **UIScene** - Overlay for HUD elements:
   - Game title
   - Controls hint
   - Attribution text
   - Score/resource counter

### Constants Management

**Decision:** Centralized constants file
- **Rationale:** Makes balancing easy, keeps magic numbers out of code, documents all tunable values
- **File:** `src/config/constants.ts`
- **Categories:** Player, Environment, Collectibles, UI

### Depth Layering

```
Layer 0:  Ground tiles
Layer 5:  Environmental effects (ripples)
Layer 10: Player character
Layer 20: Collectibles (above player for visibility)
Layer 100: UI elements
```

## Game Balance

### Resource Values

- **Log Collection:** +3 points per log
  - **Rationale:** Small increments encourage collection, low enough to require multiple logs for progression

### Spawn Rates

- **Log Spawn Interval:** 3 seconds
  - **Rationale:** Frequent enough to keep player engaged, slow enough to not overwhelm
- **Max Active Logs:** 10
  - **Rationale:** Prevents screen clutter while ensuring availability

### Movement

- **Player Speed:** 160 pixels/second
  - **Rationale:** Balanced for 16×16 tile grid, feels responsive but not too fast
- **Ripple Spawn Rate:** Every 100ms during water movement
  - **Rationale:** Visible effect without performance impact

## Art Style

### Pixel Art Guidelines

- **Tile Size:** 16×16 pixels
- **Sprite Size:** 32×32 pixels for characters
- **Color Palette:**
  - Water: Blue (#4a90e2)
  - Grass/Ground: Green variants
  - Walls: Gray
  - Effects: White with transparency
- **Animation:** Low frame count (3 frames) for authentic pixel art feel

### Visual Feedback

**Principle:** Every player action should have visual feedback
- Movement on water → Ripples
- Log collection → Ripple burst + counter update
- Idle state → Directional facing maintained

## Future Expansion Points

### Potential Features

1. **More Collectibles**: Sticks, stones, fish
2. **Crafting System**: Combine resources to build structures
3. **NPCs**: Other animals to interact with
4. **Quests**: Task-based progression
5. **Multiple Biomes**: Forest, pond, river areas
6. **Day/Night Cycle**: Visual variety and time-based events
7. **Inventory System**: Store collected resources
8. **Building Mechanic**: Construct beaver dams

### Technical Improvements

1. **Object Pooling**: Reuse ripple/collectible objects for performance
2. **Particle System**: More sophisticated effects
3. **Sound Effects**: Audio feedback for actions
4. **Music**: Background ambience
5. **Save System**: Persist player progress
6. **Procedural Generation**: Random map layouts

## Performance Considerations

### Optimization Strategies

1. **Ripple Lifecycle**: 900ms lifespan, destroyed after animation
2. **Spawn Throttling**: 100ms minimum between ripples
3. **Max Limits**: 10 logs max prevents unlimited spawning
4. **Geometry Masking**: Efficient tile-based clipping
5. **Depth Management**: Proper layering reduces overdraw

### Target Performance

- **Frame Rate:** 60 FPS target
- **Resolution:** 800×600 base, scalable
- **Platform:** Modern browsers (ES2020+)

## Accessibility

### Current Features

- Dual input support (WASD + Arrows)
- Clear visual feedback
- No time pressure mechanics
- Adjustable game speed (via constants)

### Future Considerations

- Colorblind mode options
- Adjustable UI scale
- Keyboard-only play (no mouse required)
- Screen reader support for UI

## License & Attribution

### Assets Used

1. **Beaver Sprite**
   - Creator: bleutailfly (for Stendhal game)
   - License: CC BY-SA 3.0 / 4.0
   - Source: https://opengameart.org/content/beaver

2. **Log Sprite**
   - Creator: Redfill Production
   - License: CC BY-SA 3.0 / 4.0
   - Source: https://opengameart.org/content/wood-log-pixel-art

3. **Tileset**
   - Placeholder (generated via ImageMagick)
   - License: None (generated)

### Code License

- MIT License (permissive)

## Version History

- **v0.1.0** - Initial boilerplate with beaver character
- **v0.2.0** - Added water ripple effects
- **v0.3.0** - Added log collection system (current)

---

**Last Updated:** 2026-02-21
**Maintainer:** Avatar Forest Team
