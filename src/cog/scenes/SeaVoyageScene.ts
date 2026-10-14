import Phaser from 'phaser';
import { Expedition } from '../models/Expedition';

export class SeaVoyageScene extends Phaser.Scene {
  private expedition!: Expedition;
  private progress: number = 0;
  private shipSprite!: Phaser.GameObjects.Sprite;
  private progressBar!: Phaser.GameObjects.Graphics;
  private narrativeText!: Phaser.GameObjects.Text;
  private landingButton!: Phaser.GameObjects.Container;
  private isVoyageComplete: boolean = false;
  private voyageEvents = [
    { at: 0.1, text: 'Day 5: Steady trade winds catch the sails. The caravel makes excellent knots.' },
    { at: 0.3, text: 'Day 16: Deep oceanic swell. The crew sings sea shanties under starry skies.' },
    { at: 0.55, text: 'Day 28: A sudden gale! Sailors climb the rigging to reef the mainsail safely.' },
    { at: 0.8, text: 'Day 42: Driftwood and colorful green parakeets spotted in the sky! Land is near!' },
    { at: 1.0, text: 'LAND HO! The coast of the New World rises above the emerald horizon!' },
  ];
  private nextEventIndex: number = 0;

  constructor() {
    super('SeaVoyageScene');
  }

  public init(data: { expedition?: Expedition }): void {
    this.expedition = data.expedition || new Expedition();
  }

