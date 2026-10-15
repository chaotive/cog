import { Grid, type Point, distance } from '../game/grid.ts';
import { Random } from '../game/random.ts';
import { TERRAIN, type Terrain, type SiteKind } from './data.ts';

export interface Tile { terrain: Terrain; seen: boolean }
export interface Site extends Point { id: string; kind: SiteKind; name: string; description: string; resolved: boolean; lastUsed: number }
export interface Enemy extends Point { id: string; name: string; strength: number; alive: boolean }
export interface World { seed: number; width: number; height: number; tiles: Tile[]; sites: Site[]; enemies: Enemy[] }
export const WIDTH = 42, HEIGHT = 30;
export const tileAt = (world: World, p: Point): Tile | undefined => p.x >= 0 && p.y >= 0 && p.x < world.width && p.y < world.height && Number.isInteger(p.x) && Number.isInteger(p.y) ? world.tiles[p.y * world.width + p.x] : undefined;
export const passable = (world: World, p: Point): boolean => (TERRAIN[tileAt(world, p)?.terrain ?? 'ocean'].cost > 0);
export const siteAt = (world: World, p: Point): Site | undefined => world.sites.find(s => s.x === p.x && s.y === p.y);

export function generateWorld(seed: number): World {
  const rng = new Random(seed);
  const grid = new Grid<Tile>(WIDTH, HEIGHT, (x, y) => {
    const coast = 6 + Math.sin(y * .37) * 1.8 + Math.cos(y * .7) * .7;
    const east = 39 + Math.sin(y * .4);
    let terrain: Terrain = 'grass';
    if (x < coast || x > east || y < 2 || y > 27) terrain = 'ocean';
    else if (x < coast + 1.6 || y === 2 || y === 27 || x > east - 1) terrain = 'shore';
    else if (Math.abs(y - (11 + Math.sin(x * .28) * 3)) < .65 && x < 33) terrain = 'river';
    else {
      const n = Math.sin(x * .38) + Math.cos(y * .51) + rng.next() * .9;
      if (x > 18 && n > 1.65) terrain = 'mountain';
      else if (n > 1.15) terrain = 'hill';
      else if (n < -.4) terrain = 'jungle';
      else if (rng.next() > .55) terrain = 'forest';
    }
    return { terrain, seen: false };
  });
  const sites: Site[] = [];
  const add = (id: string, kind: SiteKind, name: string, x: number, y: number, description: string) => {
    grid.set({ x, y }, { terrain: kind === 'ship' ? 'shore' : 'grass', seen: false });
    sites.push({ id, kind, name, x, y, description, resolved: false, lastUsed: -100 });
  };
  add('ship', 'ship', 'The Marigold', 8, 16, 'Your little caravel waits at anchor. Store treasure, rest, or bring the expedition home.');
  add('village1', 'village', 'Yara', 14, 16, 'Gardens grow between painted houses. The people of Yara welcome respectful travelers.');
  add('ruin1', 'ruin', 'The Listening Stones', 12, 9, 'Wind sings through a ring of carved stone. A forgotten cache lies beneath the roots.');
  add('spring1', 'spring', 'Bluewater Cenote', 19, 16, 'Clear water catches the light beneath a curtain of ferns. A place to recover.');
  add('city1', 'city', 'Ixim · City of Dawn', 22, 7, 'Amber towers rise above the cloud forest. The first sun seal rests in a quiet sanctuary.');
  add('village2', 'village', 'Amaru', 25, 15, 'A hillside town of terraces and woven banners. The council keeps the old routes alive.');
  add('ruin2', 'ruin', 'Temple of the Heron', 20, 23, 'A white heron watches over an abandoned temple. The stonework holds a secret.');
  add('spring2', 'spring', 'The Silver Falls', 29, 23, 'A silver ribbon of water tumbles into a cool, shaded pool.');
  add('city2', 'city', 'Tayrona · City of Rivers', 33, 22, 'Golden bridges span the river. The second sun seal honors those who journey with care.');
  add('ruin3', 'ruin', 'Observatory of Ash', 30, 10, 'An ancient observatory charts a sky you almost recognize.');
  add('city3', 'city', 'Manoa · City of the Sun', 36, 6, 'The last city shines on the horizon. Here, the three paths of the sun become one.');
  // Every landmark has a guaranteed traversable route to the ship, across all seeds.
  for (const site of sites) {
    let x = 8, y = 16;
    while (x !== site.x || y !== site.y) {
      if (x !== site.x && (rng.next() > .45 || y === site.y)) x += Math.sign(site.x - x);
      else y += Math.sign(site.y - y);
      const p = { x, y };
      if (TERRAIN[grid.get(p)!.terrain].cost === 0) grid.set(p, { terrain: 'grass', seen: false });
    }
  }
  const enemies: Enemy[] = [];
  for (let i = 0; i < 10; i++) {
    for (let tries = 0; tries < 100; tries++) {
      const p = { x: rng.int(14, 37), y: rng.int(4, 25) };
      if (TERRAIN[grid.get(p)!.terrain].cost && sites.every(s => distance(s, p) > 3) && enemies.every(e => distance(e, p) > 2)) {
        enemies.push({ ...p, id: `enemy${i}`, name: i % 3 === 0 ? 'Rival expedition' : 'Jaguar', strength: i % 3 === 0 ? 28 : 19, alive: true }); break;
      }
    }
  }
  return { seed, width: WIDTH, height: HEIGHT, tiles: grid.cells, sites, enemies };
}
