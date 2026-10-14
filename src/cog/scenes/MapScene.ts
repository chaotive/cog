import Phaser from 'phaser';
import { FogOfWar, Visibility } from '../../game/fog';
import { Point } from '../../game/grid';
import { Rng } from '../../game/rng';
import { TurnManager } from '../../game/turns';
import { CELL, CITY_COUNT, MAP_H, MAP_W, VIEW_H, VIEW_W } from '../config';
import { GameState } from '../state';
import { EnemyData, generateWorld, isLandWalkable, isWater, Poi, TERRAIN_COLOR, World } from '../world';

const SHIP_SIGHT = 5;
const FOOT_SIGHT = 4;
const FOOD_PERIOD = 4; // turns between meals
const CITY_REWARD = 100;
const ENEMY_AGGRO = 6;

export class MapScene extends Phaser.Scene {
  private state!: GameState;
  private world!: World;
  private fog!: FogOfWar;
  private turns!: TurnManager;
  private rng!: Rng;

  private player!: Point;
  private shipPos!: Point;
  private onShip = true;
  private over = false;

  private fogLayer!: Phaser.GameObjects.Graphics;
  private entityLayer!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Text;
  private log!: Phaser.GameObjects.Text;
  private banner?: Phaser.GameObjects.Text;

  constructor() {
    super('Map');
  }

  init(data: { state: GameState }): void {
    this.state = data.state;
  }

  create(): void {
    const seed = Math.floor(Math.random() * 1e9);
    this.rng = new Rng(seed);
    this.world = generateWorld(seed);
    this.fog = new FogOfWar(MAP_W, MAP_H);
    this.turns = new TurnManager();
    this.turns.onTurn((t) => this.tickFood(t));
    this.turns.onTurn(() => this.moveEnemies());
    this.over = false;
    this.onShip = true;
    this.shipPos = { ...this.world.shipStart };
    this.player = { ...this.world.shipStart };

    this.cameras.main.setBounds(0, 0, MAP_W * CELL, MAP_H * CELL);
    this.drawTerrain();
    this.fogLayer = this.add.graphics().setDepth(20);
    this.entityLayer = this.add.graphics().setDepth(10);

    const hudBg = this.add.rectangle(0, 0, VIEW_W, 34, 0x000000, 0.7).setOrigin(0).setScrollFactor(0).setDepth(100);
    this.hud = this.add
      .text(10, 7, '', { fontFamily: 'monospace', fontSize: '16px', color: '#f2e9c9' })
      .setScrollFactor(0)
      .setDepth(101);
    this.log = this.add
      .text(10, VIEW_H - 28, '', { fontFamily: 'monospace', fontSize: '16px', color: '#ffffff', backgroundColor: '#000000aa', padding: { x: 6, y: 4 } })
      .setScrollFactor(0)
      .setDepth(101);
    hudBg.setDepth(100);

    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => this.onKey(e));

