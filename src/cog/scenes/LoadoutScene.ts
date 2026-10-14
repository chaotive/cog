import Phaser from 'phaser';
import { CARGO_CAPACITY, VIEW_H, VIEW_W } from '../config';
import { ITEMS } from '../items';
import { GameState, newGameState } from '../state';

const FONT = 'monospace';
const ROW_Y = 190;
const ROW_H = 56;

/** Pre-voyage screen: spend gold on what goes onboard the ship. */
export class LoadoutScene extends Phaser.Scene {
  private state!: GameState;
  private selected = 0;
  private rows: Phaser.GameObjects.Text[] = [];
  private footer!: Phaser.GameObjects.Text;
  private warning!: Phaser.GameObjects.Text;

  constructor() {
    super('Loadout');
  }

  create(): void {
    this.state = newGameState();
    this.selected = 0;
    this.rows = [];
    this.cameras.main.setBackgroundColor(0x0b1a33);

    this.add
      .text(VIEW_W / 2, 56, 'COG: CITIES OF GOLD', { fontFamily: 'Georgia, serif', fontSize: '46px', color: '#f2c94c' })
      .setOrigin(0.5);
    this.add
      .text(VIEW_W / 2, 108, 'Legends speak of golden cities across the sea. Provision your ship.', {
        fontFamily: 'Georgia, serif',
        fontSize: '19px',
        color: '#cfd8e6'
      })
      .setOrigin(0.5);

    ITEMS.forEach((item, i) => {
      const y = ROW_Y + i * ROW_H;
      const row = this.add.text(70, y, '', { fontFamily: FONT, fontSize: '20px', color: '#ffffff' });
      row.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.select(i));
      this.rows.push(row);
      this.add.text(100, y + 25, item.description, { fontFamily: FONT, fontSize: '14px', color: '#8fa3c2' });
      this.button(770, y, ' - ', () => this.change(i, -1));
      this.button(830, y, ' + ', () => this.change(i, 1));
    });

    this.footer = this.add.text(70, ROW_Y + ITEMS.length * ROW_H + 20, '', { fontFamily: FONT, fontSize: '22px', color: '#f2e9c9' });
    this.warning = this.add.text(70, ROW_Y + ITEMS.length * ROW_H + 56, '', { fontFamily: FONT, fontSize: '18px', color: '#ff8a80' });

    this.button(VIEW_W / 2 - 80, VIEW_H - 110, '  SET SAIL  ', () => this.sail()).setFontSize(26);
    this.add
      .text(VIEW_W / 2, VIEW_H - 36, 'UP/DOWN select   LEFT/RIGHT remove/add   ENTER set sail', {
        fontFamily: FONT,
        fontSize: '16px',
        color: '#6c7f9e'
      })
      .setOrigin(0.5);

    const kb = this.input.keyboard!;
    kb.on('keydown-UP', () => this.select((this.selected + ITEMS.length - 1) % ITEMS.length));
    kb.on('keydown-DOWN', () => this.select((this.selected + 1) % ITEMS.length));
    kb.on('keydown-LEFT', () => this.change(this.selected, -1));
    kb.on('keydown-RIGHT', () => this.change(this.selected, 1));
    kb.on('keydown-ENTER', () => this.sail());
    this.refresh();
  }

  private button(x: number, y: number, label: string, onClick: () => void): Phaser.GameObjects.Text {
    const b = this.add.text(x, y, label, { fontFamily: FONT, fontSize: '20px', color: '#0b1a33', backgroundColor: '#f2c94c' });
    b.setInteractive({ useHandCursor: true })
      .on('pointerdown', onClick)
      .on('pointerover', () => b.setBackgroundColor('#ffe08a'))
      .on('pointerout', () => b.setBackgroundColor('#f2c94c'));
    return b;
  }

  private slotsUsed(): number {
    return ITEMS.reduce((sum, it) => sum + this.state.supplies[it.id] * it.slots, 0);
  }

  private select(i: number): void {
    this.selected = i;
    this.refresh();
  }

  private change(i: number, d: 1 | -1): void {
    this.selected = i;
    const item = ITEMS[i];
    const s = this.state.supplies;
    if (d > 0) {
      if (this.state.gold < item.cost) return this.refresh('Not enough gold.');
      if (this.slotsUsed() + item.slots > CARGO_CAPACITY) return this.refresh('The hold is full.');
    } else if (s[item.id] <= item.min) {
      return this.refresh();
    }
    s[item.id] += d;
    this.state.gold -= d * item.cost;
    this.refresh();
  }

  private sail(): void {
    if (this.state.supplies.food < 1) return this.refresh('You cannot cross the sea without food.');
    this.scene.start('Map', { state: this.state });
  }

  private refresh(warning = ''): void {
    ITEMS.forEach((it, i) => {
      const cursor = i === this.selected ? '>' : ' ';
      this.rows[i].setText(`${cursor} ${it.name.padEnd(12)} x${String(this.state.supplies[it.id]).padStart(2)}    ${it.cost} gold each`);
      this.rows[i].setColor(i === this.selected ? '#f2c94c' : '#ffffff');
    });
    this.footer.setText(`Gold left: ${this.state.gold}      Cargo: ${this.slotsUsed()}/${CARGO_CAPACITY}`);
    this.warning.setText(warning);
  }
}
