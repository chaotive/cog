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

  /** Flood fill from `start` through cells accepted by `passable`. */
  reachable(start: Point, passable: (x: number, y: number, cell: T) => boolean): Point[] {
    const seen = new Set<number>([start.y * this.width + start.x]);
    const queue: Point[] = [start];
    const result: Point[] = [];
    while (queue.length) {
      const p = queue.shift()!;
      result.push(p);
      for (const n of this.neighbors4(p.x, p.y)) {
        const key = n.y * this.width + n.x;
        if (seen.has(key) || !passable(n.x, n.y, this.get(n.x, n.y))) continue;
        seen.add(key);
        queue.push(n);
      }
    }
    return result;
  }
}
