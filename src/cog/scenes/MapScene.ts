import Phaser from 'phaser';
import { FogOfWar, Visibility } from '../../game/fog';
import { manhattan, Point } from '../../game/grid';
import { Rng } from '../../game/rng';
import { TurnManager } from '../../game/turns';
import {
  CELL,
  CITY_COUNT,
  CITY_GOLD,
  ENEMY_AGGRO_RANGE,
  FOOD_PERIOD,
  FOOT_SIGHT,
  MAP_H,
  MAP_W,
  SHIP_SIGHT,
  TRIBUTE_FOOD,
  TRIBUTE_GOLD,
  TRIBUTE_PERIOD,
  VIEW_H,
  VIEW_W
} from '../config';
import { combatStrength, GameState, grantXp, sightBonus, xpToNextLevel } from '../state';
import { EnemyData, generateWorld, isWalkable, isWater, Poi, Terrain, TERRAIN_COLOR, World } from '../world';

const KEY_DIRS: Record<string, Point> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  d: { x: 1, y: 0 }
};

/** Wandering raiders stand still a third of the time. */
const WANDER: readonly Point[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 }
];

const LOG_LINES = 3;

/** The main turn-based exploration scene: sail, land, explore, fight, trade. */
export class MapScene extends Phaser.Scene {
  private state!: GameState;
  private world!: World;
  private fog!: FogOfWar;
  private turns!: TurnManager;
  private rng!: Rng;

  private player!: Point;
  private ship!: Point;
  private onShip = true;
  private over = false;
  private messages: string[] = [];

  private readonly camTarget = new Phaser.Math.Vector2();
  private fogLayer!: Phaser.GameObjects.Graphics;
  private entityLayer!: Phaser.GameObjects.Graphics;
  private labels: Phaser.GameObjects.Text[] = [];
  private hud!: Phaser.GameObjects.Text;
  private log!: Phaser.GameObjects.Text;

  constructor() {
    super('Map');
  }

  init(data: { state: GameState }): void {
    this.state = data.state;
  }

