import { distance, findPath, same, type Point } from '../game/grid.ts';
import { Random } from '../game/random.ts';
import { TurnClock } from '../game/turns.ts';
import { LOADOUTS, TERRAIN, type LoadoutId } from './data.ts';
import { generateWorld, passable, siteAt, tileAt, WIDTH, HEIGHT, type World, type Enemy } from './world.ts';

export type Phase = 'outfitting' | 'voyage' | 'exploring' | 'won' | 'lost';
export interface LogEntry { day: number; text: string; kind: 'discovery' | 'danger' | 'normal' }
export interface State {
  version: 1; phase: Phase; world: World; player: Point; day: number; rng: number;
  supplies: number; tools: number; medicine: number; gold: number; banked: number;
  crew: number; soldiers: number; scouts: number; health: number; morale: number;
  xp: number; trust: number; seals: number; loadout: LoadoutId;
  logs: LogEntry[]; foraged: Record<string, number>; ending: string;
}
export interface Action { id: string; label: string; detail: string; enabled: boolean }
const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

export class Expedition {
  state: State;
  onChange: (() => void) | null = null;
  private clock: TurnClock;
  constructor(seed = Math.floor(Math.random() * 999999) + 1, saved?: State) {
    this.state = saved ?? {
      version: 1, phase: 'outfitting', world: generateWorld(seed), player: { x: 8, y: 16 }, day: 0, rng: seed,
      supplies: 95, tools: 8, medicine: 3, gold: 35, banked: 0, crew: 12, soldiers: 3, scouts: 2,
      health: 100, morale: 85, xp: 0, trust: 0, seals: 0, loadout: 'balanced', logs: [], foraged: {}, ending: '',
    };
    this.clock = new TurnClock(this.state.day);
    this.reveal();
  }
  get level(): number { return 1 + Math.floor(this.state.xp / 80); }
  get strength(): number { return Math.round((12 + this.state.soldiers * 6 + this.level * 3) * (.6 + this.state.morale / 250)); }
  get radius(): number { return Math.min(7, 3 + Math.floor(this.state.scouts / 2) + (tileAt(this.state.world, this.state.player)?.terrain === 'hill' ? 2 : 0)); }
  get explored(): number { return Math.round(this.state.world.tiles.filter(t => t.seen).length / this.state.world.tiles.length * 100); }
  get score(): number { return this.state.banked + this.state.gold + this.state.seals * 300 + this.explored * 5 + this.state.trust * 50 + this.state.crew * 10; }
  get currentSite() { return siteAt(this.state.world, this.state.player); }
  visible(p: Point): boolean { return Math.hypot(p.x - this.state.player.x, p.y - this.state.player.y) <= this.radius + .3; }
  log(text: string, kind: LogEntry['kind'] = 'normal'): void {
    this.state.logs.unshift({ day: this.state.day + 1, text, kind });
    this.state.logs = this.state.logs.slice(0, 60);
  }
  private changed(): void { this.onChange?.(); }
  outfit(id: LoadoutId, extra: 'food' | 'tools' | 'medicine'): void {
    if (this.state.phase !== 'outfitting') return;
    const loadout = LOADOUTS.find(l => l.id === id)!;
    Object.assign(this.state, { loadout: id, supplies: loadout.supplies + (extra === 'food' ? 20 : 0), tools: loadout.tools + (extra === 'tools' ? 4 : 0), medicine: loadout.medicine + (extra === 'medicine' ? 2 : 0), soldiers: loadout.soldiers, scouts: loadout.scouts });
    this.state.gold = loadout.gold;
    this.state.phase = 'voyage';
    this.log('The Marigold leaves harbor. Beyond the horizon, a new chapter awaits.', 'discovery');
    this.changed();
  }
  land(): void {
    if (this.state.phase !== 'voyage') return;
    this.state.phase = 'exploring';
    this.log('Landfall at the Verdant Coast. Find the three Cities of Gold, then return to the Marigold.', 'discovery');
    this.changed();
  }
  private reveal(): void {
    const s = this.state;
    for (let y = s.player.y - this.radius; y <= s.player.y + this.radius; y++) {
      for (let x = s.player.x - this.radius; x <= s.player.x + this.radius; x++) {
        const p = { x, y }, tile = tileAt(s.world, p);
        if (tile && this.visible(p)) tile.seen = true;
      }
    }
  }
  private turn(action: () => void, foodCost = 1): void {
    if (this.state.phase !== 'exploring') return;
    const s = this.state;
    this.clock.commit({
      player: action,
      enemies: () => { if (s.phase === 'exploring') this.enemies(); },
      world: () => {
        if (s.phase !== 'exploring') return;
        s.supplies = Math.max(0, s.supplies - foodCost);
        if (s.supplies === 0) { s.health -= 9; s.morale -= 6; this.log('Empty packs. The company is starving. Forage or find a settlement.', 'danger'); }
        else if (s.day % 4 === 0) s.morale = clamp(s.morale + 1);
        s.morale = clamp(s.morale);
        s.health = clamp(s.health);
        if (s.health <= 0 || s.crew <= 0) {
          s.phase = 'lost'; s.ending = 'The wilderness has claimed the expedition. Your charts remain, a testament to how far you came.';
          this.log('The expedition can go no farther.', 'danger');
        }
      },
    });
    s.day = this.clock.turn;
    this.reveal();
    this.changed();
  }
  move(p: Point): boolean {
    const s = this.state;
    if (s.phase !== 'exploring' || distance(s.player, p) !== 1 || !passable(s.world, p)) return false;
    const enemy = s.world.enemies.find(e => e.alive && same(e, p));
    if (enemy) { this.turn(() => this.fight(enemy), 1); return true; }
    const tile = tileAt(s.world, p)!;
    const cost = tile.terrain === 'jungle' && s.tools > 0 ? 1 : TERRAIN[tile.terrain].cost;
    this.turn(() => {
      const unseen = !tile.seen;
      s.player = { ...p }; s.xp += unseen ? 2 : 1;
      const site = this.currentSite;
      if (site && !site.resolved && !s.logs.some(l => l.text === `Discovered ${site.name}.`)) this.log(`Discovered ${site.name}.`, 'discovery');
    }, cost);
    return true;
  }
  stepToward(p: Point): boolean {
    const path = findPath(this.state.player, p, n => passable(this.state.world, n) && !!tileAt(this.state.world, n)?.seen);
    return !!path?.length && this.move(path[0]);
  }
  private fight(enemy: Enemy): void {
    const s = this.state;
    const rng = new Random(s.rng);
    const damage = Math.max(3, Math.round(enemy.strength * .8 - this.strength * .28 + rng.int(0, 7)));
    s.health -= damage; s.morale = clamp(s.morale - 3);
    enemy.alive = false; s.xp += 25; s.gold += enemy.name === 'Jaguar' ? 0 : 18;
    if (damage > 15 && s.crew > 1) { s.crew--; this.log('A crew member was lost in the encounter.', 'danger'); }
    this.log(`${enemy.name === 'Jaguar' ? 'Drove off a jaguar' : 'Repelled a rival expedition'}. −${damage} health, +25 experience.`, 'danger');
    s.rng = rng.state;
  }
  private enemies(): void {
    const s = this.state;
    // Settlements, landmarks, and the ship are safe places to plan the next leg.
    if (this.currentSite) return;
    for (const enemy of s.world.enemies) {
      if (!enemy.alive || distance(enemy, s.player) > 5) continue;
      if (distance(enemy, s.player) === 1) { this.fight(enemy); if (s.health <= 0) break; continue; }
      if (s.day % 2 !== 0) continue;
      const path = findPath(enemy, s.player, p => passable(s.world, p) && !siteAt(s.world, p) && !s.world.enemies.some(e => e !== enemy && e.alive && same(e, p)), 150);
      if (path?.length) Object.assign(enemy, path[0]);
    }
  }
  actions(): Action[] {
    const s = this.state, site = this.currentSite;
    const result: Action[] = [];
    const add = (id: string, label: string, detail: string, enabled = true) => result.push({ id, label, detail, enabled });
    if (site?.kind === 'ship') {
      add('bank', 'Stow treasure', 'Secure carried gold in the ship’s hold', s.gold > 0);
      add('shiprest', 'Rest aboard', 'Recover 30 health · 3 provisions', s.supplies >= 4 && s.health < 100);
      add('finish', s.seals === 3 ? 'Sail home in triumph' : 'Conclude expedition', s.seals === 3 ? 'All three sun seals recovered' : 'Return with what you have discovered');
    }
    if (site?.kind === 'village') {
      add('stories', 'Exchange stories', '+1 trust · +20 experience · once per settlement', !site.resolved);
      add('tradefood', 'Buy provisions', '+25 provisions · 15 gold', s.gold >= 15 && s.supplies <= 155);
      add('tradetools', 'Buy tools', '+4 tools · 15 gold', s.gold >= 15);
      add('work', 'Help with the harvest', '+8 gold · +6 provisions · −4 health', s.health > 15 && s.supplies <= 174);
    }
    if (site?.kind === 'ruin') add('excavate', site.resolved ? 'Ruins charted' : 'Study the ruins', '+45 gold · +35 experience · 1 tool', !site.resolved && s.tools >= 1);
    if (site?.kind === 'spring') add('spring', 'Drink from the spring', '+25 health · +10 morale · renews every 8 turns', s.day - site.lastUsed >= 8 && (s.health < 100 || s.morale < 100));
    if (site?.kind === 'city') add('seal', site.resolved ? 'Sun seal recovered' : 'Enter the sanctuary', '+1 sun seal · +60 gold · 2 tools OR 2 trust', !site.resolved && (s.tools >= 2 || s.trust >= 2));
    const terrain = tileAt(s.world, s.player)!.terrain;
    add('forage', 'Forage', 'Gather 8–14 provisions · this tile renews in 10 turns', ['forest', 'jungle', 'grass', 'shore'].includes(terrain) && s.day - (s.foraged[`${s.player.x},${s.player.y}`] ?? -100) >= 10 && s.supplies < 166);
    add('camp', 'Make camp', '+18 health · +8 morale · 4 provisions', s.supplies >= 5 && (s.health < 100 || s.morale < 100));
    add('medicine', 'Use medicine', '+35 health · 1 medicine', s.medicine > 0 && s.health < 100);
    add('wait', 'Wait a turn', 'Let the world move · 1 provision');
    return result;
  }
  act(id: string): boolean {
    if (!this.actions().some(a => a.id === id && a.enabled) || this.state.phase !== 'exploring') return false;
    const s = this.state, site = this.currentSite;
    this.turn(() => {
      switch (id) {
        case 'bank': s.banked += s.gold; this.log(`Stowed ${s.gold} gold aboard the Marigold.`); s.gold = 0; break;
        case 'shiprest': s.supplies -= 3; s.health = clamp(s.health + 30); s.morale = clamp(s.morale + 12); this.log('A night aboard. Familiar voices and a dry hammock.'); break;
        case 'finish':
          s.phase = 'won'; s.banked += s.gold; s.gold = 0;
          s.ending = s.seals === 3 ? 'Three sun seals. A continent of stories. The Marigold turns toward home, her company forever changed.' : 'You turn for home with new charts and hard-earned stories. The remaining cities will wait for another voyage.';
          this.log('The Marigold sets her course for home.', 'discovery'); break;
        case 'stories': site!.resolved = true; s.trust++; s.xp += 20; s.morale = clamp(s.morale + 8); this.log(`Shared stories in ${site!.name}. Trust opens doors that gold cannot.`, 'discovery'); break;
        case 'tradefood': s.gold -= 15; s.supplies += 25; this.log(`Bought provisions in ${site!.name}.`); break;
        case 'tradetools': s.gold -= 15; s.tools += 4; this.log('Traded for four sets of tools.'); break;
        case 'work': s.gold += 8; s.supplies += 6; s.health -= 4; this.log('Helped with the harvest. Earned food, coin, and a place at the table.'); break;
        case 'excavate': site!.resolved = true; s.tools--; s.gold += 45; s.xp += 35; this.log(`Charted ${site!.name}. Ancient carvings point toward the Cities of Gold.`, 'discovery'); this.revealCity(); break;
        case 'spring': site!.lastUsed = s.day; s.health = clamp(s.health + 25); s.morale = clamp(s.morale + 10); this.log('Cool water and a quiet moment. The company recovers.'); break;
        case 'seal':
          site!.resolved = true; if (s.trust < 2) s.tools -= 2; s.seals++; s.gold += 60; s.xp += 60; s.morale = clamp(s.morale + 15);
          this.log(`Recovered the sun seal of ${site!.name.split(' · ')[0]}! ${s.seals}/3 seals charted.`, 'discovery');
          if (s.seals === 3) this.log('The atlas is complete. Return to the Marigold on the western coast.', 'discovery');
          break;
        case 'forage': {
          const rng = new Random(s.rng), found = rng.int(8, 14); s.rng = rng.state; s.supplies += found;
          s.foraged[`${s.player.x},${s.player.y}`] = s.day; this.log(`Gathered ${found} provisions from the surrounding land.`); break;
        }
        case 'camp': s.supplies -= 4; s.health = clamp(s.health + 18); s.morale = clamp(s.morale + 8); this.log('Made camp. The fire burns low as the company rests.'); break;
        case 'medicine': s.medicine--; s.health = clamp(s.health + 35); this.log('The surgeon tends the wounded. +35 health.'); break;
        case 'wait': this.log('A quiet day. Watch the horizon.'); break;
      }
    });
    return true;
  }
  private revealCity(): void {
    const s = this.state;
    const target = s.world.sites.find(site => site.kind === 'city' && !tileAt(s.world, site)!.seen);
    if (target) { tileAt(s.world, target)!.seen = true; this.log(`A fragment of the old atlas reveals ${target.name}.`, 'discovery'); }
  }
}