    this.say('Find the cities of gold! Arrows/WASD to move. Land on a coast to explore on foot.');
    this.cameras.main.centerOn(this.player.x * CELL, this.player.y * CELL);
    this.cameras.main.startFollow(this.followTarget(), true, 0.15, 0.15);
    this.refresh();
  }

  // ---- input ---------------------------------------------------------

  private onKey(e: KeyboardEvent): void {
    if (this.over) {
      if (e.key === 'Enter') this.scene.start('Loadout');
      return;
    }
    const d = KEY_DIRS[e.key];
    if (d) this.tryMove(this.player.x + d.x, this.player.y + d.y);
    else if (e.key === ' ') this.passTurn();
  }

  private tryMove(x: number, y: number): void {
    if (!this.world.terrain.inBounds(x, y)) return;
    const t = this.world.terrain.get(x, y);

    if (this.onShip) {
      if (isWater(t)) {
        this.shipPos = { x, y };
      } else if (isLandWalkable(t)) {
        this.onShip = false; // disembark, ship stays anchored behind us
      } else {
        return this.say('Impassable mountains.');
      }
    } else if (x === this.shipPos.x && y === this.shipPos.y) {
      this.onShip = true;
      this.say('Back on the ship.');
    } else if (!isLandWalkable(t)) {
      return this.say(isWater(t) ? 'You have no way across the water.' : 'Impassable mountains.');
    }

    this.player = { x, y };
    this.followPoint.set(x * CELL + CELL / 2, y * CELL + CELL / 2);

    const foe = this.world.enemies.find((en) => en.x === x && en.y === y);
    if (foe) this.fight(foe);
    const poi = this.world.pois.find((p) => p.x === x && p.y === y);
    if (poi && !this.onShip) this.visit(poi);

    this.passTurn();
  }

  // ---- turn systems --------------------------------------------------

  private passTurn(): void {
    if (this.over) return;
    this.turns.endTurn();
    this.checkEnd();
    this.refresh();
  }

  private tickFood(turn: number): void {
    if (turn % FOOD_PERIOD !== 0) return;
    const s = this.state.supplies;
    const need = Math.ceil(s.crew / 2);
    if (s.food >= need) {
      s.food -= need;
    } else {
      s.food = 0;
      s.crew--;
      this.say('Starvation! A crew member has died.');
    }
  }

  private moveEnemies(): void {
    if (this.onShip) return; // raiders cannot reach the ship
    for (const en of this.world.enemies) {
      const dist = Math.abs(en.x - this.player.x) + Math.abs(en.y - this.player.y);
      const step: Point = dist <= ENEMY_AGGRO ? this.stepToward(en) : this.rng.pick(WANDER);
      const nx = en.x + step.x;
      const ny = en.y + step.y;
      if (!this.world.terrain.inBounds(nx, ny) || !isLandWalkable(this.world.terrain.get(nx, ny))) continue;
      if (this.world.enemies.some((o) => o !== en && o.x === nx && o.y === ny)) continue;
      en.x = nx;
      en.y = ny;
      if (nx === this.player.x && ny === this.player.y) {
        this.say('You are ambushed!');
        this.fight(en);
        break;
      }
    }
  }

  private stepToward(en: EnemyData): Point {
    const dx = this.player.x - en.x;
    const dy = this.player.y - en.y;
    return Math.abs(dx) >= Math.abs(dy) ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) };
  }

  // ---- events --------------------------------------------------------

  private fight(foe: EnemyData): void {
    const s = this.state.supplies;
    const mine = s.crew + s.weapons * 2 + this.rng.int(0, 5);
    const theirs = foe.strength + this.rng.int(0, 5);
    if (mine >= theirs) {
      const loot = this.rng.int(5, 20);
      this.state.gold += loot;
      this.world.enemies.splice(this.world.enemies.indexOf(foe), 1);
      this.say(`You defeated raiders (${mine} vs ${theirs}) and took ${loot} gold.`);
    } else {
      const lost = this.rng.int(1, 2);
      s.crew = Math.max(0, s.crew - lost);
      this.say(`Raiders overwhelmed you (${mine} vs ${theirs}). Lost ${lost} crew!`);
      // Retreat to the ship's last landing spot if the enemy stands on us.
      if (foe.x === this.player.x && foe.y === this.player.y) {
        this.player = { ...this.shipPos };
        this.onShip = true;
        this.followPoint.set(this.player.x * CELL + CELL / 2, this.player.y * CELL + CELL / 2);
      }
    }
  }

  private visit(poi: Poi): void {
    if (poi.visited) return;
    const s = this.state.supplies;
    if (poi.kind === 'city') {
      poi.visited = true;
      this.state.citiesFound++;
      this.state.gold += CITY_REWARD;
      this.say(`A CITY OF GOLD! +${CITY_REWARD} gold (${this.state.citiesFound}/${CITY_COUNT}).`);
    } else if (s.goods > 0) {
      poi.visited = true;
      const n = Math.min(2, s.goods);
      s.goods -= n;
      s.food += n * 3;
      this.state.gold += n * 5;
      this.say(`Natives trade ${n} goods for ${n * 3} food and ${n * 5} gold.`);
    } else {
      this.say('A native village. You have no trade goods.');
    }
  }

  private checkEnd(): void {
    if (this.state.citiesFound >= CITY_COUNT) this.finish('VICTORY!\nAll cities of gold discovered.');
    else if (this.state.supplies.crew <= 0) this.finish('EXPEDITION LOST\nYour crew is gone.');
  }

  private finish(text: string): void {
    this.over = true;
    this.banner = this.add
      .text(VIEW_W / 2, VIEW_H / 2, `${text}\n\nGold: ${this.state.gold}   Turns: ${this.turns.turn}\nPress ENTER to play again`, {
        fontFamily: 'Georgia, serif',
        fontSize: '32px',
        color: '#f2c94c',
        align: 'center',
        backgroundColor: '#000000cc',
        padding: { x: 24, y: 18 }
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(200);
  }

  // ---- rendering -----------------------------------------------------

  private followPoint = new Phaser.Math.Vector2();

  private followTarget(): Phaser.Math.Vector2 {
    this.followPoint.set(this.player.x * CELL + CELL / 2, this.player.y * CELL + CELL / 2);
    return this.followPoint;
  }

  private say(msg: string): void {
    this.log?.setText(msg);
  }

  private drawTerrain(): void {
    const g = this.add.graphics().setDepth(0);
    const { terrain } = this.world;
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        g.fillStyle(TERRAIN_COLOR[terrain.get(x, y)], 1);
        g.fillRect(x * CELL, y * CELL, CELL, CELL);
      }
    }
  }

  private refresh(): void {
    this.fog.reveal(this.player.x, this.player.y, this.onShip ? SHIP_SIGHT : FOOT_SIGHT);
    const s = this.state.supplies;
    this.hud.setText(
      `Turn ${this.turns.turn}  Crew ${s.crew}  Food ${s.food}  Weapons ${s.weapons}  Goods ${s.goods}  Gold ${this.state.gold}  Cities ${this.state.citiesFound}/${CITY_COUNT}`
    );

    // Fog
    const f = this.fogLayer;
    f.clear();
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const v = this.fog.grid.get(x, y);
        if (v === Visibility.Visible) continue;
        f.fillStyle(0x000000, v === Visibility.Unseen ? 1 : 0.55);
        f.fillRect(x * CELL, y * CELL, CELL, CELL);
      }
    }

    // Entities
    const e = this.entityLayer;
    e.clear();
    const c = (n: number) => n * CELL + CELL / 2;
    for (const p of this.world.pois) {
      if (this.fog.grid.get(p.x, p.y) === Visibility.Unseen) continue;
      if (p.kind === 'city') {
        e.fillStyle(p.visited ? 0xffd700 : 0xf2c94c, 1);
        e.fillTriangle(c(p.x), p.y * CELL + 3, p.x * CELL + 3, (p.y + 1) * CELL - 4, (p.x + 1) * CELL - 3, (p.y + 1) * CELL - 4);
        e.lineStyle(2, 0x7a5a00, 1);
        e.strokeRect(p.x * CELL + 8, p.y * CELL + 14, CELL - 16, CELL - 20);
      } else {
        e.fillStyle(p.visited ? 0x6b4a2b : 0xb0793f, 1);
        e.fillRect(p.x * CELL + 7, p.y * CELL + 9, CELL - 14, CELL - 14);
      }
    }
    for (const en of this.world.enemies) {
      if (!this.fog.isVisible(en.x, en.y)) continue;
      e.fillStyle(0xc0392b, 1);
      e.fillRect(en.x * CELL + 7, en.y * CELL + 7, CELL - 14, CELL - 14);
    }
    // Anchored ship while on foot
    if (!this.onShip) {
      e.fillStyle(0x7b4b2a, 1);
      e.fillRoundedRect(this.shipPos.x * CELL + 4, this.shipPos.y * CELL + 9, CELL - 8, CELL - 16, 4);
    }
    // Player
    e.fillStyle(this.onShip ? 0xf4e3b1 : 0xffffff, 1);
    if (this.onShip) {
      e.fillTriangle(c(this.player.x), this.player.y * CELL + 2, this.player.x * CELL + 4, (this.player.y + 1) * CELL - 4, (this.player.x + 1) * CELL - 4, (this.player.y + 1) * CELL - 4);
      e.fillStyle(0x7b4b2a, 1);
      e.fillRect(this.player.x * CELL + 4, (this.player.y + 1) * CELL - 6, CELL - 8, 4);
    } else {
      e.fillCircle(c(this.player.x), c(this.player.y), CELL / 3);
      e.lineStyle(2, 0x000000, 1);
      e.strokeCircle(c(this.player.x), c(this.player.y), CELL / 3);
    }
  }
}

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

const WANDER: readonly Point[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 }
];
