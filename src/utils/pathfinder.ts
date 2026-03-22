/**
 * A* pathfinder for tile grids.
 *
 * findPath returns an array of tile coordinates [{x, y}, ...] from
 * (startX, startY) to (endX, endY), or an empty array if no path exists.
 *
 * walkable[row][col] === true means that tile may be traversed.
 * Uses 4-directional movement (suits corridor-style water bodies).
 */

interface AStarNode {
  x: number;
  y: number;
  g: number;
  f: number;
  parent: AStarNode | null;
}

export function findPath(
  walkable: boolean[][],
  startX: number,
  startY: number,
  endX: number,
  endY: number
): Array<{ x: number; y: number }> {
  const rows = walkable.length;
  const cols = rows > 0 ? walkable[0].length : 0;

  // Basic bounds / walkability checks
  if (
    startX < 0 || startX >= cols || startY < 0 || startY >= rows ||
    endX < 0 || endX >= cols || endY < 0 || endY >= rows ||
    !walkable[startY][startX] || !walkable[endY][endX]
  ) {
    return [];
  }

  if (startX === endX && startY === endY) return [];

  const key = (x: number, y: number) => y * cols + x;

  const gScore = new Map<number, number>();
  const fScore = new Map<number, number>();
  const cameFrom = new Map<number, AStarNode>();
  const openSet: AStarNode[] = [];
  const closedSet = new Set<number>();

  const octile = (x: number, y: number) => {
    const hdx = Math.abs(x - endX);
    const hdy = Math.abs(y - endY);
    return Math.max(hdx, hdy) + (1.414 - 1) * Math.min(hdx, hdy);
  };

  const start: AStarNode = { x: startX, y: startY, g: 0, f: octile(startX, startY), parent: null };
  openSet.push(start);
  gScore.set(key(startX, startY), 0);

  // 8-directional; diagonal moves have cost √2 ≈ 1.414
  const DIRS: Array<[number, number, number]> = [
    [0, -1, 1], [0, 1, 1], [-1, 0, 1], [1, 0, 1],
    [-1, -1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [1, 1, 1.414],
  ];

  while (openSet.length > 0) {
    // Pop node with lowest f — linear scan is fine for small grids (≤2000 cells)
    let bestIdx = 0;
    for (let i = 1; i < openSet.length; i++) {
      if (openSet[i].f < openSet[bestIdx].f) bestIdx = i;
    }
    const current = openSet[bestIdx];
    openSet.splice(bestIdx, 1);

    if (current.x === endX && current.y === endY) {
      // Reconstruct path
      const path: Array<{ x: number; y: number }> = [];
      let node: AStarNode | null = current;
      while (node) {
        path.unshift({ x: node.x, y: node.y });
        node = node.parent;
      }
      // Drop the start tile (we're already there)
      path.shift();
      return path;
    }

    const ck = key(current.x, current.y);
    closedSet.add(ck);

    for (const [dx, dy, moveCost] of DIRS) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
      if (!walkable[ny][nx]) continue;

      // Prevent cutting through diagonal wall corners
      if (dx !== 0 && dy !== 0) {
        if (!walkable[current.y][nx] || !walkable[ny][current.x]) continue;
      }

      const nk = key(nx, ny);
      if (closedSet.has(nk)) continue;

      const tentativeG = current.g + moveCost;
      if (tentativeG >= (gScore.get(nk) ?? Infinity)) continue;

      // Octile heuristic to stay admissible with diagonal costs
      const hdx = Math.abs(nx - endX);
      const hdy = Math.abs(ny - endY);
      const h = Math.max(hdx, hdy) + (1.414 - 1) * Math.min(hdx, hdy);

      const neighbor: AStarNode = {
        x: nx, y: ny,
        g: tentativeG,
        f: tentativeG + h,
        parent: current,
      };
      gScore.set(nk, tentativeG);
      fScore.set(nk, neighbor.f);
      cameFrom.set(nk, neighbor);

      // Only add to open set if not already there with a better score
      const existing = openSet.findIndex(n => n.x === nx && n.y === ny);
      if (existing !== -1) {
        openSet[existing] = neighbor;
      } else {
        openSet.push(neighbor);
      }
    }
  }

  return []; // No path found
}

/**
 * Build a walkable boolean grid from a Phaser tilemap ground layer.
 * A tile is walkable if its index equals walkableTileIndex.
 */
export function buildWalkableGrid(
  groundLayer: Phaser.Tilemaps.TilemapLayer,
  walkableTileIndex: number
): boolean[][] {
  const map = groundLayer.tilemap;
  const grid: boolean[][] = [];
  for (let row = 0; row < map.height; row++) {
    const rowArr: boolean[] = [];
    for (let col = 0; col < map.width; col++) {
      const tile = groundLayer.getTileAt(col, row);
      rowArr.push(tile !== null && tile.index === walkableTileIndex);
    }
    grid.push(rowArr);
  }
  return grid;
}
