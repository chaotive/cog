import { GridCoord, coordsEqual, CARDINAL_DIRECTIONS, ALL_DIRECTIONS, DIRECTION_VECTORS } from './GridCoord';

/**
 * Generic 2D Grid container for cell-based games.
 */
export class Grid2D<T> {
  public readonly width: number;
  public readonly height: number;
  private readonly cells: T[];

  constructor(width: number, height: number, defaultValue: T | ((x: number, y: number) => T)) {
    this.width = width;
    this.height = height;
    this.cells = new Array<T>(width * height);

    if (typeof defaultValue === 'function') {
      const fn = defaultValue as (x: number, y: number) => T;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          this.cells[y * width + x] = fn(x, y);
        }
      }
    } else {
      this.cells.fill(defaultValue);
    }
  }

  public isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  public isInBoundsCoord(coord: GridCoord): boolean {
    return this.isInBounds(coord.x, coord.y);
  }

  public get(x: number, y: number): T | undefined {
    if (!this.isInBounds(x, y)) {
      return undefined;
    }
    return this.cells[y * this.width + x];
  }

  public getCoord(coord: GridCoord): T | undefined {
    return this.get(coord.x, coord.y);
  }

  public set(x: number, y: number, value: T): boolean {
    if (!this.isInBounds(x, y)) {
      return false;
    }
    this.cells[y * this.width + x] = value;
    return true;
  }

  public setCoord(coord: GridCoord, value: T): boolean {
    return this.set(coord.x, coord.y, value);
  }

  public fill(valueOrFn: T | ((x: number, y: number) => T)): void {
    if (typeof valueOrFn === 'function') {
      const fn = valueOrFn as (x: number, y: number) => T;
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          this.cells[y * this.width + x] = fn(x, y);
        }
      }
    } else {
      this.cells.fill(valueOrFn);
    }
  }

  public forEach(callback: (value: T, x: number, y: number) => void): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        callback(this.cells[y * this.width + x], x, y);
      }
    }
  }

  public getNeighbors(
    x: number,
    y: number,
    includeDiagonals: boolean = false
  ): { coord: GridCoord; value: T }[] {
    const directions = includeDiagonals ? ALL_DIRECTIONS : CARDINAL_DIRECTIONS;
    const result: { coord: GridCoord; value: T }[] = [];

    for (const dir of directions) {
      const vec = DIRECTION_VECTORS[dir];
      const nx = x + vec.x;
      const ny = y + vec.y;

      if (this.isInBounds(nx, ny)) {
        result.push({
          coord: { x: nx, y: ny },
          value: this.cells[ny * this.width + nx],
        });
      }
    }

    return result;
  }
}
