import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Random } from '../src/game/random.ts';
import { findPath, same } from '../src/game/grid.ts';
import { TurnClock } from '../src/game/turns.ts';
import { Expedition, loadGame, saveGame } from '../src/cog/expedition.ts';
import { generateWorld, passable, tileAt } from '../src/cog/world.ts';

function start(seed = 12345): Expedition { const e = new Expedition(seed); e.outfit('balanced', 'food'); e.land(); return e; }
function visit(e: Expedition, id: string): void { const site = e.state.world.sites.find(s => s.id === id)!; e.state.player = { x: site.x, y: site.y }; }

test('world generation is repeatable and every landmark is reachable across 100 seeds', () => {
  assert.deepEqual(generateWorld(123), generateWorld(123));
  for (let seed = 1; seed <= 100; seed++) {
    const world = generateWorld(seed);
    const ship = world.sites[0];
    for (const site of world.sites) {
      const route = findPath(ship, site, p => passable(world, p));
      assert.notEqual(route, null, `Seed ${seed}: ${site.id} must be reachable`);
    }
    const positions = new Set(world.enemies.map(e => `${e.x},${e.y}`));
    assert.equal(positions.size, world.enemies.length);
  }
});
test('random sequence continues exactly after serialization', () => {
  const r = new Random(888); r.next(); r.next();
  const restored = new Random(r.state);
  assert.equal(r.next(), restored.next());
});
test('a turn is atomic and rejects nested turns', () => {
  const clock = new TurnClock(); const order: string[] = [];
  clock.commit({ player: () => { order.push('player'); assert.equal(clock.commit({ player() {}, enemies() {}, world() {} }), false); }, enemies: () => order.push('enemies'), world: () => order.push('world') });
  assert.deepEqual(order, ['player', 'enemies', 'world']); assert.equal(clock.turn, 1);
});
test('outfitting and landing are required before actions', () => {
  const e = new Expedition(123); assert.equal(e.act('wait'), false);
  e.outfit('scout', 'tools'); assert.equal(e.state.phase, 'voyage');
  assert.equal(e.state.scouts, 4); assert.equal(e.state.tools, 9);
  assert.equal(e.act('wait'), false); e.land(); assert.equal(e.act('wait'), true); assert.equal(e.state.day, 1);
});
test('movement costs a turn, reveals land, and rejects teleportation and ocean', () => {
  const e = start(), s = e.state, before = s.supplies;
  assert.equal(e.move({ x: 30, y: 20 }), false); assert.equal(s.day, 0);
  const next = [{ x: 9, y: 16 }, { x: 8, y: 15 }, { x: 8, y: 17 }].find(p => passable(s.world, p))!;
  assert.equal(e.move(next), true); assert.ok(s.supplies < before); assert.equal(s.day, 1); assert.ok(tileAt(s.world, next)?.seen);
  assert.equal(e.move({ x: next.x + .5, y: next.y + .5 }), false);
});
test('foraging has a tile cooldown, and supplies never go negative', () => {
  const e = start(); e.state.supplies = 30;
  assert.ok(e.act('forage')); assert.ok(e.state.supplies > 30); assert.equal(e.act('forage'), false);
  for (let i = 0; i < 9; i++) e.act('wait');
  assert.equal(e.act('forage'), true);
  e.state.supplies = 0; e.act('wait'); assert.equal(e.state.supplies, 0); assert.equal(e.state.health, 91);
});
test('settlement stories grant trust once and allow peaceful seal recovery', () => {
  const e = start(); visit(e, 'village1'); assert.equal(e.act('stories'), true); assert.equal(e.act('stories'), false);
  visit(e, 'village2'); e.act('stories'); assert.equal(e.state.trust, 2);
  e.state.tools = 0; visit(e, 'city1'); assert.equal(e.act('seal'), true); assert.equal(e.state.tools, 0); assert.equal(e.state.seals, 1); assert.equal(e.act('seal'), false);
});
test('cities require tools or trust and cannot be looted repeatedly', () => {
  const e = start(); visit(e, 'city1'); e.state.tools = 1; assert.equal(e.act('seal'), false);
  e.state.tools = 2; assert.equal(e.act('seal'), true); assert.equal(e.state.tools, 0); assert.equal(e.state.seals, 1); assert.equal(e.act('seal'), false);
});
test('ruins reveal a distant city and pay out only once', () => {
  const e = start(); visit(e, 'ruin1'); const before = e.state.gold; e.act('excavate');
  assert.equal(e.state.gold, before + 45); assert.equal(e.act('excavate'), false);
  assert.ok(e.state.world.sites.some(site => site.kind === 'city' && tileAt(e.state.world, site)?.seen));
});
test('banking and a complete three-seal return produce a finished expedition', () => {
  const e = start();
  for (const id of ['city1', 'city2', 'city3']) { visit(e, id); assert.ok(e.act('seal')); }
  visit(e, 'ship'); const gold = e.state.gold; e.act('bank'); assert.equal(e.state.banked, gold); assert.equal(e.state.gold, 0);
  e.act('finish'); assert.equal(e.state.phase, 'won'); assert.ok(e.state.ending.includes('Three sun seals')); assert.equal(e.act('wait'), false);
});
test('early return produces a different ending', () => {
  const e = start(); e.act('finish'); assert.equal(e.state.phase, 'won'); assert.ok(e.state.ending.includes('another voyage'));
});
test('starvation can end the game and blocks subsequent actions', () => {
  const e = start(); e.state.supplies = 0; e.state.health = 8; e.act('wait');
  assert.equal(e.state.phase, 'lost'); assert.equal(e.state.health, 0); assert.equal(e.act('camp'), false);
});
test('enemies pursue and attack on turns, but landmarks are safe', () => {
  const e = start(); e.state.world.enemies = [{ id: 'test', x: 9, y: 16, name: 'Jaguar', strength: 19, alive: true }];
  e.act('wait'); assert.equal(e.state.health, 100); assert.equal(e.state.world.enemies[0].alive, true);
  e.move({ x: 9, y: 16 }); assert.equal(e.state.world.enemies[0].alive, false); assert.ok(e.state.health < 100); assert.ok(same(e.state.player, { x: 8, y: 16 }));
});
test('camp and medicine enforce costs and never exceed maximum health', () => {
  const e = start(); e.state.health = 90; e.state.morale = 90; const food = e.state.supplies;
  e.act('camp'); assert.equal(e.state.health, 100); assert.equal(e.state.supplies, food - 5);
  e.state.health = 50; const medicine = e.state.medicine; e.act('medicine'); assert.equal(e.state.health, 85); assert.equal(e.state.medicine, medicine - 1);
});
test('saves round-trip, continue deterministic actions, and reject corrupt input', () => {
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { setItem: (k: string, v: string) => storage.set(k, v), getItem: (k: string) => storage.get(k) ?? null } });
  const e = start(); e.act('forage'); assert.equal(saveGame(e.state), true); const saved = loadGame(); assert.ok(saved);
  const restored = new Expedition(undefined, saved); e.act('wait'); restored.act('wait'); assert.deepEqual(restored.state, e.state);
  storage.set('cog.atlas.v1', '{broken'); assert.equal(loadGame(), undefined);
  const bad = structuredClone(e.state); bad.world.tiles[0].terrain = 'bad' as any;
  storage.set('cog.atlas.v1', JSON.stringify(bad)); assert.equal(loadGame(), undefined);
  const badPosition = structuredClone(e.state); badPosition.player.x = -1;
  storage.set('cog.atlas.v1', JSON.stringify(badPosition)); assert.equal(loadGame(), undefined);
});

