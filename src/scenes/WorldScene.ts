import Phaser from 'phaser';
import { Player } from '../objects/Player';
import { Log } from '../objects/Log';
import { Anglerfish } from '../objects/Anglerfish';
import { Mouse } from '../objects/Mouse';
import { Cat } from '../objects/Cat';
import { PLAYER, WATER, CAMERA, DEPTHS, ANGLERFISH, LIVES, TOUCH, SHOP, LOGS } from '../config/constants';
import { LEVELS, STARTING_LEVEL } from '../config/levels';
import type { LevelDef, PortalDef } from '../config/levels';
import { findPath } from '../utils/pathfinder';

/** Data passed between levels via scene.start() */
export interface LevelTransition {
  level: number;
  score: number;
  lives: number;
  /** The level the player is coming from (used to find the arrival portal) */
  fromLevel?: number;
}

interface PortalState {
  def: PortalDef;
  open: boolean;
  gfx: Phaser.GameObjects.Graphics;
  pulseTween: Phaser.Tweens.Tween | null;
  priceTag: Phaser.GameObjects.Text;
  zone: Phaser.GameObjects.Zone;
}

export class WorldScene extends Phaser.Scene {
  public player!: Player;
  private anglerfishList: Anglerfish[] = [];
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private map!: Phaser.Tilemaps.Tilemap;
  private groundLayer!: Phaser.Tilemaps.TilemapLayer | null;
  /** Collision layer for grass-only entities (mice/cats): blocks walls + water */
  private grassCollisionLayer: Phaser.Tilemaps.TilemapLayer | null = null;
  private lastRippleTime: number = 0;
  private logs!: Phaser.Physics.Arcade.Group;
  private mice: Mouse[] = [];
  private cats: Cat[] = [];
  public score: number = 0;

  // Level config
  private levelDef!: LevelDef;
  public currentLevel: number = STARTING_LEVEL;

  // Lives / immunity / game state
  public lives: number = LIVES.INITIAL;
  private isImmune: boolean = false;
  private immuneEndTime: number = 0;
  private isHit: boolean = false;
  private hitEndTime: number = 0;
  public isGameOver: boolean = false;
  public isShopOpen: boolean = false;

  // Noclip
  public noclip: boolean = false;
  private wallCollider: Phaser.Physics.Arcade.Collider | null = null;

  // Debug visualization
  public debugDraw: boolean = false;
  private debugGfx: Phaser.GameObjects.Graphics | null = null;

  // Level transition: which level the player arrived from
  private arrivedFromLevel: number | undefined = undefined;
  // Portal the player spawned on — stays "closed" until they walk away
  private arrivalPortalState: PortalState | null = null;
  private spawnedAtPortalDef: PortalDef | null = null;

  // Portals
  private portalStates: PortalState[] = [];

  // -------------------------------------------------------------------------
  // Touch / pointer input
  // -------------------------------------------------------------------------
  private playerWalkable: boolean[][] | null = null;
  private playerPath: Array<{ x: number; y: number }> = [];

  private joystickActive = false;
  private joystickDelta = { x: 0, y: 0 };
  private joystickRadius = 100;
  private joystickOuter!: Phaser.GameObjects.Graphics;
  private joystickInner!: Phaser.GameObjects.Graphics;

  private ptrDownX = 0;
  private ptrDownY = 0;
  private holdTimer: Phaser.Time.TimerEvent | null = null;

  // -------------------------------------------------------------------------

  constructor() {
    super({ key: 'WorldScene' });
  }

  init(data?: Partial<LevelTransition>): void {
    this.currentLevel = data?.level ?? STARTING_LEVEL;
    this.score = data?.score ?? 0;

    const def = LEVELS.get(this.currentLevel);
    if (!def) {
      console.error(`No level definition for level ${this.currentLevel}`);
      this.levelDef = LEVELS.get(STARTING_LEVEL)!;
    } else {
      this.levelDef = def;
    }

    // Lives: use carry-over if provided, else level default, else global default
    if (data?.lives !== undefined) {
      this.lives = data.lives;
    } else if (this.levelDef.startingLives !== null) {
      this.lives = this.levelDef.startingLives;
    } else {
      this.lives = LIVES.INITIAL;
    }

    // Track arrival source for portal spawning
    this.arrivedFromLevel = data?.fromLevel;

    // Reset per-scene state
    this.anglerfishList = [];
    this.mice = [];
    this.cats = [];
    this.portalStates = [];
    this.isImmune = false;
    this.isHit = false;
    this.isGameOver = false;
    this.isShopOpen = false;
    this.noclip = false;
    this.debugDraw = false;
    this.debugGfx = null;
    this.wallCollider = null;
    this.grassCollisionLayer = null;
    this.playerWalkable = null;
    this.playerPath = [];
    this.arrivalPortalState = null;
    this.joystickActive = false;
    this.lastRippleTime = 0;
  }

