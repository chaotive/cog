import Phaser from 'phaser';
import { CARGO_CAPACITY, VIEW_H, VIEW_W } from '../config';
import { ITEMS } from '../items';
import { GameState, newGameState } from '../state';

export class LoadoutScene extends Phaser.Scene {
  private state!: GameState;
  private selected = 0;
  private body!: Phaser.GameObjects.Text;

  constructor() {
    super('Loadout');
  }

  create(): void {
    this.state = newGameState();
    this.selected = 0;
    this.cameras.main.setBackgroundColor(0x0b1a33);

    this.add
      .text(VIEW_W / 2, 50, 'COG: CITIES OF GOLD', { fontFamily: 'Georgia, serif', fontSize: '44px', color: '#f2c94c' })
      .setOrigin(0.5);
    this.add
      .text(VIEW_W / 2, 100, 'Provision your ship before crossing the sea', { fontFamily: 'Georgia, serif', fontSize: '20px', color: '#cfd8e6' })
      .setOrigin(0.5);

    this.body = this.add.text(60, 170, '', { fontFamily: 'monospace', fontSize: '18px', color: '#ffffff', lineSpacing: 14 });
    this.add
      .text(VIEW_W / 2, VIEW_H - 40, 'UP/DOWN select   LEFT/RIGHT remove/add   ENTER set sail', { fontFamily: 'monospace', fontSize: '18px', color: '#8fa3c2' })
      .setOrigin(0.5);

    const kb = this.input.keyboard!;
    kb.on('keydown-UP', () => this.move(-1));
    kb.on('keydown-DOWN', () => this.move(1));
    kb.on('keydown-LEFT', () => this.change(-1));
    kb.on('keydown-RIGHT', () => this.change(1));
    kb.on('keydown-ENTER', () => this.sail());
    this.refresh();
  }

  private slotsUsed(): number {
    return ITEMS.reduce((sum, it) => sum + this.state.supplies[it.id] * it.slots, 0);
  }

  private move(d: number): void {
    this.selected = (this.selected + d + ITEMS.length) % ITEMS.length;
    this.refresh();
  }

  private change(d: number): void {
    const item = ITEMS[this.selected];
    const have = this.state.supplies[item.id];
    if (d > 0 && (this.state.gold < item.cost || this.slotsUsed() + item.slots > CARGO_CAPACITY)) return;
    if (d < 0 && have <= (item.id === 'crew' ? 1 : 0)) return;
    this.state.supplies[item.id] += d;
    this.state.gold -= d * item.cost;
    this.refresh();
  }

  private sail(): void {
    if (this.state.supplies.food < 1) return;
    this.scene.start('Map', { state: this.state });
  }

  private refresh(): void {
    const lines = ITEMS.map((it, i) => {
      const cursor = i === this.selected ? '>' : ' ';
      return `${cursor} ${it.name.padEnd(12)} x${String(this.state.supplies[it.id]).padEnd(3)} (${it.cost}g)  ${it.description}`;
    });
    lines.push('');
    lines.push(`  Gold: ${this.state.gold}      Cargo: ${this.slotsUsed()}/${CARGO_CAPACITY}`);
    if (this.state.supplies.food < 1) lines.push('  You need at least some food to sail!');
    this.body.setText(lines.join('\n'));
  }
}