test('a full walking journey is winnable using ordinary orders across 20 seeds', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const e = start(seed);
    const walkTo = (id: string) => {
      const target = e.state.world.sites.find(s => s.id === id)!;
      const path = findPath(e.state.player, target, p => passable(e.state.world, p))!;
      for (const p of path) {
        // A cautious captain forages and treats wounds before pressing on.
        if (e.state.supplies < 40 && e.actions().some(a => a.id === 'forage' && a.enabled)) e.act('forage');
        if (e.state.health < 60 && e.state.medicine > 0) e.act('medicine');
        if (e.state.health < 65 && e.state.supplies > 30) e.act('camp');
        let attempts = 0;
        while (!same(e.state.player, p) && attempts++ < 3) e.move(p);
        assert.equal(e.state.phase, 'exploring', `Seed ${seed} failed en route to ${id} on day ${e.state.day}`);
        assert.ok(same(e.state.player, p));
      }
    };
    for (const id of ['village1', 'village2']) { walkTo(id); e.act('stories'); }
    for (const id of ['city1', 'city3', 'city2']) { walkTo(id); assert.ok(e.act('seal')); }
    walkTo('ship'); assert.ok(e.act('finish')); assert.equal(e.state.phase, 'won'); assert.equal(e.state.seals, 3);
  }
});