  create(): void {
    this.map = this.make.tilemap({ key: this.levelDef.mapKey });
    const tileset = this.map.addTilesetImage('tileset', 'tileset');

    if (!tileset) {
      console.error('Tileset not found.');
      return;
    }

    this.groundLayer = this.map.createLayer('Ground', tileset, 0, 0);
    if (this.groundLayer) this.groundLayer.setDepth(DEPTHS.GROUND);

    if (this.groundLayer) {
      this.groundLayer.setCollision([1]);
    }

    // Runtime fish-only collision layer (walls + grass collidable, water not)
    let fishLayer: Phaser.Tilemaps.TilemapLayer | null = null;
    if (this.groundLayer && this.levelDef.anglerfish.seaBounds.length > 0) {
      const tileData: number[][] = [];
      for (let row = 0; row < this.map.height; row++) {
        const rowArr: number[] = [];
        for (let col = 0; col < this.map.width; col++) {
          const tile = this.groundLayer.getTileAt(col, row);
          rowArr.push(tile ? tile.index : -1);
        }
        tileData.push(rowArr);
      }

      const fishMap = this.make.tilemap({
        data: tileData,
        tileWidth: this.map.tileWidth,
        tileHeight: this.map.tileHeight,
      });
      const fishTileset = fishMap.addTilesetImage('tileset', 'tileset');
      if (fishTileset) {
        fishLayer = fishMap.createLayer(0, fishTileset, 0, 0);
        if (fishLayer) {
          fishLayer.setVisible(false);
          fishLayer.setCollisionByExclusion([-1, WATER.TILE_INDEX]);
        }
      }
    }

    // Grass-only collision layer for mice/cats: blocks walls (1) + water (4)
    if (this.groundLayer && (this.levelDef.mice || this.levelDef.cats)) {
      const tileData: number[][] = [];
      for (let row = 0; row < this.map.height; row++) {
        const rowArr: number[] = [];
        for (let col = 0; col < this.map.width; col++) {
          const tile = this.groundLayer.getTileAt(col, row);
          rowArr.push(tile ? tile.index : -1);
        }
        tileData.push(rowArr);
      }
      const grassMap = this.make.tilemap({
        data: tileData,
        tileWidth: this.map.tileWidth,
        tileHeight: this.map.tileHeight,
      });
      const grassTileset = grassMap.addTilesetImage('tileset', 'tileset');
      if (grassTileset) {
        this.grassCollisionLayer = grassMap.createLayer(0, grassTileset, 0, 0);
        if (this.grassCollisionLayer) {
          this.grassCollisionLayer.setVisible(false);
          // Only grass (2) and portal (3) tiles are walkable
          this.grassCollisionLayer.setCollisionByExclusion([-1, 2, 3]);
        }
      }
    }

    // Player spawn — prefer the portal that links back to the source level
    let playerX = PLAYER.START_X;
    let playerY = PLAYER.START_Y;
    let spawnedAtPortal = false;

    if (this.arrivedFromLevel !== undefined) {
      const arrivalPortal = this.levelDef.portals.find(
        p => p.targetLevel === this.arrivedFromLevel
      );
      if (arrivalPortal) {
        const tileSize = this.map.tileWidth;
        playerX = arrivalPortal.col * tileSize + tileSize / 2;
        playerY = arrivalPortal.row * tileSize + tileSize / 2;
        spawnedAtPortal = true;
      }
    }

    // Fallback to spawn region if no arrival portal matched
    if (!spawnedAtPortal && this.groundLayer) {
      const spawnTiles: Phaser.Tilemaps.Tile[] = [];
      const { minCol, maxCol, minRow, maxRow } = this.levelDef.spawnRegion;
      for (let y = minRow; y <= maxRow; y++) {
        for (let x = minCol; x <= maxCol; x++) {
          const tile = this.groundLayer.getTileAt(x, y);
          if (tile && tile.index === 2) spawnTiles.push(tile);
        }
      }
      if (spawnTiles.length > 0) {
        const t = Phaser.Utils.Array.GetRandom(spawnTiles);
        playerX = t.pixelX + this.map.tileWidth / 2;
        playerY = t.pixelY + this.map.tileHeight / 2;
      }
    }

    // The arrival portal will be marked after setupPortals() so the player
    // must walk away before it activates. We store the def to match later.
    this.spawnedAtPortalDef = spawnedAtPortal
      ? this.levelDef.portals.find(p => p.targetLevel === this.arrivedFromLevel) ?? null
      : null;

    this.player = new Player(this, playerX, playerY);
    this.player.setDepth(DEPTHS.PLAYER);

    // Arrival animation: reverse of the exit spin+zoom
    if (spawnedAtPortal) {
      this.player.setAlpha(0);
      this.player.setScale(2.5);
      this.player.setAngle(-360);
      this.tweens.add({
        targets: this.player,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        angle: 0,
        duration: 600,
        ease: 'Cubic.easeOut',
      });
    }

    if (this.groundLayer) {
      this.wallCollider = this.physics.add.collider(this.player, this.groundLayer);
    }

    // Logs
    this.logs = this.physics.add.group({
      classType: Log,
      maxSize: this.levelDef.logs.maxCount,
      runChildUpdate: false,
    });
    this.physics.add.overlap(
      this.player,
      this.logs,
      this.collectLog as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );
    if (this.levelDef.logs.maxCount > 0 && this.levelDef.logs.spawnInterval > 0) {
      this.time.addEvent({
        delay: this.levelDef.logs.spawnInterval,
        callback: this.spawnLog,
        callbackScope: this,
        loop: true,
      });
      this.spawnLog();
    }

    // Anglerfish — one per sea region
    if (this.levelDef.anglerfish.seaBounds.length > 0) {
      const waterTiles = this.getWaterTiles();
      const playerTileX = this.map.worldToTileX(this.player.x) ?? 0;
      const playerTileY = this.map.worldToTileY(this.player.y) ?? 0;

      for (const bounds of this.levelDef.anglerfish.seaBounds) {
        const pool = waterTiles.filter(
          t => t.x >= bounds.minCol && t.x <= bounds.maxCol
        );
        if (pool.length === 0) continue;

        const farTiles = pool.filter(t => {
          const dx = t.x - playerTileX;
          const dy = t.y - playerTileY;
          return Math.sqrt(dx * dx + dy * dy) >= 10;
        });
        const candidates = farTiles.length > 0 ? farTiles : pool;
        const spawnTile = Phaser.Utils.Array.GetRandom(candidates);
        const fish = new Anglerfish(
          this,
          spawnTile.pixelX + this.map.tileWidth / 2,
          spawnTile.pixelY + this.map.tileHeight / 2,
          this.player,
          this.levelDef.anglerfish.deactivateDistancePx
        );
        this.anglerfishList.push(fish);
        if (fishLayer) this.physics.add.collider(fish, fishLayer);
        this.physics.add.overlap(
          this.player,
          fish,
          this.handleAnglerfishHit as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
          undefined,
          this
        );
      }

      this.events.on('anglerfishRipple', (x: number, y: number) => {
        this.createRipple(x, y, WATER.RIPPLES.COLOR);
      });
    }

    // Mice and cats (level 2+)
    this.setupMiceAndCats();

    // Camera — zoom computed from canvas height so visible tile count is constant
    this.cameras.main.startFollow(this.player, true, CAMERA.LERP, CAMERA.LERP);
    this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.updateCameraZoom();

    // Re-compute zoom when the window resizes
    this.scale.on('resize', () => this.updateCameraZoom());

    this.cursors = this.input.keyboard!.createCursorKeys();

    // Portals
    this.setupPortals();

    // Touch / pointer input
    this.setupPointerInput();

    // Debug overlay graphics (always created, only drawn when debugDraw is on)
    this.debugGfx = this.add.graphics();
    this.debugGfx.setDepth(DEPTHS.UI + 50);

    // Notify UI of initial state
    this.events.emit('levelStarted', this.levelDef, this.score, this.lives);
  }

