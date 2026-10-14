import { Entity } from './Entity';
import { GridCoord, coordKey } from '../grid/GridCoord';

/**
 * Generic spatial Entity Manager.
 */
export class EntityManager<T extends Entity = Entity> {
  private entities: Map<string, T> = new Map();
  private spatialIndex: Map<string, Set<T>> = new Map();

  public add(entity: T): void {
    this.entities.set(entity.id, entity);
    this.addToSpatialIndex(entity, entity.x, entity.y);
  }

  public remove(entityOrId: T | string): T | undefined {
    const id = typeof entityOrId === 'string' ? entityOrId : entityOrId.id;
    const entity = this.entities.get(id);
    if (!entity) return undefined;

    this.removeFromSpatialIndex(entity, entity.x, entity.y);
    this.entities.delete(id);
    return entity;
  }

  public get(id: string): T | undefined {
    return this.entities.get(id);
  }

  public getAll(): T[] {
    return Array.from(this.entities.values());
  }

  public getAt(x: number, y: number): T[] {
    const key = coordKey({ x, y });
    const set = this.spatialIndex.get(key);
    return set ? Array.from(set) : [];
  }

  public getAtCoord(coord: GridCoord): T[] {
    return this.getAt(coord.x, coord.y);
  }

  public hasBlockingAt(x: number, y: number): boolean {
    const entities = this.getAt(x, y);
    return entities.some(e => e.isActive && !e.isPassable);
  }

  public move(entity: T, newX: number, newY: number): void {
    this.removeFromSpatialIndex(entity, entity.x, entity.y);
    entity.setPosition(newX, newY);
    this.addToSpatialIndex(entity, newX, newY);
  }

  public clear(): void {
    this.entities.clear();
    this.spatialIndex.clear();
  }

  private addToSpatialIndex(entity: T, x: number, y: number): void {
    const key = coordKey({ x, y });
    if (!this.spatialIndex.has(key)) {
      this.spatialIndex.set(key, new Set());
    }
    this.spatialIndex.get(key)!.add(entity);
  }

  private removeFromSpatialIndex(entity: T, x: number, y: number): void {
    const key = coordKey({ x, y });
    const set = this.spatialIndex.get(key);
    if (set) {
      set.delete(entity);
      if (set.size === 0) {
        this.spatialIndex.delete(key);
      }
    }
  }
}
