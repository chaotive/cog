import Phaser from 'phaser';
import { Expedition } from './expedition.ts';
import { TERRAIN } from './data.ts';
import { tileAt } from './world.ts';
import type { Point } from '../game/grid.ts';

const T = 36;
const hex = (n: number, factor: number) => Phaser.Display.Color.GetColor(Math.min(255, ((n >> 16) & 255) * factor), Math.min(255, ((n >> 8) & 255) * factor), Math.min(255, (n & 255) * factor));

/** Phaser owns drawing and camera controls. The expedition owns every rule. */
export class AtlasScene extends Phaser.Scene {
  expedition: Expedition;
  onSelect: (p: Point) => void;
  private terrain!: Phaser.GameObjects.Graphics;
  private fog!: Phaser.GameObjects.Graphics;
  private marks!: Phaser.GameObjects.Graphics;
  private player!: Phaser.GameObjects.Container;
  private labels: Phaser.GameObjects.Text[] = [];
  private selected: Point | null = null;
  private drag: { x: number; y: number; cx: number; cy: number } | null = null;
  private lastPlayer = '';
  private ready = false;
  constructor(expedition: Expedition, onSelect: (p: Point) => void) {
    super('Atlas'); this.expedition = expedition; this.onSelect = onSelect;
  }
  create(): void {
    this.cameras.main.setBackgroundColor('#314f51');
    this.terrain = this.add.graphics();
    this.fog = this.add.graphics().setDepth(2);
    this.marks = this.add.graphics().setDepth(3);
    const ring = this.add.graphics();
    ring.fillStyle(0x102c30, .28).fillEllipse(0, 10, 30, 14);
    ring.fillStyle(0xf4e9c8).fillCircle(0, 0, 13);
    ring.lineStyle(2, 0x273f3b).strokeCircle(0, 0, 13);
    ring.fillStyle(0xb56d3e).fillTriangle(0, -9, 7, 6, -7, 6);
    ring.fillStyle(0xf3d58a).fillTriangle(0, -9, 0, 5, -7, 6);
    this.player = this.add.container(0, 0, [ring]).setDepth(6);
    this.tweens.add({ targets: this.player, scale: { from: 1, to: 1.08 }, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { this.drag = { x: p.x, y: p.y, cx: this.cameras.main.scrollX, cy: this.cameras.main.scrollY }; });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!p.isDown || !this.drag) return;
      const cam = this.cameras.main;
      cam.setScroll(this.drag.cx - (p.x - this.drag.x) / cam.zoom, this.drag.cy - (p.y - this.drag.y) / cam.zoom);
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (!this.drag) return;
      const moved = Math.hypot(p.x - this.drag.x, p.y - this.drag.y); this.drag = null;
      if (moved > 7) return;
      const world = this.cameras.main.getWorldPoint(p.x, p.y);
      const coord = { x: Math.floor(world.x / T), y: Math.floor(world.y / T) };
      if (tileAt(this.expedition.state.world, coord)) { this.selected = coord; this.onSelect(coord); this.refresh(); }
    });
    this.input.on('wheel', (_p: unknown, _objects: unknown, _dx: number, dy: number) => this.zoom(dy > 0 ? -.1 : .1));
    this.scale.on('resize', () => this.center());
    this.ready = true;
    this.drawTerrain(); this.refresh(); this.center();
  }
  setExpedition(expedition: Expedition): void { this.expedition = expedition; this.selected = null; this.lastPlayer = ''; if (this.ready) { this.drawTerrain(); this.refresh(); this.center(); } }
  center(): void { if (this.ready) this.cameras.main.centerOn((this.expedition.state.player.x + .5) * T, (this.expedition.state.player.y + .5) * T); }
  zoom(delta: number): void { if (this.ready) { this.cameras.main.setZoom(Phaser.Math.Clamp(this.cameras.main.zoom + delta, .55, 1.6)); this.center(); } }
  private drawTerrain(): void {
    const g = this.terrain, world = this.expedition.state.world;
    g.clear(); this.labels.forEach(l => l.destroy()); this.labels = [];
    for (let y = 0; y < world.height; y++) for (let x = 0; x < world.width; x++) {
      const tile = tileAt(world, { x, y })!, c = TERRAIN[tile.terrain].color;
      const px = x * T, py = y * T;
      const noise = ((x * 127 + y * 311 + world.seed) % 17) / 120;
      g.fillStyle(hex(c, .94 + noise)).fillRect(px, py, T, T);
      g.lineStyle(1, 0x233e35, tile.terrain === 'ocean' ? .06 : .1).strokeRect(px, py, T, T);
      const rnd = (n: number) => ((x * 73 + y * 197 + n * 37) % 29) / 29;
      if (tile.terrain === 'ocean' || tile.terrain === 'river') {
        g.lineStyle(1, 0xd5e6d0, .17);
        for (let i = 0; i < 2; i++) {
          const wx = px + 4 + rnd(i) * 12, wy = py + 8 + i * 15;
          g.beginPath(); g.moveTo(wx, wy); g.lineTo(wx + 6, wy + 2); g.lineTo(wx + 13, wy); g.strokePath();
        }
        if (tile.terrain === 'ocean') {
          // Bright shallows trace the coast without needing external artwork.
          for (const d of [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }, { x: -1, y: 0 }]) {
            const other = tileAt(world, { x: x + d.x, y: y + d.y });
            if (other && other.terrain !== 'ocean') {
              g.fillStyle(0x94b8a5, .4);
              if (d.x) g.fillRect(px + (d.x > 0 ? T - 5 : 0), py, 5, T);
              else g.fillRect(px, py + (d.y > 0 ? T - 5 : 0), T, 5);
            }
          }
        }
      } else if (['forest', 'jungle'].includes(tile.terrain)) {
        for (let i = 0; i < 3; i++) {
          const tx = px + 8 + rnd(i) * 21, ty = py + 10 + rnd(i + 4) * 19;
          g.fillStyle(0x163f35, .22).fillEllipse(tx + 2, ty + 6, 15, 7);
          g.lineStyle(2, 0x395b3f, .7).lineBetween(tx, ty, tx, ty + 7);
          g.fillStyle(tile.terrain === 'jungle' ? 0x32664e : 0x47775a, .9).fillTriangle(tx, ty - 9, tx - 7, ty + 3, tx + 7, ty + 3);
          g.fillStyle(0x8dab70, .28).fillTriangle(tx, ty - 9, tx - 7, ty + 3, tx, ty + 1);
        }
      } else if (tile.terrain === 'mountain' || tile.terrain === 'hill') {
        const peak = tile.terrain === 'mountain';
        g.fillStyle(0x4f655c, .27).fillTriangle(px + 22, py + 6, px + 5, py + 31, px + 35, py + 31);
        g.fillStyle(peak ? 0x747f74 : 0x8c936c).fillTriangle(px + 18, py + (peak ? 2 : 13), px + 2, py + 29, px + 32, py + 29);
        g.fillStyle(peak ? 0xb8bb9f : 0xb0af80).fillTriangle(px + 18, py + (peak ? 2 : 13), px + 2, py + 29, px + 18, py + 24);
        if (peak) g.fillStyle(0xe1ddbc, .8).fillTriangle(px + 18, py + 2, px + 12, py + 12, px + 23, py + 11);
      } else {
        g.lineStyle(1, 0x3f6749, .24);
        for (let i = 0; i < 3; i++) {
          const tx = px + 4 + rnd(i) * 27, ty = py + 7 + rnd(i + 3) * 24;
          g.lineBetween(tx, ty, tx + 2, ty - 3);
          g.lineBetween(tx + 2, ty - 3, tx + 4, ty);
        }
      }
    }
    for (const site of world.sites) {
      const label = this.add.text((site.x + .5) * T, (site.y + 1) * T + 5, site.name.split(' · ')[0].toUpperCase(), {
        fontFamily: 'Georgia, serif', fontSize: '11px', color: '#fff2c8', stroke: '#243f36', strokeThickness: 4, letterSpacing: 1.5,
      }).setOrigin(.5, 0).setDepth(5);
      this.labels.push(label);
    }
    this.cameras.main.setBounds(-140, -100, world.width * T + 280, world.height * T + 200);
    this.cameras.main.setZoom(this.scale.width < 600 ? .8 : 1);
  }
  refresh(): void {
    if (!this.ready) return;
    const s = this.expedition.state, world = s.world, fog = this.fog, g = this.marks;
    fog.clear(); g.clear();
    for (let y = 0; y < world.height; y++) for (let x = 0; x < world.width; x++) {
      const tile = tileAt(world, { x, y })!;
      if (!tile.seen) {
        fog.fillStyle(0x304d4d, 1).fillRect(x * T, y * T, T, T);
        fog.fillStyle(0x9ba98a, .1).fillCircle(x * T + 18, y * T + 18, .8);
        if ((x * 3 + y * 7) % 43 === 0) {
          fog.lineStyle(1, 0x8a9b81, .13).lineBetween(x * T + 12, y * T + 18, x * T + 24, y * T + 18);
          fog.lineBetween(x * T + 18, y * T + 12, x * T + 18, y * T + 24);
        }
      } else if (!this.expedition.visible({ x, y })) fog.fillStyle(0x193638, .28).fillRect(x * T, y * T, T, T);
    }
    world.sites.forEach((site, i) => {
      const seen = !!tileAt(world, site)?.seen;
      this.labels[i].setVisible(seen);
      if (!seen) return;
      const x = (site.x + .5) * T, y = (site.y + .5) * T;
      g.fillStyle(0x183b33, .3).fillEllipse(x + 2, y + 10, 31, 13);
      if (site.kind === 'city' || site.kind === 'ruin') {
        const color = site.kind === 'city' ? 0xe5be65 : 0xc8c3a0;
        g.fillStyle(0x614e35).fillRect(x - 13, y + 8, 26, 4);
        g.fillStyle(color).fillRect(x - 11, y + 3, 22, 5).fillRect(x - 8, y - 3, 16, 6).fillRect(x - 5, y - 10, 10, 7);
        g.fillStyle(0x6e6343).fillRect(x - 2, y + 1, 4, 10);
        if (site.resolved) g.lineStyle(2, 0xffedb0).strokeCircle(x, y, 17);
      } else if (site.kind === 'village') {
        for (const dx of [-7, 6]) {
          g.fillStyle(0xe6d7ae).fillRect(x + dx - 5, y, 10, 10);
          g.fillStyle(0xb0714c).fillTriangle(x + dx, y - 8, x + dx - 8, y + 1, x + dx + 8, y + 1);
          g.fillStyle(0x5c624a).fillRect(x + dx - 1, y + 4, 3, 6);
        }
      } else if (site.kind === 'ship') {
        g.fillStyle(0x644b34).fillTriangle(x - 16, y + 4, x + 15, y + 4, x + 7, y + 13);
        g.lineStyle(2, 0x524b36).lineBetween(x, y - 15, x, y + 6);
        g.fillStyle(0xf8e9bb).fillTriangle(x - 1, y - 14, x - 1, y + 3, x - 13, y + 1);
        g.fillStyle(0xdfc384).fillTriangle(x + 2, y - 12, x + 2, y + 2, x + 12, y);
      } else {
        g.fillStyle(0x397d84).fillEllipse(x, y + 4, 28, 17);
        g.lineStyle(2, 0xb7d3b7).strokeEllipse(x, y + 4, 21, 11);
        g.fillStyle(0xe4dec0).fillCircle(x - 12, y, 4).fillCircle(x + 9, y - 2, 5);
      }
    });
    for (const enemy of world.enemies) if (enemy.alive && this.expedition.visible(enemy)) {
      const x = (enemy.x + .5) * T, y = (enemy.y + .5) * T;
      g.fillStyle(0x8e4939).fillCircle(x, y, 10);
      g.lineStyle(1, 0xf1b287).strokeCircle(x, y, 10);
      g.fillStyle(0xffdeb0).fillTriangle(x, y - 5, x - 2, y + 2, x + 2, y + 2).fillCircle(x, y + 5, 1);
    }
    if (this.selected) {
      g.lineStyle(2, 0xf5df9f, .9).strokeRect(this.selected.x * T + 2, this.selected.y * T + 2, T - 4, T - 4);
    }
    this.player.setPosition((s.player.x + .5) * T, (s.player.y + .5) * T);
    if (this.lastPlayer !== `${s.player.x},${s.player.y}`) { this.lastPlayer = `${s.player.x},${s.player.y}`; this.center(); }
  }
}