  // ---------------------------------------------------------------------------
  // Debug / cheat methods
  // ---------------------------------------------------------------------------

  toggleNoclip(): boolean {
    this.noclip = !this.noclip;
    if (this.wallCollider) {
      this.wallCollider.active = !this.noclip;
    }
    return this.noclip;
  }

  setScore(value: number): void {
    this.score = Math.max(0, value);
    this.events.emit('scoreChanged', this.score);
    this.checkPortalUnlocks();
  }

  setLives(value: number): void {
    this.lives = Math.max(1, Math.min(LIVES.INITIAL, value));
    this.events.emit('livesUpdated', this.lives, this.score);
  }

  goToLevel(levelId: number): void {
    if (!LEVELS.has(levelId)) return;
    const transition: LevelTransition = {
      level: levelId,
      score: this.score,
      lives: this.lives,
    };
    this.scene.start('WorldScene', transition);
  }

  private updateCameraZoom(): void {
    // Pick the smaller zoom so we guarantee a minimum visible area in both dimensions
    const zoomH = this.scale.height / CAMERA.VISIBLE_WORLD_HEIGHT;
    const zoomW = this.scale.width / CAMERA.VISIBLE_WORLD_WIDTH;
    this.cameras.main.setZoom(Math.min(zoomH, zoomW));
  }

  toggleDebugDraw(): boolean {
    this.debugDraw = !this.debugDraw;
    if (!this.debugDraw && this.debugGfx) {
      this.debugGfx.clear();
    }
    return this.debugDraw;
  }

  private drawDebugOverlay(): void {
    if (!this.debugGfx) return;
    this.debugGfx.clear();
    if (!this.debugDraw) return;

    // Helper: draw physics body rect + position dot for an arcade sprite
    const drawActor = (
      sprite: Phaser.Physics.Arcade.Sprite,
      bodyColor: number,
      posColor: number
    ) => {
      const body = sprite.body as Phaser.Physics.Arcade.Body;
      if (!body) return;

      // Physics body rectangle (world-space)
      this.debugGfx!.lineStyle(0.5, bodyColor, 0.9);
      this.debugGfx!.strokeRect(body.x, body.y, body.width, body.height);

      // True position point (sprite.x, sprite.y)
      this.debugGfx!.fillStyle(posColor, 1);
      this.debugGfx!.fillCircle(sprite.x, sprite.y, 1);

      // Crosshair at position
      this.debugGfx!.lineStyle(0.3, posColor, 0.7);
      this.debugGfx!.lineBetween(sprite.x - 3, sprite.y, sprite.x + 3, sprite.y);
      this.debugGfx!.lineBetween(sprite.x, sprite.y - 3, sprite.x, sprite.y + 3);
    };

    // Player: green body, white position
    drawActor(this.player, 0x00ff00, 0xffffff);

    // Anglerfish: red body, yellow position
    for (const fish of this.anglerfishList) {
      drawActor(fish, 0xff0000, 0xffff00);
    }

    // Mice: cyan body, white position
    for (const mouse of this.mice) {
      if (mouse.active) drawActor(mouse, 0x00ffff, 0xffffff);
    }

    // Cats: orange body, yellow position
    for (const cat of this.cats) {
      if (cat.active) drawActor(cat, 0xff8800, 0xffff00);
    }
  }

  // ---------------------------------------------------------------------------
  // Shop
  // ---------------------------------------------------------------------------

  openShop(): void {
    if (this.isGameOver || this.isShopOpen) return;
    this.isShopOpen = true;
    this.physics.pause();
    this.playerPath = [];
    if (this.joystickActive) this.deactivateJoystick();
    this.input.enabled = false;
  }

  closeShop(): void {
    if (!this.isShopOpen) return;
    this.isShopOpen = false;
    this.physics.resume();
    this.input.enabled = true;
  }

