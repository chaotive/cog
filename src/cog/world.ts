import { Grid, Point } from '../game/grid';
import { ValueNoise } from '../game/noise';
import { Rng } from '../game/rng';
import { CITY_COUNT, ENEMY_COUNT, MAP_H, MAP_W, VILLAGE_COUNT } from './config';

export enum Terrain {
  DeepSea,
  Sea,
  Beach,
  Grass,
  Forest,
  Hills,
  Mountain
}

export const TERRAIN_COLOR: Record<Terrain, number> = {
  [Terrain.DeepSea]: 0x10305a,
  [Terrain.Sea]: 0x1c4f8c,
  [Terrain.Beach]: 0xe0cf94,
  [Terrain.Grass]: 0x5c9e4a,
  [Terrain.Forest]: 0x2f6b34,
  [Terrain.Hills]: 0x9a8a55,
  [Terrain.Mountain]: 0x7d7d84
};

export const isWater = (t: Terrain) => t === Terrain.DeepSea || t === Terrain.Sea;
export const isLandWalkable = (t: Terrain) => !isWater(t) && t !== Terrain.Mountain;

export type PoiKind = 'city' | 'village';

export interface Poi {
  kind: PoiKind;
  x: number;
  y: number;
  visited: boolean;
}

export interface EnemyData {
  x: number;
  y: number;
  strength: number;
}

export interface World {
  terrain: Grid<Terrain>;
  pois: Poi[];
  enemies: EnemyData[];
  /** Water cell where the ship starts. */
  shipStart: Point;
}

export function generateWorld(seed: number): World {
  const rng = new Rng(seed);
  const noise = new ValueNoise(seed);

  const terrain = new Grid<Terrain>(MAP_W, MAP_H, (x, y) => {
    // Sea on the west, continent on the east, edges fall back into water.
    const edge = Math.min(x, MAP_W - 1 - x, y, MAP_H - 1 - y) / 6;
    const west = (x / MAP_W - 0.3) * 1.6;
    const e = noise.fractal(x / 14, y / 14, 4) + west - Math.max(0, 1 - edge) * 0.5;
    if (e < 0.25) return Terrain.DeepSea;
    if (e < 0.5) return Terrain.Sea;
    if (e < 0.56) return Terrain.Beach;
    const moisture = noise.fractal(x / 9 + 100, y / 9 + 100, 3);
    if (e > 0.98) return Terrain.Mountain;
    if (e > 0.85) return Terrain.Hills;
    return moisture > 0.55 ? Terrain.Forest : Terrain.Grass;
  });

  // Ship starts in the open sea on the west edge.
  let shipStart: Point = { x: 2, y: Math.floor(MAP_H / 2) };
  for (let dy = 0; dy < MAP_H; dy++) {
    const y = (Math.floor(MAP_H / 2) + dy) % MAP_H;
    if (isWater(terrain.get(2, y))) {
      shipStart = { x: 2, y };
      break;
    }
  }

  // Walkable land connected to a coast: the continent proper.
  const coast = findCoastLand(terrain);
  const land = coast ? terrain.reachable(coast, (_x, _y, t) => isLandWalkable(t)) : [];
  const used = new Set<number>();
  const take = (minX: number): Point | null => {
    for (let tries = 0; tries < 300; tries++) {
      const p = rng.pick(land);
      if (p.x < minX || used.has(p.y * MAP_W + p.x)) continue;
      used.add(p.y * MAP_W + p.x);
      return p;
    }
    return null;
  };

  const pois: Poi[] = [];
  for (let i = 0; i < CITY_COUNT; i++) {
    const p = take(Math.floor(MAP_W * 0.55));
    if (p) pois.push({ kind: 'city', x: p.x, y: p.y, visited: false });
  }
  for (let i = 0; i < VILLAGE_COUNT; i++) {
    const p = take(Math.floor(MAP_W * 0.35));
    if (p) pois.push({ kind: 'village', x: p.x, y: p.y, visited: false });
  }

  const enemies: EnemyData[] = [];
  for (let i = 0; i < ENEMY_COUNT; i++) {
    const p = take(Math.floor(MAP_W * 0.4));
    if (p) enemies.push({ x: p.x, y: p.y, strength: rng.int(3, 8) });
  }

  return { terrain, pois, enemies, shipStart };
}

function findCoastLand(terrain: Grid<Terrain>): Point | null {
  let best: Point | null = null;
  let bestSize = 0;
  for (let y = 0; y < terrain.height; y += 3) {
    for (let x = 0; x < terrain.width; x++) {
      if (!isLandWalkable(terrain.get(x, y))) continue;
      if (!terrain.neighbors4(x, y).some((n) => isWater(terrain.get(n.x, n.y)))) continue;
      const size = terrain.reachable({ x, y }, (_a, _b, t) => isLandWalkable(t)).length;
      if (size > bestSize) {
        bestSize = size;
        best = { x, y };
      }
    }
  }
  return best;
}