const SAVE_KEY = 'cog.atlas.v1';
export function saveGame(state: State): boolean {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); return true; } catch { return false; }
}
export function loadGame(): State | undefined {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null');
    if (!s || s.version !== 1 || !['voyage', 'exploring', 'won', 'lost'].includes(s.phase)) return;
    const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
    const inBounds = (p: Point) => p && Number.isInteger(p.x) && Number.isInteger(p.y) && p.x >= 0 && p.x < WIDTH && p.y >= 0 && p.y < HEIGHT;
    if (!s.world || s.world.width !== WIDTH || s.world.height !== HEIGHT || !Array.isArray(s.world.tiles) || s.world.tiles.length !== WIDTH * HEIGHT || !s.world.tiles.every((t: { terrain: string; seen: boolean }) => t && Object.hasOwn(TERRAIN, t.terrain) && typeof t.seen === 'boolean')) return;
    if (!inBounds(s.player) || !passable(s.world, s.player) || !['supplies', 'tools', 'medicine', 'gold', 'banked', 'crew', 'soldiers', 'scouts', 'health', 'morale', 'xp', 'trust', 'seals', 'day', 'rng'].every(k => finite(s[k]) && s[k] >= 0)) return;
    if (!Array.isArray(s.world.sites) || s.world.sites.length !== 11 || !s.world.sites.every((site: any) => inBounds(site) && ['ship', 'village', 'ruin', 'spring', 'city'].includes(site.kind) && typeof site.name === 'string' && typeof site.id === 'string' && typeof site.description === 'string' && typeof site.resolved === 'boolean' && finite(site.lastUsed))) return;
    if (!Array.isArray(s.world.enemies) || !s.world.enemies.every((e: any) => inBounds(e) && typeof e.name === 'string' && typeof e.id === 'string' && typeof e.alive === 'boolean' && finite(e.strength))) return;
    if (!Array.isArray(s.logs) || !s.logs.every((l: any) => l && finite(l.day) && typeof l.text === 'string' && ['discovery', 'danger', 'normal'].includes(l.kind)) || !s.foraged || typeof s.foraged !== 'object' || !Object.values(s.foraged).every(finite) || typeof s.ending !== 'string' || !LOADOUTS.some(l => l.id === s.loadout)) return;
    return s as State;
  } catch { return; }
}
