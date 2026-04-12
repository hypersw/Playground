/**
 * Determine cardinal direction from a velocity vector.
 *
 * Vertical (up/down) wins when |vy| > |vx| × threshold, giving a
 * ~30° cone around the vertical axis where up/down sprites show
 * instead of left/right. This prevents actors from always appearing
 * sideways during diagonal movement.
 *
 * Returns null if velocity is negligible (< 1 in both axes).
 */
export function directionFromVelocity(
  vx: number,
  vy: number,
  /** Lower = wider vertical cone. 0.6 ≈ ±30° from vertical. */
  verticalBias: number = 0.6,
): 'up' | 'down' | 'left' | 'right' | null {
  const ax = Math.abs(vx);
  const ay = Math.abs(vy);

  if (ax < 1 && ay < 1) return null;

  if (ay > ax * verticalBias) {
    return vy < 0 ? 'up' : 'down';
  }
  return vx < 0 ? 'left' : 'right';
}