  buyHearts(qty: number): { ok: boolean; reason?: string } {
    const cost = qty * SHOP.BUY_RATE;
    if (this.score < cost) {
      return { ok: false, reason: `Need €${cost}, you have €${this.score}.` };
    }
    if (this.lives + qty > LIVES.INITIAL) {
      return { ok: false, reason: `Hearts already at max (${LIVES.INITIAL}).` };
    }
    this.score -= cost;
    this.lives += qty;
    this.events.emit('scoreChanged', this.score);
    this.events.emit('livesUpdated', this.lives, this.score);
    return { ok: true };
  }

  sellHearts(qty: number): { ok: boolean; reason?: string } {
    if (this.lives - qty < 1) {
      return { ok: false, reason: 'Must keep at least 1 heart.' };
    }
    this.lives -= qty;
    this.score += qty * SHOP.SELL_RATE;
    this.events.emit('scoreChanged', this.score);
    this.events.emit('livesUpdated', this.lives, this.score);

    this.checkPortalUnlocks();
    return { ok: true };
  }

  // ---------------------------------------------------------------------------

  update(time: number): void {
    if (this.isGameOver || this.isShopOpen) return;

    if (this.player) {
      let overrideVelocity: { x: number; y: number } | undefined;

      if (this.joystickActive) {
        overrideVelocity = {
          x: (this.joystickDelta.x / this.joystickRadius) * PLAYER.SPEED,
          y: (this.joystickDelta.y / this.joystickRadius) * PLAYER.SPEED,
        };
      } else if (this.playerPath.length > 0) {
        overrideVelocity = this.computePathVelocity();
      }

      const keyboardUsed = this.player.update(this.cursors, overrideVelocity);
      if (keyboardUsed) {
        this.playerPath = [];
      }

      const body = this.player.body as Phaser.Physics.Arcade.Body;
      if (body.velocity.length() > 0) this.checkAndCreateRipple(time);

      if (this.isHit && time >= this.hitEndTime) this.isHit = false;
      if (this.isImmune && time >= this.immuneEndTime) this.isImmune = false;

      // Distance-based hysteresis: once player walks 2 tiles away from the
      // arrival portal, open it so they can re-enter later.
      if (this.arrivalPortalState) {
        const ap = this.arrivalPortalState;
        const tileSize = this.map.tileWidth;
        const portalX = ap.def.col * tileSize + tileSize / 2;
        const portalY = ap.def.row * tileSize + tileSize / 2;
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, portalX, portalY);
        if (dist > tileSize * 2) {
          this.drawPortalOpen(ap);
          this.arrivalPortalState = null;
        }
      }
    }

    for (const fish of this.anglerfishList) {
      fish.update(time, this.groundLayer);
    }

    // Prune destroyed mice from the array
    this.mice = this.mice.filter(m => m.active);

    // Mice flee from player + cats
    const threats: Phaser.GameObjects.Sprite[] = [this.player, ...this.cats];
    for (const mouse of this.mice) {
      mouse.flee(threats);
    }

    // Cats update AI
    for (const cat of this.cats) {
      if (cat.active) cat.update();
    }