  create(): void {
    const seed = Math.floor(Math.random() * 2 ** 31);
    this.rng = new Rng(seed ^ 0x5bd1e995);
    this.world = generateWorld(seed);
    this.fog = new FogOfWar(MAP_W, MAP_H);
    this.turns = new TurnManager();
    this.turns.onTurn((t) => this.eat(t));
    this.turns.onTurn((t) => this.collectTribute(t));
    this.turns.onTurn(() => this.moveEnemies());
    this.over = false;
    this.onShip = true;
    this.messages = [];
    this.labels = [];
    this.ship = { ...this.world.shipStart };
    this.player = { ...this.world.shipStart };

    this.drawTerrain();
    this.entityLayer = this.add.graphics().setDepth(10);
    this.fogLayer = this.add.graphics().setDepth(20);

    this.add.rectangle(0, 0, VIEW_W, 32, 0x000000, 0.75).setOrigin(0).setScrollFactor(0).setDepth(100);
    this.hud = this.add
      .text(10, 7, '', { fontFamily: 'monospace', fontSize: '15px', color: '#f2e9c9' })
      .setScrollFactor(0)
      .setDepth(101);
    this.log = this.add
      .text(10, VIEW_H - 10, '', {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#ffffff',
        backgroundColor: '#000000b0',
        padding: { x: 8, y: 6 },
        wordWrap: { width: VIEW_W - 40 }
      })
      .setOrigin(0, 1)
      .setScrollFactor(0)
      .setDepth(101);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, MAP_W * CELL, MAP_H * CELL);
    cam.setBackgroundColor(0x000000);
    this.updateCamTarget();
    cam.centerOn(this.camTarget.x, this.camTarget.y);
    cam.startFollow(this.camTarget, true, 0.2, 0.2);

    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => this.onKey(e));

    this.say('Land ho is somewhere east. Arrows/WASD move, SPACE waits a turn.');
    this.say('Sail onto a beach to go ashore. Walk back onto the ship to re-embark.');
    this.refresh();
  }

  // ---- input -----------------------------------------------------------

  private onKey(e: KeyboardEvent): void {
    if (this.over) {
      if (e.key === 'Enter') this.scene.start('Loadout');
      return;
    }
    const d = KEY_DIRS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
    if (d) this.tryMove(this.player.x + d.x, this.player.y + d.y);
    else if (e.key === ' ') this.endTurn();
  }

  private tryMove(x: number, y: number): void {
    const { terrain } = this.world;
    if (!terrain.inBounds(x, y)) return;
    const t = terrain.get(x, y);

    if (this.onShip) {
      if (!isWater(t) && !isWalkable(t)) return this.say('Sheer cliffs. The ship cannot land here.');
    } else if (!(x === this.ship.x && y === this.ship.y) && !isWalkable(t)) {
      return this.say(isWater(t) ? 'Your boat is elsewhere. You cannot cross water on foot.' : 'Impassable mountains.');
    }

    const foe = this.world.enemies.find((en) => en.x === x && en.y === y);
    if (foe) {
      if (this.onShip) return this.say('Raiders hold that beach. Land somewhere else.');
      this.fight(foe, true);
      return this.endTurn();
    }

    if (this.onShip && isWater(t)) {
      this.ship = { x, y };
    } else if (this.onShip) {
      this.onShip = false;
      this.say('You go ashore. The ship waits at anchor.');
    } else if (x === this.ship.x && y === this.ship.y) {
      this.onShip = true;
      this.say('Back aboard the ship.');
    }
    this.player = { x, y };

    const poi = this.world.pois.find((p) => p.x === x && p.y === y);
    if (poi) this.visit(poi);
    this.endTurn();
  }

  // ---- turn systems ------------------------------------------------------

  private endTurn(): void {
    this.turns.endTurn();
    this.checkEnd();
    this.refresh();
  }

  private eat(turn: number): void {
    if (turn % FOOD_PERIOD !== 0) return;
    const s = this.state.supplies;
    const need = Math.ceil(s.crew / 2);
    if (s.food >= need) {
      s.food -= need;
      if (s.food < need * 3) this.say('Food is running low!');
    } else {
      s.food = 0;
      s.crew--;
      this.say('Starvation! A crew member has died.');
    }
  }

  private collectTribute(turn: number): void {
    const allies = this.world.pois.filter((p) => p.kind === 'city' && p.visited).length;
    if (allies === 0 || turn % TRIBUTE_PERIOD !== 0) return;
    this.state.gold += allies * TRIBUTE_GOLD;
    this.state.supplies.food += allies * TRIBUTE_FOOD;
    this.say(`Tribute arrives from ${allies} allied ${allies > 1 ? 'cities' : 'city'}: +${allies * TRIBUTE_GOLD} gold, +${allies * TRIBUTE_FOOD} food.`);
  }

  private moveEnemies(): void {
    const { terrain, enemies } = this.world;
    const occupied = (x: number, y: number) => enemies.some((o) => o.x === x && o.y === y);
    for (const en of [...enemies]) {
      if (this.over || !enemies.includes(en)) continue;
      let step: Point | null = null;
      if (!this.onShip && manhattan(en, this.player) <= ENEMY_AGGRO_RANGE) {
        step = terrain.nextStep(en, this.player, (t, x, y) => isWalkable(t) && !occupied(x, y), ENEMY_AGGRO_RANGE * 2);
      }
      if (!step) {
        const d = this.rng.pick(WANDER);
        step = { x: en.x + d.x, y: en.y + d.y };
      }
      if (step.x === this.player.x && step.y === this.player.y) {
        if (this.onShip) continue;
        this.say('Raiders ambush you!');
        this.fight(en, false);
        continue;
      }
      if (!terrain.inBounds(step.x, step.y) || !isWalkable(terrain.get(step.x, step.y)) || occupied(step.x, step.y)) continue;
      en.x = step.x;
      en.y = step.y;
    }
  }

  // ---- encounters -----------------------------------------------------------

  private fight(foe: EnemyData, attacking: boolean): void {
    const s = this.state.supplies;
    // Defenders get a small edge.
    const mine = combatStrength(this.state) + this.rng.int(0, 6) + (attacking ? 0 : 1);
    const theirs = foe.strength + this.rng.int(0, 6);
    if (mine >= theirs) {
      const loot = this.rng.int(5, 15) + foe.strength;
      this.state.gold += loot;
      this.world.enemies.splice(this.world.enemies.indexOf(foe), 1);
      this.say(`Victory (${mine} vs ${theirs})! The raiders flee, leaving ${loot} gold.`);
      this.gainXp(foe.strength * 2);
    } else {
      const lost = Math.min(s.crew, this.rng.int(1, 2));
      s.crew -= lost;
      if (s.weapons > 0 && this.rng.next() < 0.5) {
        s.weapons--;
        this.say(`Defeat (${mine} vs ${theirs})! ${lost} crew lost and a weapon broken.`);
      } else {
        this.say(`Defeat (${mine} vs ${theirs})! ${lost} crew lost.`);
      }
    }
  }

  private visit(poi: Poi): void {
    const s = this.state.supplies;
    if (poi.kind === 'city') {
      if (poi.visited) return this.say(`${poi.name} welcomes you back.`);
      poi.visited = true;
      this.state.citiesFound++;
      this.state.gold += CITY_GOLD;
      this.say(`You discover ${poi.name}, a CITY OF GOLD! +${CITY_GOLD} gold. It joins you as an ally (${this.state.citiesFound}/${CITY_COUNT}).`);
      this.gainXp(25);
    } else if (poi.visited) {
      this.say('The villagers have nothing more to trade.');
    } else if (s.goods > 0) {
      poi.visited = true;
      const n = Math.min(2, s.goods);
      s.goods -= n;
      s.food += n * 4;
      this.state.gold += n * 6;
      this.say(`Natives trade ${n * 4} food and ${n * 6} gold for ${n} trade goods. They mention gold further east...`);
      this.gainXp(5);
    } else {
      this.say('A native village. Without trade goods, they ignore you.');
    }
  }

  private gainXp(amount: number): void {
    if (grantXp(this.state.leader, amount)) {
      this.say(`Your leader reaches level ${this.state.leader.level}! Stronger in battle, sharper eyes on land.`);
    }
  }

  private checkEnd(): void {
    if (this.over) return;
    if (this.state.citiesFound >= CITY_COUNT) this.finish('VICTORY!', 'Every city of gold has been found.');
    else if (this.state.supplies.crew <= 0) this.finish('EXPEDITION LOST', 'No one returns to tell the tale.');
  }

  private finish(title: string, subtitle: string): void {
    this.over = true;
    const { gold, leader } = this.state;
    this.add
      .text(
        VIEW_W / 2,
        VIEW_H / 2,
        `${title}\n${subtitle}\n\nGold ${gold}   Turns ${this.turns.turn}   Leader level ${leader.level}\n\nPress ENTER to start a new expedition`,
        {
          fontFamily: 'Georgia, serif',
          fontSize: '26px',
          color: '#f2c94c',
          align: 'center',
          backgroundColor: '#000000dd',
          padding: { x: 32, y: 24 }
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(200);
  }

  // ---- rendering ------------------------------------------------------------

  private say(msg: string): void {
    this.messages.push(msg);
    if (this.messages.length > LOG_LINES) this.messages.shift();
    this.log?.setText(this.messages.join('\n'));
  }

  private updateCamTarget(): void {
    this.camTarget.set(this.player.x * CELL + CELL / 2, this.player.y * CELL + CELL / 2);
  }

  private drawTerrain(): void {
    const g = this.add.graphics().setDepth(0);
    const { terrain } = this.world;
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const t = terrain.get(x, y);
        g.fillStyle(TERRAIN_COLOR[t], 1);
        g.fillRect(x * CELL, y * CELL, CELL, CELL);
        // A little texture so terrain reads at a glance.
        const px = x * CELL;
        const py = y * CELL;
        if (t === Terrain.Forest) {
          g.fillStyle(0x1f4d24, 1);
          g.fillTriangle(px + 16, py + 5, px + 7, py + 24, px + 25, py + 24);
        } else if (t === Terrain.Hills) {
          g.fillStyle(0x7e7045, 1);
          g.fillEllipse(px + 16, py + 22, 22, 12);
        } else if (t === Terrain.Mountain) {
          g.fillStyle(0xb9b9c2, 1);
          g.fillTriangle(px + 16, py + 3, px + 3, py + 28, px + 29, py + 28);
        }
      }
    }
    g.lineStyle(1, 0x000000, 0.08);
    for (let x = 0; x <= MAP_W; x++) g.lineBetween(x * CELL, 0, x * CELL, MAP_H * CELL);
    for (let y = 0; y <= MAP_H; y++) g.lineBetween(0, y * CELL, MAP_W * CELL, y * CELL);
  }

  private refresh(): void {
    const sight = this.onShip ? SHIP_SIGHT : FOOT_SIGHT + sightBonus(this.state);
    const discovered = this.fog.reveal(this.player.x, this.player.y, sight);
    if (!this.onShip && discovered >= 8) this.gainXp(1);
    this.updateCamTarget();

    const { supplies: s, leader, gold, citiesFound } = this.state;
    this.hud.setText(
      `Turn ${this.turns.turn}  Crew ${s.crew}  Food ${s.food}  Weapons ${s.weapons}  Goods ${s.goods}  ` +
        `Gold ${gold}  Lv${leader.level} (${leader.xp}/${xpToNextLevel(leader)}xp)  Cities ${citiesFound}/${CITY_COUNT}`
    );

    this.drawFog();
    this.drawEntities();
  }

  private drawFog(): void {
    const f = this.fogLayer;
    f.clear();
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const v = this.fog.grid.get(x, y);
        if (v === Visibility.Visible) continue;
        f.fillStyle(0x000000, v === Visibility.Unseen ? 1 : 0.5);
        f.fillRect(x * CELL, y * CELL, CELL, CELL);
      }
    }
  }

  private drawEntities(): void {
    const e = this.entityLayer;
    e.clear();
    for (const l of this.labels) l.destroy();
    this.labels = [];

    for (const p of this.world.pois) {
      if (!this.fog.isExplored(p.x, p.y)) continue;
      const px = p.x * CELL;
      const py = p.y * CELL;
      if (p.kind === 'city') {
        e.fillStyle(0xf2c94c, 1);
        e.fillRect(px + 4, py + 14, 24, 14);
        e.fillTriangle(px + 16, py + 2, px + 8, py + 14, px + 24, py + 14);
        e.lineStyle(2, 0x7a5a00, 1);
        e.strokeRect(px + 4, py + 14, 24, 14);
        if (p.visited) this.labels.push(this.label(p.x, p.y, p.name, '#f2c94c'));
      } else {
        e.fillStyle(p.visited ? 0x6b4a2b : 0xb0793f, 1);
        e.fillTriangle(px + 16, py + 6, px + 5, py + 18, px + 27, py + 18);
        e.fillRect(px + 9, py + 18, 14, 9);
      }
    }

    for (const en of this.world.enemies) {
      if (!this.fog.isVisible(en.x, en.y)) continue;
      const cx = en.x * CELL + CELL / 2;
      const cy = en.y * CELL + CELL / 2;
      e.fillStyle(0xc0392b, 1);
      e.fillCircle(cx, cy, 10);
      e.lineStyle(2, 0x3d0000, 1);
      e.strokeCircle(cx, cy, 10);
      this.labels.push(this.label(en.x, en.y, String(en.strength), '#ffb3a7'));
    }

    if (!this.onShip) this.drawShip(this.ship, 0.85);

    if (this.onShip) {
      this.drawShip(this.player, 1);
    } else {
      const cx = this.player.x * CELL + CELL / 2;
      const cy = this.player.y * CELL + CELL / 2;
      e.fillStyle(0xffffff, 1);
      e.fillCircle(cx, cy, 10);
      e.lineStyle(3, 0x1a237e, 1);
      e.strokeCircle(cx, cy, 10);
    }
  }

  private drawShip(p: Point, alpha: number): void {
    const e = this.entityLayer;
    const px = p.x * CELL;
    const py = p.y * CELL;
    e.fillStyle(0x7b4b2a, alpha);
    e.fillTriangle(px + 3, py + 20, px + 29, py + 20, px + 23, py + 28);
    e.fillTriangle(px + 3, py + 20, px + 23, py + 28, px + 9, py + 28);
    e.fillStyle(0xf4ecd8, alpha);
    e.fillTriangle(px + 16, py + 3, px + 16, py + 18, px + 27, py + 18);
    e.fillTriangle(px + 15, py + 6, px + 15, py + 18, px + 7, py + 18);
  }

  private label(x: number, y: number, text: string, color: string): Phaser.GameObjects.Text {
    return this.add
      .text(x * CELL + CELL / 2, y * CELL - 2, text, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color,
        stroke: '#000000',
        strokeThickness: 3
      })
      .setOrigin(0.5, 1)
      .setDepth(15);
  }
}
