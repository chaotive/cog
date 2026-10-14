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
  [Terrain.Mountain]: 0x6f6f78
};

export const isWater = (t: Terrain) => t === Terrain.DeepSea || t === Terrain.Sea;
export const isWalkable = (t: Terrain) => !isWater(t) && t !== Terrain.Mountain;

export type PoiKind = 'city' | 'village';

export interface Poi {
  kind: PoiKind;
  name: string;
  x: number;
  y: number;
  /** City: discovered and allied. Village: already traded with. */
  visited: boolean;
}

export interface EnemyData {
  x: number;
  y: number;
  strength: number;
}

export interface World {
  seed: number;
  terrain: Grid<Terrain>;
  pois: Poi[];
  enemies: EnemyData[];
  /** Open-sea cell where the ship starts. */
  shipStart: Point;
}

const CITY_NAMES = ['Cibola', 'Quivira', 'Paititi', 'El Dorado', 'Manoa', 'Hawikuh', 'Tayopa'];

export function generateWorld(seed: number): World {
  const rng = new Rng(seed);
  const noise = new ValueNoise(seed);

  const terrain = new Grid<Terrain>(MAP_W, MAP_H, (x, y) => {
    // Bias elevation upward to the east so there is open sea in the west and a continent in the east.
    // Cells near the map edge are pushed down so the continent is surrounded by water.
    const edge = Math.min(x, MAP_W - 1 - x, y, MAP_H - 1 - y) / 6;
    const eastward = (x / MAP_W - 0.3) * 1.6;
    const e = noise.fractal(x / 14, y / 14, 4) + eastward - Math.max(0, 1 - edge) * 0.5;
    if (e < 0.25) return Terrain.DeepSea;
    if (e < 0.5) return Terrain.Sea;
    if (e < 0.56) return Terrain.Beach;
    if (e > 0.98) return Terrain.Mountain;
    if (e > 0.85) return Terrain.Hills;
    return noise.fractal(x / 9 + 100, y / 9 + 100, 3) > 0.55 ? Terrain.Forest : Terrain.Grass;
  });

  const shipStart = findShipStart(terrain);

  // Everything is placed on the biggest landmass the ship can actually reach.
  const sea = terrain.reachable(shipStart, isWater);
  const shoreSeeds: Point[] = [];
  for (const p of sea) {
    for (const n of terrain.neighbors4(p.x, p.y)) if (isWalkable(terrain.get(n.x, n.y))) shoreSeeds.push(n);
  }
  let land: Point[] = [];
  const claimed = new Set<number>();
  for (const s of shoreSeeds) {
    if (claimed.has(s.y * MAP_W + s.x)) continue;
    const region = terrain.reachable(s, isWalkable);
    for (const p of region) claimed.add(p.y * MAP_W + p.x);
    if (region.length > land.length) land = region;
  }

  const used = new Set<number>();
  const take = (minX: number, spacing: number): Point | null => {
    for (let tries = 0; tries < 400; tries++) {
      const p = rng.pick(land);
      // Relax constraints as tries run out so small continents still get populated.
      const relax = tries > 200;
      if (!relax && p.x < minX) continue;
      if (used.has(p.y * MAP_W + p.x)) continue;
      if (!relax && [...used].some((k) => Math.abs((k % MAP_W) - p.x) + Math.abs(Math.floor(k / MAP_W) - p.y) < spacing)) continue;
      used.add(p.y * MAP_W + p.x);
      return p;
    }
    return null;
  };

  const pois: Poi[] = [];
  const names = [...CITY_NAMES];
  for (let i = 0; i < CITY_COUNT; i++) {
    const p = take(Math.floor(MAP_W * 0.6), 10);
    const name = names.splice(rng.int(0, names.length - 1), 1)[0];
    if (p) pois.push({ kind: 'city', name, x: p.x, y: p.y, visited: false });
  }
  for (let i = 0; i < VILLAGE_COUNT; i++) {
    const p = take(Math.floor(MAP_W * 0.4), 4);
    if (p) pois.push({ kind: 'village', name: 'Native village', x: p.x, y: p.y, visited: false });
  }

  const enemies: EnemyData[] = [];
  for (let i = 0; i < ENEMY_COUNT; i++) {
    const p = take(Math.floor(MAP_W * 0.45), 2);
    // Raiders get tougher further inland.
    if (p) enemies.push({ x: p.x, y: p.y, strength: rng.int(2, 5) + Math.floor((p.x / MAP_W) * 6) });
  }

  return { seed, terrain, pois, enemies, shipStart };
}

function findShipStart(terrain: Grid<Terrain>): Point {
  const mid = Math.floor(MAP_H / 2);
  for (let x = 2; x < MAP_W; x++) {
    for (let dy = 0; dy < MAP_H; dy++) {
      const y = (mid + dy) % MAP_H;
      if (isWater(terrain.get(x, y))) return { x, y };
    }
  }
  return { x: 0, y: mid };
}
