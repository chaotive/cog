export interface Point {
  x: number;
  y: number;
}

export const DIRS_4: readonly Point[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 }
];

export const manhattan = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/** Generic fixed-size 2D grid of cells. */
export class Grid<T> {
  readonly cells: T[];

  constructor(readonly width: number, readonly height: number, fill: (x: number, y: number) => T) {
    this.cells = new Array<T>(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) this.cells[y * width + x] = fill(x, y);
    }
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  get(x: number, y: number): T {
    return this.cells[y * this.width + x];
  }

  set(x: number, y: number, value: T): void {
    this.cells[y * this.width + x] = value;
  }

  neighbors4(x: number, y: number): Point[] {
    const out: Point[] = [];
    for (const d of DIRS_4) {
      if (this.inBounds(x + d.x, y + d.y)) out.push({ x: x + d.x, y: y + d.y });
    }
    return out;
  }

  /** Flood fill from `start` through cells accepted by `passable`. Includes `start`. */
  reachable(start: Point, passable: (cell: T, x: number, y: number) => boolean): Point[] {
    const seen = new Set<number>([start.y * this.width + start.x]);
    const queue: Point[] = [start];
    for (let i = 0; i < queue.length; i++) {
      const p = queue[i];
      for (const n of this.neighbors4(p.x, p.y)) {
        const key = n.y * this.width + n.x;
        if (seen.has(key) || !passable(this.get(n.x, n.y), n.x, n.y)) continue;
        seen.add(key);
        queue.push(n);
      }
    }
    return queue;
  }

  /**
   * Breadth-first search from `from` to `to`, giving up beyond `maxDepth` steps.
   * Returns the first step of a shortest path, or null if unreachable.
   * `to` is always considered enterable so callers can path onto an occupied target.
   */
  nextStep(from: Point, to: Point, passable: (cell: T, x: number, y: number) => boolean, maxDepth = 32): Point | null {
    const w = this.width;
    const prev = new Map<number, number>([[from.y * w + from.x, -1]]);
    let frontier: Point[] = [from];
    for (let depth = 0; depth < maxDepth && frontier.length; depth++) {
      const next: Point[] = [];
      for (const p of frontier) {
        for (const n of this.neighbors4(p.x, p.y)) {
          const key = n.y * w + n.x;
          if (prev.has(key)) continue;
          const isGoal = n.x === to.x && n.y === to.y;
          if (!isGoal && !passable(this.get(n.x, n.y), n.x, n.y)) continue;
          prev.set(key, p.y * w + p.x);
          if (isGoal) {
            // Walk back to the cell right after `from`.
            let cur = key;
            while (prev.get(cur) !== from.y * w + from.x) cur = prev.get(cur)!;
            return { x: cur % w, y: Math.floor(cur / w) };
          }
          next.push(n);
        }
      }
      frontier = next;
    }
    return null;
  }
}
