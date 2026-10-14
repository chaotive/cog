import { Grid } from './grid';

export enum Visibility {
  Unseen = 0,
  Explored = 1,
  Visible = 2
}

/** Fog of war: tracks which cells have ever been seen, and which are visible right now. */
export class FogOfWar {
  readonly grid: Grid<Visibility>;

  constructor(width: number, height: number) {
    this.grid = new Grid<Visibility>(width, height, () => Visibility.Unseen);
  }

  /** Recompute visibility around (cx, cy) with a circular radius. Returns how many cells were seen for the first time. */
  reveal(cx: number, cy: number, radius: number): number {
    const cells = this.grid.cells;
    for (let i = 0; i < cells.length; i++) {
      if (cells[i] === Visibility.Visible) cells[i] = Visibility.Explored;
    }
    let discovered = 0;
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

  isExplored(x: number, y: number): boolean {
    return this.grid.get(x, y) !== Visibility.Unseen;
  }
}
