/**
 * Determine cardinal direction from a velocity vector.
 *
 * Horizontal (left/right) is preferred by default. Vertical only wins
 * when |vy| > |vx| × threshold — a narrow cone around the vertical
 * axis. At threshold=1.5, vertical needs to be 1.5× horizontal to
 * win, which is roughly a ±34° cone from vertical (±56° from horizontal).
 *
 * Returns null if velocity is negligible (< 1 in both axes).
 */
export function directionFromVelocity(
  vx: number,
  vy: number,
  /** Higher = narrower vertical cone. 1.5 ≈ ±34° from vertical axis. */
  verticalThreshold: number = 1.5,
): 'up' | 'down' | 'left' | 'right' | null {
  const ax = Math.abs(vx);
  const ay = Math.abs(vy);

  if (ax < 1 && ay < 1) return null;

  if (ay > ax * verticalThreshold) {
    return vy < 0 ? 'up' : 'down';
  }
  return vx < 0 ? 'left' : 'right';
}
