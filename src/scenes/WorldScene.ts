import Phaser from 'phaser';
import { Player } from '../objects/Player';
import { Log } from '../objects/Log';
import { Anglerfish } from '../objects/Anglerfish';
import { PLAYER, WATER, LOGS, CAMERA, DEPTHS, ANGLERFISH } from '../config/constants';

export class WorldScene extends Phaser.Scene {
  private player!: Player;
  private anglerfish!: Anglerfish;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private map!: Phaser.Tilemaps.Tilemap;
  private groundLayer!: Phaser.Tilemaps.TilemapLayer | null;
  private lastRippleTime: number = 0;
  private logs!: Phaser.Physics.Arcade.Group;
  public score: number = 0; // Track collected logs
  private isHit: boolean = false; // Track if player was hit by anglerfish
  private hitEndTime: number = 0; // When hit status ends

  constructor() {
    super({ key: 'WorldScene' });
  }

  create(): void {
    // Load the tilemap
    this.map = this.make.tilemap({ key: 'world-map' });
    const tileset = this.map.addTilesetImage('tileset', 'tileset');

    if (!tileset) {
      console.error('Tileset not found. Ensure tileset name in Tiled matches the key used here.');
      return;
    }

    // Create layers
    this.groundLayer = this.map.createLayer('Ground', tileset, 0, 0);
    const collisionLayer = this.map.createLayer('Collision', tileset, 0, 0);

    // Set layer depths
    if (this.groundLayer) this.groundLayer.setDepth(DEPTHS.GROUND);
    if (collisionLayer) collisionLayer.setDepth(DEPTHS.GROUND);

    // Set up collision
    if (collisionLayer) {
      collisionLayer.setCollisionByExclusion([-1, 0]);
    }

    // Find a random walkable tile within the top-right island spawn region
    let playerX = PLAYER.START_X;
    let playerY = PLAYER.START_Y;

    if (this.groundLayer && collisionLayer) {
      const spawnTiles: Phaser.Tilemaps.Tile[] = [];
      const { MIN_COL, MAX_COL, MIN_ROW, MAX_ROW } = PLAYER.SPAWN_REGION;

      for (let y = MIN_ROW; y <= MAX_ROW; y++) {
        for (let x = MIN_COL; x <= MAX_COL; x++) {
          const groundTile = this.groundLayer.getTileAt(x, y);
          const collisionTile = collisionLayer.getTileAt(x, y);

          if (groundTile &&
              groundTile.index !== WATER.TILE_INDEX &&
              (!collisionTile || !collisionTile.collides)) {
            spawnTiles.push(groundTile);
          }
        }
      }

      if (spawnTiles.length > 0) {
        const spawnTile = Phaser.Utils.Array.GetRandom(spawnTiles);
        playerX = spawnTile.pixelX + this.map.tileWidth / 2;
        playerY = spawnTile.pixelY + this.map.tileHeight / 2;
      }
    }

    // Create the player at the selected spawn position
    this.player = new Player(this, playerX, playerY);
    this.player.setDepth(DEPTHS.PLAYER);

    // Enable collision between player and collision layer
    if (collisionLayer) {
      this.physics.add.collider(this.player, collisionLayer);
    }

    // Create logs group for collectibles
    this.logs = this.physics.add.group({
      classType: Log,
      maxSize: LOGS.MAX_COUNT,
      runChildUpdate: false,
    });

    // Set up collision detection for log collection
    this.physics.add.overlap(
      this.player,
      this.logs,
      this.collectLog as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );

    // Start spawning logs periodically
    this.time.addEvent({
      delay: LOGS.SPAWN_INTERVAL,
      callback: this.spawnLog,
      callbackScope: this,
      loop: true,
    });

    // Spawn initial log
    this.spawnLog();

    // Create the anglerfish (hostile NPC) on a random water tile
    const waterTiles = this.getWaterTiles();
    let anglerfishX = ANGLERFISH.START_X;
    let anglerfishY = ANGLERFISH.START_Y;

    if (waterTiles.length > 0) {
      // Filter tiles far from player
      const playerTileX = this.map.worldToTileX(this.player.x);
      const playerTileY = this.map.worldToTileY(this.player.y);

      const farTiles = waterTiles.filter(tile => {
        const dx = tile.x - (playerTileX ?? 0);
        const dy = tile.y - (playerTileY ?? 0);
        const distanceInTiles = Math.sqrt(dx * dx + dy * dy);
        return distanceInTiles >= 10; // Spawn far from player
      });

      const spawnTiles = farTiles.length > 0 ? farTiles : waterTiles;
      const spawnTile = Phaser.Utils.Array.GetRandom(spawnTiles);
      anglerfishX = spawnTile.pixelX + this.map.tileWidth / 2;
      anglerfishY = spawnTile.pixelY + this.map.tileHeight / 2;
    }

    this.anglerfish = new Anglerfish(
      this,
      anglerfishX,
      anglerfishY,
      this.player
    );

    // Enable collision between anglerfish and collision layer (obstacles)
    if (collisionLayer) {
      this.physics.add.collider(this.anglerfish, collisionLayer);
    }

    // Enable collision between anglerfish and non-water ground tiles (grass)
    if (this.groundLayer) {
      // Set collision for all tiles except water
      this.groundLayer.setCollisionByExclusion([WATER.TILE_INDEX]);
      this.physics.add.collider(this.anglerfish, this.groundLayer);
    }

    // Set up collision detection for anglerfish hitting player
    this.physics.add.overlap(
      this.player,
      this.anglerfish,
      this.handleAnglerfishHit as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );

    // Listen for anglerfish ripple events (white ripples like water)
    this.events.on('anglerfishRipple', (x: number, y: number) => {
      this.createRipple(x, y, WATER.RIPPLES.COLOR);
    });

    // Set up camera
    this.cameras.main.startFollow(this.player, true, CAMERA.LERP, CAMERA.LERP);
    this.cameras.main.setZoom(CAMERA.ZOOM);
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

    // Set up input
    this.cursors = this.input.keyboard!.createCursorKeys();
  }

