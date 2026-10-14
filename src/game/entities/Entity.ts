import { GridCoord } from '../grid/GridCoord';

/**
 * Base generic entity for grid-based games.
 */
export class Entity {
  public readonly id: string;
  public name: string;
  public x: number;
  public y: number;
  public isPassable: boolean;
  public isActive: boolean;
  public tags: Set<string>;

  constructor(id: string, name: string, x: number, y: number, isPassable: boolean = true) {
    this.id = id;
    this.name = name;
    this.x = x;
    this.y = y;
    this.isPassable = isPassable;
    this.isActive = true;
    this.tags = new Set();
  }

  public get coord(): GridCoord {
    return { x: this.x, y: this.y };
  }

  public setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  public hasTag(tag: string): boolean {
    return this.tags.has(tag);
  }

  public addTag(tag: string): void {
    this.tags.add(tag);
  }

  public removeTag(tag: string): void {
    this.tags.delete(tag);
  }
}