  public create(): void {
    const { width, height } = this.scale;
    this.progress = 0;
    this.nextEventIndex = 0;
    this.isVoyageComplete = false;

    // Ocean background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a1c30, 0x0a1c30, 0x071321, 0x071321, 1);
    bg.fillRect(0, 0, width, height);

    // Decorative Compass Rose in top right
    const compass = this.add.graphics();
    compass.lineStyle(1, 0xc49a45, 0.4);
    compass.strokeCircle(width - 60, 60, 40);
    compass.strokeCircle(width - 60, 60, 30);
    this.add.text(width - 60, 24, 'N', { fontFamily: 'serif', fontSize: '13px', color: '#ffd700', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(width - 60, 96, 'S', { fontFamily: 'serif', fontSize: '12px', color: '#c49a45' }).setOrigin(0.5);
    this.add.text(width - 24, 60, 'E', { fontFamily: 'serif', fontSize: '12px', color: '#c49a45' }).setOrigin(0.5);
    this.add.text(width - 96, 60, 'W', { fontFamily: 'serif', fontSize: '12px', color: '#c49a45' }).setOrigin(0.5);

    // Header Title
    this.add.text(width / 2, 40, 'CROSSING THE ATLANTIC OCEAN', {
      fontFamily: 'Georgia, serif',
      fontSize: '22px',
      color: '#ffd700',
      fontStyle: 'bold',
      letterSpacing: 2,
    }).setOrigin(0.5);

    this.add.text(width / 2, 65, 'Voyage from the Old World to the Continent of the Golden Cities', {
      fontFamily: 'Palatino, Georgia, serif',
      fontSize: '13px',
      color: '#a9c2d2',
    }).setOrigin(0.5);

    // Sea waves animation zone in the center
    const seaY = height * 0.45;
    const waveGraphics = this.add.graphics();
    this.drawSeaWaves(waveGraphics, seaY, width);

    // Animated Ship
    this.shipSprite = this.add.sprite(width * 0.15, seaY - 10, 'sprite_ship');
    this.shipSprite.setScale(2.2);

    // Subtle bobbing animation
    this.tweens.add({
      targets: this.shipSprite,
      y: seaY - 4,
      angle: { from: -3, to: 3 },
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Voyage Progress Bar container
    const barX = 60;
    const barY = height * 0.65;
    const barWidth = width - 120;
    const barHeight = 16;

    // Bar background
    const barBg = this.add.graphics();
    barBg.fillStyle(0x1a2634, 1);
    barBg.fillRoundedRect(barX, barY, barWidth, barHeight, 6);
    barBg.lineStyle(2, 0xc49a45, 0.8);
    barBg.strokeRoundedRect(barX, barY, barWidth, barHeight, 6);

    // Waypoint markers
    this.add.text(barX, barY - 20, '🇪🇸 Port of Seville', { fontFamily: 'sans-serif', fontSize: '12px', color: '#e6c280' });
    this.add.text(barX + barWidth * 0.5, barY - 20, '🌊 Ocean Abyssal Plain', { fontFamily: 'sans-serif', fontSize: '12px', color: '#7ba2c2' }).setOrigin(0.5, 0);
    this.add.text(barX + barWidth, barY - 20, '🌴 The New World', { fontFamily: 'sans-serif', fontSize: '12px', color: '#52b788' }).setOrigin(1, 0);

    this.progressBar = this.add.graphics();

    // Narrative event box
    const boxY = height * 0.74;
    const boxBg = this.add.graphics();
    boxBg.fillStyle(0x131d27, 0.9);
    boxBg.fillRoundedRect(width / 2 - 280, boxY, 560, 60, 6);
    boxBg.lineStyle(1, 0x415a77, 0.8);
    boxBg.strokeRoundedRect(width / 2 - 280, boxY, 560, 60, 6);

    this.narrativeText = this.add.text(width / 2, boxY + 30, 'The expedition sets sail from Spain with full sails and great hope...', {
      fontFamily: 'Georgia, serif',
      fontSize: '13px',
      color: '#ffd700',
      fontStyle: 'italic',
      align: 'center',
      wordWrap: { width: 530 },
    }).setOrigin(0.5);

    // Landing Button (initially hidden)
    this.landingButton = this.createActionButton(
      width / 2,
      height - 45,
      320,
      44,
      '⚓ DROP ANCHOR & EXPLORE CONTINENT',
      0x1f5922,
      0x52b788,
      () => {
        this.scene.start('ExplorationScene', { expedition: this.expedition });
      }
    );
    this.landingButton.setVisible(false);

    // Automatic voyage simulation tween
    this.tweens.add({
      targets: this,
      progress: 1.0,
      duration: 6500,
      ease: 'Cubic.easeInOut',
      onUpdate: () => {
        this.updateVoyage();
      },
      onComplete: () => {
        this.completeVoyage();
      },
    });
  }

  private drawSeaWaves(g: Phaser.GameObjects.Graphics, y: number, width: number): void {
    g.clear();
    // Deep water
    g.fillStyle(0x133857, 0.8);
    g.fillRect(0, y, width, 100);
    // Wave lines
    g.lineStyle(2, 0x2774a3, 0.6);
    for (let x = 0; x < width; x += 40) {
      g.beginPath();
      g.arc(x + 20, y + 10, 16, Math.PI, 0);
      g.stroke();
      g.beginPath();
      g.arc(x + 40, y + 35, 16, Math.PI, 0);
      g.stroke();
    }
  }

  private updateVoyage(): void {
    const { width } = this.scale;
    const barX = 60;
    const barY = this.scale.height * 0.65;
    const barWidth = width - 120;
    const barHeight = 16;

    // Update progress bar
    this.progressBar.clear();
    this.progressBar.fillStyle(0x52b788, 1);
    this.progressBar.fillRoundedRect(barX + 2, barY + 2, Math.max(4, (barWidth - 4) * this.progress), barHeight - 4, 4);

    // Move ship across screen
    const startX = width * 0.15;
    const endX = width * 0.85;
    this.shipSprite.x = startX + (endX - startX) * this.progress;

    // Check narrative events
    if (this.nextEventIndex < this.voyageEvents.length) {
      const ev = this.voyageEvents[this.nextEventIndex];
      if (this.progress >= ev.at) {
        this.narrativeText.setText(ev.text);
        this.nextEventIndex++;
      }
    }
  }

  private completeVoyage(): void {
    this.isVoyageComplete = true;
    this.landingButton.setVisible(true);

    // Small celebratory camera pulse
    this.cameras.main.flash(400, 255, 215, 0, false);
  }

  private createActionButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    bgColor: number,
    borderColor: number,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(bgColor, 1);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 6);
    bg.lineStyle(2, borderColor, 1);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 6);

    const txt = this.add.text(0, 0, label, {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: '#fdf0d5',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    container.add([bg, txt]);
    container.setSize(width, height);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerdown', onClick);
    container.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(borderColor, 1);
      bg.fillRoundedRect(-width / 2, -height / 2, width, height, 6);
      bg.lineStyle(2, 0xffffff, 1);
      bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 6);
      txt.setColor('#12100e');
    });
    container.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(bgColor, 1);
      bg.fillRoundedRect(-width / 2, -height / 2, width, height, 6);
      bg.lineStyle(2, borderColor, 1);
      bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 6);
      txt.setColor('#fdf0d5');
    });

    return container;
  }
}
