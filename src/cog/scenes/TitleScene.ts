import Phaser from 'phaser';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  public create(): void {
    const { width, height } = this.scale;

    // Atmospheric dark parchment background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a130b, 0x1a130b, 0x0d0a06, 0x0d0a06, 1);
    bg.fillRect(0, 0, width, height);

    // Decorative ornate border
    bg.lineStyle(3, 0xc49a45, 0.8);
    bg.strokeRect(16, 16, width - 32, height - 32);
    bg.lineStyle(1, 0x7a5a22, 0.6);
    bg.strokeRect(22, 22, width - 44, height - 44);

    // Decorative Compass / Sun motif
    const decor = this.add.graphics();
    decor.fillStyle(0xc49a45, 0.15);
    decor.fillCircle(width / 2, height * 0.28, 90);
    decor.lineStyle(2, 0xc49a45, 0.4);
    decor.strokeCircle(width / 2, height * 0.28, 90);
    decor.strokeCircle(width / 2, height * 0.28, 70);

    // Main Title
    const titleText = this.add.text(width / 2, height * 0.25, 'CITIES OF GOLD', {
      fontFamily: 'Georgia, serif',
      fontSize: '44px',
      color: '#ffd700',
      fontStyle: 'bold',
      stroke: '#3a200a',
      strokeThickness: 6,
      shadow: { offsetX: 3, offsetY: 3, color: '#000000', blur: 8, fill: true },
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.33, '— THE NEW WORLD EXPEDITION —', {
      fontFamily: 'Palatino, Georgia, serif',
      fontSize: '18px',
      color: '#e6c280',
      letterSpacing: 4,
    }).setOrigin(0.5);

    // Narrative lore teaser
    const loreText =
      'Seville, 1538.\n' +
      'By decree of the Crown, you command a caravel bound for uncharted waters.\n' +
      'Outfit your crew and provisions, sail across perilous seas, and lead your expedition\n' +
      'through jungles and mountain valleys in search of the mythical Golden Cities.';

    this.add.text(width / 2, height * 0.48, loreText, {
      fontFamily: 'Palatino, Georgia, serif',
      fontSize: '15px',
      color: '#d4b886',
      align: 'center',
      lineSpacing: 8,
    }).setOrigin(0.5);

    // Feature highlights
    const features = '⚓ Ship Outfitting   •   🌊 Sea Crossing   •   🗺️ Cell-Based Turn Map   •   ⚔️ Hostile Encounters';
    this.add.text(width / 2, height * 0.62, features, {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#9e8557',
    }).setOrigin(0.5);

    // Buttons Container
    this.createMenuButton(width / 2, height * 0.73, '★  START EXPEDITION  ★', 0x8b5a2b, 0xc49a45, () => {
      this.scene.start('OutfittingScene');
    });

    this.createMenuButton(width / 2, height * 0.83, '📖  HOW TO PLAY  📖', 0x3d3020, 0x8a7040, () => {
      this.showInstructionsModal();
    });

    // Version label
    this.add.text(width / 2, height - 30, 'COG Engine v1.0 • Node.js / TypeScript / Phaser 3', {
      fontFamily: 'sans-serif',
      fontSize: '11px',
      color: '#635338',
    }).setOrigin(0.5);
  }

  private createMenuButton(
    x: number,
    y: number,
    text: string,
    bgColor: number,
    borderColor: number,
    callback: () => void
  ): Phaser.GameObjects.Container {
    const btnWidth = 280;
    const btnHeight = 44;

    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(bgColor, 1);
    bg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 6);
    bg.lineStyle(2, borderColor, 1);
    bg.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 6);

    const label = this.add.text(0, 0, text, {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      color: '#fdf0d5',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    container.add([bg, label]);

    container.setSize(btnWidth, btnHeight);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(borderColor, 1);
      bg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 6);
      bg.lineStyle(2, 0xffffff, 1);
      bg.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 6);
      label.setColor('#12100e');
    });

    container.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(bgColor, 1);
      bg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 6);
      bg.lineStyle(2, borderColor, 1);
      bg.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 6);
      label.setColor('#fdf0d5');
    });

    container.on('pointerdown', callback);

    return container;
  }

  private showInstructionsModal(): void {
    const { width, height } = this.scale;

    const modal = this.add.container(0, 0).setDepth(100);

    const scrim = this.add.graphics();
    scrim.fillStyle(0x000000, 0.75);
    scrim.fillRect(0, 0, width, height);
    scrim.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);

    const panelWidth = Math.min(640, width - 40);
    const panelHeight = Math.min(500, height - 60);
    const px = (width - panelWidth) / 2;
    const py = (height - panelHeight) / 2;

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x221a10, 1);
    panelBg.fillRoundedRect(px, py, panelWidth, panelHeight, 10);
    panelBg.lineStyle(3, 0xc49a45, 1);
    panelBg.strokeRoundedRect(px, py, panelWidth, panelHeight, 10);

    const header = this.add.text(width / 2, py + 30, 'EXPEDITION FIELD INSTRUCTIONS', {
      fontFamily: 'Georgia, serif',
      fontSize: '20px',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const rules = [
      '1. OUTFITTING: Allocate royal gold in Seville. Balance crew (Sailors, Soldiers, Scouts, Doctors) with essential provisions (Rations, Tools, Muskets).',
      '2. VOYAGE: Cross the sea to anchor your flagship on the coast of the New World.',
      '3. TURN-BASED EXPLORATION: Every move steps 1 cell and advances 1 turn.',
      '4. SUPPLY CONSUMPTION: Your crew consumes rations every turn. Starvation causes illness, desertion, and mutiny.',
      '5. TERRAIN: Jungles and swamps are arduous (costing extra movement and rations). Tools help machete through vines.',
      '6. COMPUTER-CONTROLLED FOES: Hostile wildlife (Jaguars, Alligators) and rival patrols move when your turn ends. Protect your men!',
      '7. CITIES OF GOLD: Uncover Ancient Ruins for golden artifacts and clues to locate the fabled golden metropolis: Manoa / El Dorado.',
      '8. RETURN TO SHIP: Bank your discovered gold in your ship hold for maximum score and honor.',
    ];

    const bodyText = this.add.text(px + 24, py + 65, rules.join('\n\n'), {
      fontFamily: 'Palatino, Georgia, serif',
      fontSize: '13px',
      color: '#e0cda7',
      wordWrap: { width: panelWidth - 48 },
      lineSpacing: 4,
    });

    const closeBtn = this.createMenuButton(width / 2, py + panelHeight - 40, 'UNDERSTOOD, CAPTAIN', 0x8b5a2b, 0xc49a45, () => {
      modal.destroy();
    });

    modal.add([scrim, panelBg, header, bodyText, closeBtn]);
  }
}