  update(time: number): void {
    if (this.player) {
      this.player.update(this.cursors);

      // Check if player is moving on water tiles and create ripples
      const body = this.player.body as Phaser.Physics.Arcade.Body;
      if (body.velocity.length() > 0) {
        this.checkAndCreateRipple(time);
      }

      // Check if hit status should end
      if (this.isHit && time >= this.hitEndTime) {
        this.isHit = false;
      }
    }

    // Update anglerfish AI
    if (this.anglerfish) {
      this.anglerfish.update(time, this.groundLayer);
    }
  }

  private checkAndCreateRipple(time: number): void {
    // Throttle ripple creation
    if (time - this.lastRippleTime < WATER.RIPPLES.SPAWN_DELAY) {
      return;
    }

    // Get the tile the player is standing on
    const tileX = this.map.worldToTileX(this.player.x);
    const tileY = this.map.worldToTileY(this.player.y);

    if (tileX === null || tileY === null || !this.groundLayer) {
      return;
    }

    const tile = this.groundLayer.getTileAt(tileX, tileY);

    // Check if it's a water tile
    if (tile && tile.index === WATER.TILE_INDEX) {
      // Use red ripples if hit, otherwise white
      const color = this.isHit ? ANGLERFISH.RIPPLES.COLOR : WATER.RIPPLES.COLOR;
      this.createRipple(this.player.x, this.player.y, color);
      this.lastRippleTime = time;
    }
  }

