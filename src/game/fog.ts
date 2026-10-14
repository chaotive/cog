import { Grid } from './grid';

export enum Visibility {
  Unseen = 0,
  Explored = 1,
  Visible = 2
}

/** Fog of war: tracks which cells have been seen, and which are visible right now. */
export class FogOfWar {
  readonly grid: Grid<Visibility>;

  constructor(width: number, height: number) {
    this.grid = new Grid<Visibility>(width, height, () => Visibility.Unseen);
  }

  /** Recompute visibility around `cx,cy` with a circular `radius`. Returns newly seen cell count. */
  reveal(cx: number, cy: number, radius: number): number {
    let discovered = 0;
    for (let i = 0; i < this.grid.cells.length; i++) {
      if (this.grid.cells[i] === Visibility.Visible) this.grid.cells[i] = Visibility.Explored;
    }
    for (let y = cy - radius; y <= cy + radius; y++) {
      for (let x = cx - radius; x <= cx + radius; x++) {
        if (!this.grid.inBounds(x, y)) continue;
        if ((x - cx) ** 2 + (y - cy) ** 2 > radius * radius + 1) continue;
        if (this.grid.get(x, y) === Visibility.Unseen) discovered++;
        this.grid.set(x, y, Visibility.Visible);
      }
    }
    return discovered;
  }

  isVisible(x: number, y: number): boolean {
    return this.grid.get(x, y) === Visibility.Visible;
  }
}
