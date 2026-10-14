/**
 * Generic 2D Grid Coordinate utilities and math.
 */

export interface GridCoord {
  x: number;
  y: number;
}

export type Direction = 'N' | 'S' | 'E' | 'W' | 'NE' | 'NW' | 'SE' | 'SW';

export const DIRECTION_VECTORS: Record<Direction, GridCoord> = {
  N:  { x: 0,  y: -1 },
  S:  { x: 0,  y: 1 },
  E:  { x: 1,  y: 0 },
  W:  { x: -1, y: 0 },
  NE: { x: 1,  y: -1 },
  NW: { x: -1, y: -1 },
  SE: { x: 1,  y: 1 },
  SW: { x: -1, y: 1 },
};

export const CARDINAL_DIRECTIONS: Direction[] = ['N', 'S', 'E', 'W'];
export const ALL_DIRECTIONS: Direction[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

export function coordsEqual(a: GridCoord, b: GridCoord): boolean {
  return a.x === b.x && a.y === b.y;
}

export function coordKey(c: GridCoord): string {
  return `${c.x},${c.y}`;
}

export function parseCoordKey(key: string): GridCoord {
  const [x, y] = key.split(',').map(Number);
  return { x, y };
}

export function manhattanDistance(a: GridCoord, b: GridCoord): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function chebyshevDistance(a: GridCoord, b: GridCoord): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

export function euclideanDistance(a: GridCoord, b: GridCoord): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function addCoords(a: GridCoord, b: GridCoord): GridCoord {
  return { x: a.x + b.x, y: a.y + b.y };
}
