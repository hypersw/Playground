/**
 * Mouse grade definitions.
 *
 * Each grade has a hue shift (applied to the base sprite), speed, value,
 * and spawn weight. Higher grades are rarer but faster and more valuable.
 */

export interface MouseGrade {
  id: string;
  /** Hue shift in degrees (0-360) applied to the base mouse sprite */
  hueShift: number;
  /** Saturation multiplier (1.0 = original, 0.3 = grey) */
  saturation: number;
  /** Flee speed in px/s */
  speed: number;
  /** EUR awarded when caught by player */
  value: number;
  /** Relative spawn weight (higher = more common) */
  weight: number;
}

export const MOUSE_GRADES: MouseGrade[] = [
  { id: 'common', hueShift: 0,   saturation: 0.3, speed: 80,  value: 5,  weight: 35 },
  { id: 'green',  hueShift: 120, saturation: 1.0, speed: 100, value: 8,  weight: 25 },
  { id: 'blue',   hueShift: 200, saturation: 1.0, speed: 120, value: 15, weight: 20 },
  { id: 'purple', hueShift: 270, saturation: 1.0, speed: 145, value: 25, weight: 15 },
  { id: 'gold',   hueShift: 40,  saturation: 1.4, speed: 165, value: 60, weight: 5  },
];

/** Pick a random grade based on spawn weights */
export function pickMouseGrade(): MouseGrade {
  const totalWeight = MOUSE_GRADES.reduce((sum, g) => sum + g.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const grade of MOUSE_GRADES) {
    roll -= grade.weight;
    if (roll <= 0) return grade;
  }
  return MOUSE_GRADES[0];
}
