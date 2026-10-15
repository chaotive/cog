export interface Point { x: number; y: number }
export const key = (p: Point): string => `${p.x},${p.y}`;
export const distance = (a: Point, b: Point): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
export const same = (a: Point, b: Point): boolean => a.x === b.x && a.y === b.y;
export const directions: readonly Point[] = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];

export class Grid<T> {
  readonly width: number;
  readonly height: number;
  readonly cells: T[];
  constructor(width: number, height: number, create: (x: number, y: number) => T) {
    this.width = width; this.height = height;
    this.cells = Array.from({ length: width * height }, (_, i) => create(i % width, Math.floor(i / width)));
  }
  contains(p: Point): boolean { return Number.isInteger(p.x) && Number.isInteger(p.y) && p.x >= 0 && p.y >= 0 && p.x < this.width && p.y < this.height; }
  get(p: Point): T | undefined { return this.contains(p) ? this.cells[p.y * this.width + p.x] : undefined; }
  set(p: Point, value: T): void { if (this.contains(p)) this.cells[p.y * this.width + p.x] = value; }
  neighbors(p: Point): Point[] { return directions.map(d => ({ x: p.x + d.x, y: p.y + d.y })).filter(n => this.contains(n)); }
}

/** Breadth-first search for games in which every step takes one turn. */
export function findPath(start: Point, goal: Point, passable: (p: Point) => boolean, limit = 5000): Point[] | null {
  if (same(start, goal)) return [];
  if (!passable(goal)) return null;
  const queue = [start];
  const parents = new Map<string, Point | null>([[key(start), null]]);
  for (let i = 0; i < queue.length && i < limit; i++) {
    const p = queue[i];
    for (const d of directions) {
      const n = { x: p.x + d.x, y: p.y + d.y };
      if (parents.has(key(n)) || !passable(n)) continue;
      parents.set(key(n), p);
      if (same(n, goal)) {
        const path: Point[] = [n];
        let prev = p;
        while (!same(prev, start)) { path.push(prev); prev = parents.get(key(prev))!; }
        return path.reverse();
      }
      queue.push(n);
    }
  }
  return null;
}
