import Phaser from 'phaser';
import { Player } from '../objects/Player';
import { Log } from '../objects/Log';
import { Anglerfish } from '../objects/Anglerfish';
import { PLAYER, WATER, LOGS, CAMERA, DEPTHS, ANGLERFISH, LIVES, TOUCH } from '../config/constants';
import { findPath } from '../utils/pathfinder';

export class WorldScene extends Phaser.Scene {
  public player!: Player;
  private anglerfishList: Anglerfish[] = [];
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private map!: Phaser.Tilemaps.Tilemap;
  private groundLayer!: Phaser.Tilemaps.TilemapLayer | null;
  private lastRippleTime: number = 0;
  private logs!: Phaser.Physics.Arcade.Group;
  public score: number = 0;

  // Lives / immunity
  public lives: number = LIVES.INITIAL;
  private isImmune: boolean = false;
  private immuneEndTime: number = 0;
  private isHit: boolean = false;
  private hitEndTime: number = 0;

  // -------------------------------------------------------------------------
  // Touch / pointer input
  // -------------------------------------------------------------------------
  private playerWalkable: boolean[][] | null = null;
  private playerPath: Array<{ x: number; y: number }> = [];

  private joystickActive = false;
  private joystickDelta = { x: 0, y: 0 };
  private joystickRadius = 100; // computed at create() time from display size
  private joystickOuter!: Phaser.GameObjects.Graphics;
  private joystickInner!: Phaser.GameObjects.Graphics;

  private ptrDownX = 0;
  private ptrDownY = 0;
  private holdTimer: Phaser.Time.TimerEvent | null = null;

  // -------------------------------------------------------------------------

  constructor() {
    super({ key: 'WorldScene' });
  }

  create(): void {
    this.map = this.make.tilemap({ key: 'world-map' });
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
    if (this.groundLayer) {
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

    // Player spawn
    let playerX = PLAYER.START_X;
    let playerY = PLAYER.START_Y;

    if (this.groundLayer) {
      const spawnTiles: Phaser.Tilemaps.Tile[] = [];
      const { MIN_COL, MAX_COL, MIN_ROW, MAX_ROW } = PLAYER.SPAWN_REGION;
      for (let y = MIN_ROW; y <= MAX_ROW; y++) {
        for (let x = MIN_COL; x <= MAX_COL; x++) {
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

    this.player = new Player(this, playerX, playerY);
    this.player.setDepth(DEPTHS.PLAYER);

    if (this.groundLayer) {
      this.physics.add.collider(this.player, this.groundLayer);
    }

    // Logs
    this.logs = this.physics.add.group({
      classType: Log,
      maxSize: LOGS.MAX_COUNT,
      runChildUpdate: false,
    });
    this.physics.add.overlap(
      this.player,
      this.logs,
      this.collectLog as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );
    this.time.addEvent({
      delay: LOGS.SPAWN_INTERVAL,
      callback: this.spawnLog,
      callbackScope: this,
      loop: true,
    });
    this.spawnLog();

    // Anglerfish
    const waterTiles = this.getWaterTiles();
    const playerTileX = this.map.worldToTileX(this.player.x) ?? 0;
    const playerTileY = this.map.worldToTileY(this.player.y) ?? 0;

    const spawnAnglerfish = (pool: Phaser.Tilemaps.Tile[]) => {
      if (pool.length === 0) return;
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
        this.player
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
    };

    spawnAnglerfish(waterTiles.filter(t => t.x <= ANGLERFISH.LEFT_SEA_MAX_COL));
    spawnAnglerfish(waterTiles.filter(t => t.x >= ANGLERFISH.RIGHT_SEA_MIN_COL));

    this.events.on('anglerfishRipple', (x: number, y: number) => {
      this.createRipple(x, y, WATER.RIPPLES.COLOR);
    });

    // Camera
    this.cameras.main.startFollow(this.player, true, CAMERA.LERP, CAMERA.LERP);
    this.cameras.main.setZoom(CAMERA.ZOOM);
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

    this.cursors = this.input.keyboard!.createCursorKeys();

    // Touch / pointer input
    this.setupPointerInput();
  }

  update(time: number): void {
    if (this.player) {
      // Determine override velocity from joystick or path
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
        // Keyboard cancels tap-to-move path
        this.playerPath = [];
      }

      const body = this.player.body as Phaser.Physics.Arcade.Body;
      if (body.velocity.length() > 0) this.checkAndCreateRipple(time);

      if (this.isHit && time >= this.hitEndTime) this.isHit = false;
      if (this.isImmune && time >= this.immuneEndTime) this.isImmune = false;
    }

    for (const fish of this.anglerfishList) {
      fish.update(time, this.groundLayer);
    }
  }

  // ---------------------------------------------------------------------------
  // Touch / pointer input
  // ---------------------------------------------------------------------------

  private setupPointerInput(): void {
    // joystickRadius in canvas-pixel space (same units as ptr.x / ptr.y).
    const displayW = this.scale.displaySize.width;
    const canvasW = this.scale.width;
    this.joystickRadius = Math.round(
      TOUCH.JOYSTICK_TARGET_CSS_PX / (displayW / canvasW)
    );

    // The joystick lives in world space (no setScrollFactor).
    // camera.getWorldPoint() converts screen→world perfectly for the current
    // camera state, so the ring always appears exactly where the finger lands.
    // All drawn radii are in world units = canvas-pixel radius / zoom.
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
        // Clean tap → pathfind to world position
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

    // Place ring at the world position that corresponds to this screen point.
    const center = this.cameras.main.getWorldPoint(screenX, screenY);
    this.joystickOuter.setPosition(center.x, center.y).setVisible(true);
    this.joystickInner.setPosition(center.x, center.y).setVisible(true);
  }

  private updateJoystick(screenX: number, screenY: number): void {
    // Delta from initial press in screen-pixel space.
    let dx = screenX - this.ptrDownX;
    let dy = screenY - this.ptrDownY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > this.joystickRadius) {
      dx = (dx / dist) * this.joystickRadius;
      dy = (dy / dist) * this.joystickRadius;
    }
    this.joystickDelta = { x: dx, y: dy };

    // Re-derive ring centre each call so it stays screen-fixed as the camera
    // follows the player. Then offset knob by delta converted to world units.
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
      // Walkable for the player: any tile that exists and isn't a wall (tile 1)
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

    // If tapped on a wall, route to nearest walkable tile
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

    // Advance past waypoints already within arrival radius
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

    // Lookahead steering: blend toward the next 1–2 waypoints
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
    if (this.logs.countActive(true) >= LOGS.MAX_COUNT) return;

    const waterTiles = this.getWaterTiles();
    if (waterTiles.length === 0) return;

    const playerTileX = this.map.worldToTileX(this.player.x);
    const playerTileY = this.map.worldToTileY(this.player.y);

    const farTiles = waterTiles.filter(tile => {
      const dx = tile.x - (playerTileX ?? 0);
      const dy = tile.y - (playerTileY ?? 0);
      return Math.sqrt(dx * dx + dy * dy) >= LOGS.MIN_SPAWN_DISTANCE_TILES;
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
    this.score += LOGS.POINTS_PER_LOG;
    for (let i = 0; i < 3; i++) {
      this.time.delayedCall(i * 100, () => { this.createRipple(log.x, log.y); });
    }
    log.collect(this.player);
    this.events.emit('scoreChanged', this.score);
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
    if (this.lives <= 0) this.events.emit('gameOver');
  }
}