  private createRipple(x: number, y: number, color: number = WATER.RIPPLES.COLOR): void {
    // Create a graphics object for the ripple (outline only)
    const ripple = this.add.graphics();
    ripple.lineStyle(WATER.RIPPLES.LINE_WIDTH, color, WATER.RIPPLES.OPACITY);
    ripple.strokeCircle(0, 0, 2);

    // Position at the specified location
    ripple.setPosition(x, y + WATER.RIPPLES.Y_OFFSET);
    ripple.setDepth(WATER.RIPPLES.DEPTH);

    // Create a mask from water tiles to clip ripples
    const mask = this.createWaterMask();
    if (mask) {
      ripple.setMask(mask);
    }

    // Animate the ripple expanding and fading
    this.tweens.add({
      targets: ripple,
      scaleX: WATER.RIPPLES.SCALE,
      scaleY: WATER.RIPPLES.SCALE,
      alpha: 0,
      duration: WATER.RIPPLES.DURATION,
      ease: 'Sine.easeOut',
      onComplete: () => {
        ripple.destroy();
      },
    });
  }

  private createWaterMask(): Phaser.Display.Masks.GeometryMask | null {
    if (!this.groundLayer) return null;

    const maskGraphics = this.make.graphics({}, false);
    maskGraphics.fillStyle(0xffffff);

    // Draw rectangles for each water tile
    for (let y = 0; y < this.map.height; y++) {
      for (let x = 0; x < this.map.width; x++) {
        const tile = this.groundLayer.getTileAt(x, y);
        if (tile && tile.index === WATER.TILE_INDEX) {
          const worldX = tile.pixelX;
          const worldY = tile.pixelY;
          maskGraphics.fillRect(worldX, worldY, this.map.tileWidth, this.map.tileHeight);
        }
      }
    }

    return maskGraphics.createGeometryMask();
  }

  private spawnLog(): void {
    // Check if we've reached max logs
    if (this.logs.countActive(true) >= LOGS.MAX_COUNT) {
      return;
    }

    // Find a random water tile at least MIN_SPAWN_DISTANCE_TILES away from player
    const waterTiles = this.getWaterTiles();
    if (waterTiles.length === 0) return;

    // Filter tiles by distance from player
    const playerTileX = this.map.worldToTileX(this.player.x);
    const playerTileY = this.map.worldToTileY(this.player.y);

    const farTiles = waterTiles.filter(tile => {
      const dx = tile.x - (playerTileX ?? 0);
      const dy = tile.y - (playerTileY ?? 0);
      const distanceInTiles = Math.sqrt(dx * dx + dy * dy);
      return distanceInTiles >= LOGS.MIN_SPAWN_DISTANCE_TILES;
    });

    // If no far tiles available, use any water tile
    const availableTiles = farTiles.length > 0 ? farTiles : waterTiles;
    const randomTile = Phaser.Utils.Array.GetRandom(availableTiles);
    const worldX = randomTile.pixelX + this.map.tileWidth / 2;
    const worldY = randomTile.pixelY + this.map.tileHeight / 2;

    // Create the log
    const log = new Log(this, worldX, worldY);
    this.logs.add(log);

    // Create spawn ripples
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
        if (tile && tile.index === WATER.TILE_INDEX) {
          tiles.push(tile);
        }
      }
    }

    return tiles;
  }

  private collectLog(
    _player: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    logObj: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ): void {
    const log = logObj as Log;

    // Add to score
    this.score += LOGS.POINTS_PER_LOG;

    // Create collection ripples
    for (let i = 0; i < 3; i++) {
      this.time.delayedCall(i * 100, () => {
        this.createRipple(log.x, log.y);
      });
    }

    // Collect the log (plays animation and destroys)
    log.collect(this.player);

    // Update UI score
    this.events.emit('scoreChanged', this.score);
  }

  private handleAnglerfishHit(
    _player: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    _anglerfish: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ): void {
    // Only trigger if not already hit
    if (!this.isHit) {
      this.isHit = true;
      this.hitEndTime = this.time.now + ANGLERFISH.HIT_DURATION;

      // Create red ripples at hit location
      for (let i = 0; i < 5; i++) {
        this.time.delayedCall(i * 100, () => {
          this.createRipple(this.player.x, this.player.y, ANGLERFISH.RIPPLES.COLOR);
        });
      }
    }
  }
}