    this.drawDebugOverlay();
  }

  // ---------------------------------------------------------------------------
  // Touch / pointer input
  // ---------------------------------------------------------------------------

  private setupPointerInput(): void {
    const displayW = this.scale.displaySize.width;
    const canvasW = this.scale.width;
    this.joystickRadius = Math.round(
      TOUCH.JOYSTICK_TARGET_CSS_PX / (displayW / canvasW)
    );

    const zoom = this.cameras.main.zoom;
    const outerR = this.joystickRadius / zoom;
    const innerR = (this.joystickRadius * TOUCH.JOYSTICK_KNOB_RATIO) / zoom;

    this.joystickOuter = this.add.graphics();
    this.joystickOuter.lineStyle(2 / zoom, 0xffffff, TOUCH.JOYSTICK_OUTER_ALPHA);
    this.joystickOuter.strokeCircle(0, 0, outerR);
    this.joystickOuter.setDepth(DEPTHS.UI - 1).setVisible(false);

    this.joystickInner = this.add.graphics();
    this.joystickInner.fillStyle(0xffffff, TOUCH.JOYSTICK_INNER_ALPHA);
    this.joystickInner.fillCircle(0, 0, innerR);
    this.joystickInner.setDepth(DEPTHS.UI - 1).setVisible(false);

    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      this.ptrDownX = ptr.x;
      this.ptrDownY = ptr.y;
      this.holdTimer = this.time.delayedCall(TOUCH.HOLD_DELAY, () => {
        this.activateJoystick(ptr.x, ptr.y);
      });
    });

    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (!ptr.isDown) return;
      if (this.joystickActive) {
        this.updateJoystick(ptr.x, ptr.y);
      } else {
        const moved = Phaser.Math.Distance.Between(
          ptr.x, ptr.y, this.ptrDownX, this.ptrDownY
        );
        if (moved > TOUCH.DRAG_THRESHOLD) {
          this.holdTimer?.remove();
          this.activateJoystick(this.ptrDownX, this.ptrDownY);
          this.updateJoystick(ptr.x, ptr.y);
        }
      }
    });

    this.input.on('pointerup', (ptr: Phaser.Input.Pointer) => {
      this.holdTimer?.remove();
      if (this.joystickActive) {
        this.deactivateJoystick();
      } else {
        const world = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
        this.startPlayerPath(world.x, world.y);
        this.showTapMarker(world.x, world.y);
      }
    });
  }

  private activateJoystick(screenX: number, screenY: number): void {
    this.joystickDelta = { x: 0, y: 0 };
    this.joystickActive = true;
    this.playerPath = [];

    const center = this.cameras.main.getWorldPoint(screenX, screenY);
    this.joystickOuter.setPosition(center.x, center.y).setVisible(true);
    this.joystickInner.setPosition(center.x, center.y).setVisible(true);
  }

  private updateJoystick(screenX: number, screenY: number): void {
    let dx = screenX - this.ptrDownX;
    let dy = screenY - this.ptrDownY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > this.joystickRadius) {
      dx = (dx / dist) * this.joystickRadius;
      dy = (dy / dist) * this.joystickRadius;
    }
    this.joystickDelta = { x: dx, y: dy };

    const cam = this.cameras.main;
    const center = cam.getWorldPoint(this.ptrDownX, this.ptrDownY);
    this.joystickOuter.setPosition(center.x, center.y);
    this.joystickInner.setPosition(center.x + dx / cam.zoom, center.y + dy / cam.zoom);
  }

  private deactivateJoystick(): void {
    this.joystickActive = false;
    this.joystickDelta = { x: 0, y: 0 };
    this.joystickOuter.setVisible(false);
    this.joystickInner.setVisible(false);
  }

  private startPlayerPath(worldX: number, worldY: number): void {
    if (!this.groundLayer) return;

    if (!this.playerWalkable) {
      const grid: boolean[][] = [];
      for (let row = 0; row < this.map.height; row++) {
        const rowArr: boolean[] = [];
        for (let col = 0; col < this.map.width; col++) {
          const tile = this.groundLayer.getTileAt(col, row);
          rowArr.push(tile !== null && tile.index !== 1);
        }
        grid.push(rowArr);
      }
      this.playerWalkable = grid;
    }

    const playerTileX = this.map.worldToTileX(this.player.x);
    const playerTileY = this.map.worldToTileY(this.player.y);
    let destTileX = this.map.worldToTileX(worldX);
    let destTileY = this.map.worldToTileY(worldY);

    if (
      playerTileX === null || playerTileY === null ||
      destTileX === null || destTileY === null
    ) return;

    if (!this.playerWalkable[destTileY]?.[destTileX]) {
      const nearest = this.nearestWalkableTile(destTileX, destTileY, this.playerWalkable);
      if (!nearest) return;
      destTileX = nearest.x;
      destTileY = nearest.y;
    }

    this.playerPath = findPath(
      this.playerWalkable, playerTileX, playerTileY, destTileX, destTileY
    );
  }

  private computePathVelocity(): { x: number; y: number } | undefined {
    if (this.playerPath.length === 0) return undefined;

    const tileSize = this.map.tileWidth;
    const arrivalRadius = tileSize * 0.75;

    while (
      this.playerPath.length > 0 &&
      Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        this.playerPath[0].x * tileSize + tileSize / 2,
        this.playerPath[0].y * tileSize + tileSize / 2
      ) < arrivalRadius
    ) {
      this.playerPath.shift();
    }

    if (this.playerPath.length === 0) return undefined;

    let steerX = 0, steerY = 0, totalW = 0;
    const look = Math.min(2, this.playerPath.length);
    for (let i = 0; i < look; i++) {
      const w = look - i;
      steerX += (this.playerPath[i].x * tileSize + tileSize / 2 - this.player.x) * w;
      steerY += (this.playerPath[i].y * tileSize + tileSize / 2 - this.player.y) * w;
      totalW += w;
    }
    steerX /= totalW;
    steerY /= totalW;

    const dist = Math.sqrt(steerX * steerX + steerY * steerY);
    if (dist < 1) return undefined;

    return { x: (steerX / dist) * PLAYER.SPEED, y: (steerY / dist) * PLAYER.SPEED };
  }

  private nearestWalkableTile(
    tx: number, ty: number, walkable: boolean[][]
  ): { x: number; y: number } | null {
    const rows = walkable.length;
    const cols = rows > 0 ? walkable[0].length : 0;
    const visited = new Set<number>();
    const queue: Array<{ x: number; y: number }> = [{ x: tx, y: ty }];
    visited.add(ty * cols + tx);
    const DIRS = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    while (queue.length > 0) {
      const { x, y } = queue.shift()!;
      if (walkable[y]?.[x]) return { x, y };
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
        const k = ny * cols + nx;
        if (visited.has(k)) continue;
        visited.add(k);
        queue.push({ x: nx, y: ny });
      }
    }
    return null;
  }

  private showTapMarker(worldX: number, worldY: number): void {
    const marker = this.add.graphics();
    marker.lineStyle(1, 0xffffff, 0.9);
    marker.strokeCircle(0, 0, 3);
    marker.setPosition(worldX, worldY);
    marker.setDepth(DEPTHS.EFFECTS);
    this.tweens.add({
      targets: marker,
      alpha: 0,
      scaleX: 4,
      scaleY: 4,
      duration: 450,
      ease: 'Sine.easeOut',
      onComplete: () => marker.destroy(),
    });
  }

  // ---------------------------------------------------------------------------
  // Ripple helpers
  // ---------------------------------------------------------------------------

  private checkAndCreateRipple(time: number): void {
    if (time - this.lastRippleTime < WATER.RIPPLES.SPAWN_DELAY) return;

    const tileX = this.map.worldToTileX(this.player.x);
    const tileY = this.map.worldToTileY(this.player.y);
    if (tileX === null || tileY === null || !this.groundLayer) return;

    const tile = this.groundLayer.getTileAt(tileX, tileY);
    if (tile && tile.index === WATER.TILE_INDEX) {
      const color = this.isHit ? ANGLERFISH.RIPPLES.COLOR : WATER.RIPPLES.COLOR;
      this.createRipple(this.player.x, this.player.y, color);
      this.lastRippleTime = time;
    }
  }

  private createRipple(x: number, y: number, color: number = WATER.RIPPLES.COLOR): void {
    const ripple = this.add.graphics();
    ripple.lineStyle(WATER.RIPPLES.LINE_WIDTH, color, WATER.RIPPLES.OPACITY);
    ripple.strokeCircle(0, 0, 2);
    ripple.setPosition(x, y + WATER.RIPPLES.Y_OFFSET);
    ripple.setDepth(WATER.RIPPLES.DEPTH);

    const mask = this.createWaterMask();
    if (mask) ripple.setMask(mask);

    this.tweens.add({
      targets: ripple,
      scaleX: WATER.RIPPLES.SCALE,
      scaleY: WATER.RIPPLES.SCALE,
      alpha: 0,
      duration: WATER.RIPPLES.DURATION,
      ease: 'Sine.easeOut',
      onComplete: () => { ripple.destroy(); },
    });
  }

  private createWaterMask(): Phaser.Display.Masks.GeometryMask | null {
    if (!this.groundLayer) return null;
    const maskGraphics = this.make.graphics({}, false);
    maskGraphics.fillStyle(0xffffff);
    for (let y = 0; y < this.map.height; y++) {
      for (let x = 0; x < this.map.width; x++) {
        const tile = this.groundLayer.getTileAt(x, y);
        if (tile && tile.index === WATER.TILE_INDEX) {
          maskGraphics.fillRect(tile.pixelX, tile.pixelY, this.map.tileWidth, this.map.tileHeight);
        }
      }
    }
    return maskGraphics.createGeometryMask();
  }

  // ---------------------------------------------------------------------------
  // Log helpers
  // ---------------------------------------------------------------------------

  private spawnLog(): void {
    if (this.logs.countActive(true) >= this.levelDef.logs.maxCount) return;

    const waterTiles = this.getWaterTiles();
    if (waterTiles.length === 0) return;

    const playerTileX = this.map.worldToTileX(this.player.x);
    const playerTileY = this.map.worldToTileY(this.player.y);

    const farTiles = waterTiles.filter(tile => {
      const dx = tile.x - (playerTileX ?? 0);
      const dy = tile.y - (playerTileY ?? 0);
      return Math.sqrt(dx * dx + dy * dy) >= this.levelDef.logs.minSpawnDistanceTiles;
    });

    const available = farTiles.length > 0 ? farTiles : waterTiles;
    const randomTile = Phaser.Utils.Array.GetRandom(available);
    const worldX = randomTile.pixelX + this.map.tileWidth / 2;
    const worldY = randomTile.pixelY + this.map.tileHeight / 2;

    this.logs.add(new Log(this, worldX, worldY));

    for (let i = 0; i < LOGS.SPAWN_RIPPLES.COUNT; i++) {
      this.time.delayedCall(i * LOGS.SPAWN_RIPPLES.DELAY, () => {
        this.createRipple(worldX, worldY);
      });
    }
  }

  private getWaterTiles(): Phaser.Tilemaps.Tile[] {
    const tiles: Phaser.Tilemaps.Tile[] = [];
    if (!this.groundLayer) return tiles;
    for (let y = 0; y < this.map.height; y++) {
      for (let x = 0; x < this.map.width; x++) {
        const tile = this.groundLayer.getTileAt(x, y);
        if (tile && tile.index === WATER.TILE_INDEX) tiles.push(tile);
      }
    }
    return tiles;
  }

  private collectLog(
    _player: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    logObj: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ): void {
    const log = logObj as Log;
    this.score += this.levelDef.logs.pointsPerLog;
    for (let i = 0; i < 3; i++) {
      this.time.delayedCall(i * 100, () => { this.createRipple(log.x, log.y); });
    }
    log.collect(this.player);
    this.events.emit('scoreChanged', this.score);

    this.checkPortalUnlocks();
  }

  // ---------------------------------------------------------------------------
  // Anglerfish hit
  // ---------------------------------------------------------------------------

  private handleAnglerfishHit(
    _player: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    _anglerfish: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ): void {
    if (this.isImmune || this.lives <= 0) return;

    this.lives = Math.max(0, this.lives - 1);
    this.isImmune = true;
    this.immuneEndTime = this.time.now + LIVES.ANIMATION_DURATION;
    this.isHit = true;
    this.hitEndTime = this.immuneEndTime;

    for (let i = 0; i < 5; i++) {
      this.time.delayedCall(i * 100, () => {
        this.createRipple(this.player.x, this.player.y, ANGLERFISH.RIPPLES.COLOR);
      });
    }

    this.events.emit('livesChanged', this.lives, this.player.x, this.player.y);
    if (this.lives <= 0) {
      this.isGameOver = true;
      this.physics.pause();
      this.events.emit('gameOver');
    }
  }

  // ---------------------------------------------------------------------------
  // Mice and cats
  // ---------------------------------------------------------------------------

  private setupMiceAndCats(): void {
    const miceCfg = this.levelDef.mice;
    const catsCfg = this.levelDef.cats;
    if (!miceCfg && !catsCfg) return;

    // Spawn initial batch of mice
    if (miceCfg && miceCfg.maxCount > 0) {
      const initial = miceCfg.initialCount ?? 1;
      for (let i = 0; i < initial; i++) {
        this.spawnMouse();
      }
      if (miceCfg.spawnInterval > 0) {
        this.time.addEvent({
          delay: miceCfg.spawnInterval,
          callback: this.spawnMouse,
          callbackScope: this,
          loop: true,
        });
      }
    }

    // Spawn cats
    if (catsCfg && catsCfg.count > 0 && this.groundLayer) {
      const grassTiles = this.getGrassTiles();

      // Build grass-walkable grid for cat A* (grass=2 and portal=3 are walkable)
      const catWalkable: boolean[][] = [];
      for (let row = 0; row < this.map.height; row++) {
        const rowArr: boolean[] = [];
        for (let col = 0; col < this.map.width; col++) {
          const tile = this.groundLayer.getTileAt(col, row);
          rowArr.push(tile !== null && (tile.index === 2 || tile.index === 3));
        }
        catWalkable.push(rowArr);
      }

      // Split map into N vertical strips, spawn one cat per strip
      const mapW = this.map.width;
      const stripW = Math.floor(mapW / catsCfg.count);

      for (let i = 0; i < catsCfg.count; i++) {
        const stripMinCol = i * stripW;
        const stripMaxCol = (i === catsCfg.count - 1) ? mapW - 1 : (i + 1) * stripW - 1;
        const stripCenter = Math.floor((stripMinCol + stripMaxCol) / 2);

        // Find grass tiles in this strip, prefer near center
        const stripGrass = grassTiles.filter(t => t.x >= stripMinCol && t.x <= stripMaxCol);
        if (stripGrass.length === 0) continue;

        // Sort by distance to strip center, pick from nearest quarter
        stripGrass.sort((a, b) => Math.abs(a.x - stripCenter) - Math.abs(b.x - stripCenter));
        const nearCenter = stripGrass.slice(0, Math.max(1, Math.floor(stripGrass.length / 4)));
        const tile = Phaser.Utils.Array.GetRandom(nearCenter);

        const cat = new Cat(
          this,
          tile.pixelX + this.map.tileWidth / 2,
          tile.pixelY + this.map.tileHeight / 2,
          this.player,
          () => this.mice.filter(m => m.active),
          (mouse) => this.catEatsMouse(mouse as Mouse),
          catWalkable,
          this.map,
          catsCfg.speed,
          catsCfg.sightRange,
        );
        cat.catId = i;
        this.cats.push(cat);

        // Cat collides with walls + water
        if (this.grassCollisionLayer) {
          this.physics.add.collider(cat, this.grassCollisionLayer);
        }

        // Cat hurts the player
        this.physics.add.overlap(
          this.player,
          cat,
          this.handleCatHit as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
          undefined,
          this
        );
      }

      // Wire up anti-herd: each cat knows about all others
      for (const cat of this.cats) {
        cat.setOtherCats(() => this.cats);
      }
    }
  }

  private spawnMouse(): void {
    const miceCfg = this.levelDef.mice;
    if (!miceCfg) return;

    // Count active mice
    const activeCount = this.mice.filter(m => m.active).length;
    if (activeCount >= miceCfg.maxCount) return;

    const grassTiles = this.getGrassTiles();
    if (grassTiles.length === 0) return;

    const playerTileX = this.map.worldToTileX(this.player.x) ?? 0;
    const playerTileY = this.map.worldToTileY(this.player.y) ?? 0;

    // Spawn at least 5 tiles from player
    const farTiles = grassTiles.filter(t => {
      const dx = t.x - playerTileX;
      const dy = t.y - playerTileY;
      return Math.sqrt(dx * dx + dy * dy) >= 5;
    });
    const candidates = farTiles.length > 0 ? farTiles : grassTiles;
    const tile = Phaser.Utils.Array.GetRandom(candidates);

    const mouse = new Mouse(
      this,
      tile.pixelX + this.map.tileWidth / 2,
      tile.pixelY + this.map.tileHeight / 2,
      miceCfg.fleeSpeed,
      miceCfg.fleeRadius,
    );

    // Mouse collides with walls + water
    if (this.grassCollisionLayer) {
      this.physics.add.collider(mouse, this.grassCollisionLayer);
    }

    // Player collects mouse on overlap
    this.physics.add.overlap(
      this.player,
      mouse,
      () => this.collectMouse(mouse),
      undefined,
      this
    );

    this.mice.push(mouse);
  }

  private collectMouse(mouse: Mouse): void {
    if (!mouse.active) return;
    const miceCfg = this.levelDef.mice;
    if (!miceCfg) return;

    this.score += miceCfg.pointsPerMouse;
    mouse.collect();
    this.events.emit('scoreChanged', this.score);
    this.checkPortalUnlocks();
  }

  private catEatsMouse(mouse: Mouse): void {
    if (!mouse.active) return;
    mouse.collect();
  }

  private handleCatHit(
    _player: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    _cat: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ): void {
    // Reuse the same immunity/lives logic as anglerfish
    if (this.isImmune || this.lives <= 0) return;

    this.lives = Math.max(0, this.lives - 1);
    this.isImmune = true;
    this.immuneEndTime = this.time.now + LIVES.ANIMATION_DURATION;
    this.isHit = true;
    this.hitEndTime = this.immuneEndTime;

    this.events.emit('livesChanged', this.lives, this.player.x, this.player.y);
    if (this.lives <= 0) {
      this.isGameOver = true;
      this.physics.pause();
      this.events.emit('gameOver');
    }
  }

  private getGrassTiles(): Phaser.Tilemaps.Tile[] {
    const tiles: Phaser.Tilemaps.Tile[] = [];
    if (!this.groundLayer) return tiles;
    for (let y = 0; y < this.map.height; y++) {
      for (let x = 0; x < this.map.width; x++) {
        const tile = this.groundLayer.getTileAt(x, y);
        if (tile && tile.index === 2) tiles.push(tile);
      }
    }
    return tiles;
  }

  // ---------------------------------------------------------------------------
  // Portals
  // ---------------------------------------------------------------------------

  private setupPortals(): void {
    const tileSize = this.map.tileWidth;

    for (const portalDef of this.levelDef.portals) {
      const cx = portalDef.col * tileSize + tileSize / 2;
      const cy = portalDef.row * tileSize + tileSize / 2;
      const isOpen = portalDef.moneyRequired <= 0 || this.score >= portalDef.moneyRequired;

      const gfx = this.add.graphics();
      gfx.setDepth(DEPTHS.EFFECTS + 1);

      // Label — render at high res and scale down so text stays crisp at zoom
      const zoom = this.cameras.main.zoom;
      const labelScale = 1 / zoom;
      const priceTag = this.add.text(
        cx, cy - tileSize * 0.9,
        portalDef.moneyRequired > 0 ? `€${portalDef.moneyRequired}` : portalDef.label,
        {
          fontSize: `${Math.round(5 * zoom)}px`,
          color: '#88ccff',
          stroke: '#000000',
          strokeThickness: Math.round(1 * zoom),
        }
      );
      priceTag.setOrigin(0.5, 1);
      priceTag.setScale(labelScale);
      priceTag.setDepth(DEPTHS.EFFECTS + 2);

      // Overlap zone
      const zone = this.add.zone(cx, cy, tileSize, tileSize);
      this.physics.add.existing(zone, true);

      const state: PortalState = {
        def: portalDef,
        open: false,
        gfx,
        pulseTween: null,
        priceTag,
        zone,
      };

      this.physics.add.overlap(
        this.player,
        zone,
        () => {
          if (state.open && state !== this.arrivalPortalState) {
            this.handlePortalReached(state);
          }
        },
        undefined,
        this
      );

      this.portalStates.push(state);

      // If the player spawned on this portal, keep it visually closed
      // until they walk away (distance-based hysteresis)
      const isArrivalPortal = this.spawnedAtPortalDef === portalDef;
      if (isArrivalPortal) {
        this.arrivalPortalState = state;
        this.drawPortalClosed(state);
      } else if (isOpen) {
        this.drawPortalOpen(state);
      } else {
        this.drawPortalClosed(state);
      }
    }
    this.spawnedAtPortalDef = null; // consumed
  }

  private drawPortalClosed(state: PortalState): void {
    const tileSize = this.map.tileWidth;
    const cx = state.def.col * tileSize + tileSize / 2;
    const cy = state.def.row * tileSize + tileSize / 2;
    const r = tileSize * 0.42;

    // Draw at origin so scale tweens around the center
    state.gfx.clear();
    state.gfx.setPosition(cx, cy);
    state.gfx.fillStyle(0x446688, 0.55);
    state.gfx.fillCircle(0, 0, r);
    state.gfx.lineStyle(1, 0x446688, 0.9);
    state.gfx.strokeCircle(0, 0, r);

    state.open = false;
    state.priceTag.setVisible(true);
  }

  private drawPortalOpen(state: PortalState): void {
    const tileSize = this.map.tileWidth;
    const cx = state.def.col * tileSize + tileSize / 2;
    const cy = state.def.row * tileSize + tileSize / 2;
    const r = tileSize * 0.42;

    // Draw at origin so scale tweens around the center
    state.gfx.clear();
    state.gfx.setPosition(cx, cy);
    state.gfx.fillStyle(0x00ffff, 0.5);
    state.gfx.fillCircle(0, 0, r);
    state.gfx.lineStyle(1.5, 0x8844ff, 1);
    state.gfx.strokeCircle(0, 0, r + 1);

    state.open = true;

    // Show label instead of price
    state.priceTag.setText(state.def.label);
    state.priceTag.setVisible(true);

    if (!state.pulseTween) {
      state.pulseTween = this.tweens.add({
        targets: state.gfx,
        scaleX: 1.15,
        scaleY: 1.15,
        alpha: 0.7,
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private checkPortalUnlocks(): void {
    for (const state of this.portalStates) {
      if (state.open) continue;
      if (state.def.moneyRequired > 0 && this.score >= state.def.moneyRequired) {
        this.drawPortalOpen(state);
        this.showPortalBubble(state);
      }
    }
  }

  private showPortalBubble(state: PortalState): void {
    const tileSize = this.map.tileWidth;
    const cx = state.def.col * tileSize + tileSize / 2;
    const cy = state.def.row * tileSize + tileSize / 2;

    const zoom = this.cameras.main.zoom;
    const labelScale = 1 / zoom;
    const text = this.add.text(cx, cy - tileSize * 1.5, `Portal to ${state.def.label} opened!`, {
      fontSize: `${Math.round(6 * zoom)}px`,
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: Math.round(2 * zoom),
      backgroundColor: '#00000088',
      padding: { x: Math.round(3 * zoom), y: Math.round(2 * zoom) },
    });
    text.setOrigin(0.5, 1);
    text.setScale(labelScale);
    text.setDepth(DEPTHS.UI - 2);

    this.tweens.add({
      targets: text,
      y: cy - tileSize * 1.5 - 12,
      alpha: 0,
      duration: 2800,
      ease: 'Sine.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  private handlePortalReached(state: PortalState): void {
    if (this.isGameOver) return;
    this.isGameOver = true; // block re-entry
    this.physics.pause();

    state.pulseTween?.stop();

    this.tweens.add({
      targets: this.player,
      angle: 360,
      scaleX: 2.5,
      scaleY: 2.5,
      alpha: 0,
      duration: 900,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        const transition: LevelTransition = {
          level: state.def.targetLevel,
          score: this.score,
          lives: this.lives,
          fromLevel: this.currentLevel,
        };
        this.events.emit('levelTransition', transition);
        this.scene.start('WorldScene', transition);
      },
    });
  }
}
