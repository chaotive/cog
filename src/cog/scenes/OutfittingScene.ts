import Phaser from 'phaser';
import { Expedition } from '../models/Expedition';
import { CrewRole, CREW_DEFINITIONS, ItemType, ITEM_DEFINITIONS } from '../data/ExpeditionData';

export class OutfittingScene extends Phaser.Scene {
  private expedition!: Expedition;
  private remainingGold: number = 1200;
  private readonly maxTonnage: number = 60;

  // Text references for live updates
  private goldText!: Phaser.GameObjects.Text;
  private tonnageText!: Phaser.GameObjects.Text;
  private crewCountTexts: Map<CrewRole, Phaser.GameObjects.Text> = new Map();
  private itemCountTexts: Map<ItemType, Phaser.GameObjects.Text> = new Map();
  private statsSummaryText!: Phaser.GameObjects.Text;
  private setSailButtonContainer!: Phaser.GameObjects.Container;
  private warningText!: Phaser.GameObjects.Text;

  constructor() {
    super('OutfittingScene');
  }

  public create(): void {
    const { width, height } = this.scale;
    this.expedition = new Expedition();

    // Default loadout
    this.remainingGold = 250; // leftover pocket gold for expedition
    // Initialize expedition state
    this.expedition.inventory.gold = this.remainingGold;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1e160e, 0x1e160e, 0x110c07, 0x110c07, 1);
    bg.fillRect(0, 0, width, height);

    // Parchment frame
    bg.lineStyle(2, 0xa17838, 0.8);
    bg.strokeRect(12, 12, width - 24, height - 24);

    // Title Header
    this.add.text(width / 2, 34, 'PORT OF SEVILLE — EXPEDITION OUTFITTING', {
      fontFamily: 'Georgia, serif',
      fontSize: '22px',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, 58, 'Prepare your caravel before crossing the sea. Manage gold, crew, and ship tonnage.', {
      fontFamily: 'Palatino, Georgia, serif',
      fontSize: '13px',
      color: '#c4b18c',
    }).setOrigin(0.5);

    // Status bar (Gold and Tonnage)
    const statusBg = this.add.graphics();
    statusBg.fillStyle(0x2d1f11, 1);
    statusBg.fillRoundedRect(width / 2 - 250, 78, 500, 36, 6);
    statusBg.lineStyle(2, 0xc49a45, 0.8);
    statusBg.strokeRoundedRect(width / 2 - 250, 78, 500, 36, 6);

    this.goldText = this.add.text(width / 2 - 140, 96, `💰 Treasury: ${this.remainingGold} Gold`, {
      fontFamily: 'Georgia, serif',
      fontSize: '15px',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.tonnageText = this.add.text(width / 2 + 130, 96, `⚓ Cargo: 0 / ${this.maxTonnage} Tons`, {
      fontFamily: 'Georgia, serif',
      fontSize: '15px',
      color: '#80ed99',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Columns: Left = Crew, Right = Cargo
    const colWidth = (width - 60) / 2;
    const colLeftX = 24;
    const colRightX = width / 2 + 6;
    const contentStartY = 130;

    // LEFT COLUMN: CREW
    this.createSectionHeader(colLeftX, contentStartY, colWidth, 'EXPEDITION CREW');
    let crewY = contentStartY + 35;
    const roles: CrewRole[] = [
      CrewRole.SAILOR,
      CrewRole.SOLDIER,
      CrewRole.SCOUT,
      CrewRole.DOCTOR,
      CrewRole.PRIEST,
    ];

    for (const role of roles) {
      const def = CREW_DEFINITIONS[role];
      this.createCrewRow(colLeftX, crewY, colWidth, def);
      crewY += 46;
    }

    // RIGHT COLUMN: PROVISIONS & CARGO
    this.createSectionHeader(colRightX, contentStartY, colWidth, 'SHIP PROVISIONS & CARGO');
    let itemY = contentStartY + 35;
    const items: ItemType[] = [
      ItemType.RATIONS,
      ItemType.TOOLS,
      ItemType.TRADE_GOODS,
      ItemType.MUSKETS,
      ItemType.MEDICINE,
    ];

    for (const item of items) {
      const def = ITEM_DEFINITIONS[item];
      this.createItemRow(colRightX, itemY, colWidth, def);
      itemY += 46;
    }

    // Live Stats & Readiness Panel at bottom
    const bottomPanelY = height - 130;
    const bottomBg = this.add.graphics();
    bottomBg.fillStyle(0x19140c, 0.95);
    bottomBg.fillRoundedRect(24, bottomPanelY, width - 48, 60, 6);
    bottomBg.lineStyle(1, 0x8a7040, 0.6);
    bottomBg.strokeRoundedRect(24, bottomPanelY, width - 48, 60, 6);

    this.statsSummaryText = this.add.text(width / 2, bottomPanelY + 30, '', {
      fontFamily: 'Palatino, Georgia, serif',
      fontSize: '13px',
      color: '#f0dfbe',
      align: 'center',
    }).setOrigin(0.5);

    // Bottom Navigation Buttons
    const btnY = height - 42;

    this.createActionButton(width / 2 - 160, btnY, 190, 36, '⚖️ Default Loadout', 0x3d3020, 0x8a7040, () => {
      this.applyDefaultLoadout();
    });

    this.setSailButtonContainer = this.createActionButton(
      width / 2 + 130,
      btnY,
      240,
      40,
      '⛵ SET SAIL ACROSS SEA ➔',
      0x1f5922,
      0x52b788,
      () => {
        this.confirmAndSetSail();
      }
    );

    this.warningText = this.add.text(width / 2, height - 76, '', {
      fontFamily: 'sans-serif',
      fontSize: '12px',
      color: '#ff4d4d',
    }).setOrigin(0.5);

    this.updateUI();
  }

  private createSectionHeader(x: number, y: number, width: number, title: string): void {
    const bg = this.add.graphics();
    bg.fillStyle(0x2b2014, 1);
    bg.fillRoundedRect(x, y, width, 26, 4);
    bg.lineStyle(1, 0xa17838, 0.8);
    bg.strokeRoundedRect(x, y, width, 26, 4);

    this.add.text(x + width / 2, y + 13, title, {
      fontFamily: 'Georgia, serif',
      fontSize: '13px',
      color: '#ffd700',
      fontStyle: 'bold',
      letterSpacing: 2,
    }).setOrigin(0.5);
  }

  private createCrewRow(x: number, y: number, width: number, def: any): void {
    const rowBg = this.add.graphics();
    rowBg.fillStyle(0x221a11, 0.7);
    rowBg.fillRoundedRect(x, y, width, 40, 4);

    // Icon & Name
    this.add.text(x + 10, y + 8, `${def.icon} ${def.name}`, {
      fontFamily: 'Georgia, serif',
      fontSize: '13px',
      color: '#f4ede2',
      fontStyle: 'bold',
    });

    // Subtext
    this.add.text(x + 10, y + 23, `${def.bonusText} (${def.cost}G, 1 Ton)`, {
      fontFamily: 'sans-serif',
      fontSize: '11px',
      color: '#a39379',
    });

    // Minus Button
    this.createStepperBtn(x + width - 90, y + 20, '-', () => {
      if (this.expedition.crew[def.role as CrewRole] > 0) {
        this.expedition.crew[def.role as CrewRole]--;
        this.remainingGold += def.cost;
        this.updateUI();
      }
    });

    // Count text
    const countText = this.add.text(x + width - 60, y + 20, '0', {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.crewCountTexts.set(def.role as CrewRole, countText);

    // Plus Button
    this.createStepperBtn(x + width - 30, y + 20, '+', () => {
      if (this.remainingGold >= def.cost && this.calculateTotalWeight() < this.maxTonnage) {
        this.expedition.crew[def.role as CrewRole]++;
        this.remainingGold -= def.cost;
        this.updateUI();
      }
    });
  }

  private createItemRow(x: number, y: number, width: number, def: any): void {
    const rowBg = this.add.graphics();
    rowBg.fillStyle(0x221a11, 0.7);
    rowBg.fillRoundedRect(x, y, width, 40, 4);

    // Icon & Name
    this.add.text(x + 10, y + 8, `${def.icon} ${def.name}`, {
      fontFamily: 'Georgia, serif',
      fontSize: '13px',
      color: '#f4ede2',
      fontStyle: 'bold',
    });

    // Subtext
    this.add.text(x + 10, y + 23, `${def.unitName} (${def.cost}G, ${def.weight} Tons)`, {
      fontFamily: 'sans-serif',
      fontSize: '11px',
      color: '#a39379',
    });

    // Minus Button
    this.createStepperBtn(x + width - 90, y + 20, '-', () => {
      const invKey = this.getInvKey(def.type);
      if (this.expedition.inventory[invKey] >= def.quantityPerUnit) {
        this.expedition.inventory[invKey] -= def.quantityPerUnit;
        this.remainingGold += def.cost;
        this.updateUI();
      }
    });

    // Count text
    const countText = this.add.text(x + width - 60, y + 20, '0', {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.itemCountTexts.set(def.type as ItemType, countText);

    // Plus Button
    this.createStepperBtn(x + width - 30, y + 20, '+', () => {
      if (this.remainingGold >= def.cost && this.calculateTotalWeight() + def.weight <= this.maxTonnage) {
        const invKey = this.getInvKey(def.type);
        this.expedition.inventory[invKey] += def.quantityPerUnit;
        this.remainingGold -= def.cost;
        this.updateUI();
      }
    });
  }

  private createStepperBtn(x: number, y: number, label: string, onClick: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const size = 24;

    const bg = this.add.graphics();
    bg.fillStyle(0x4a3721, 1);
    bg.fillCircle(0, 0, size / 2);
    bg.lineStyle(1, 0xc49a45, 1);
    bg.strokeCircle(0, 0, size / 2);

    const txt = this.add.text(0, 0, label, {
      fontFamily: 'sans-serif',
      fontSize: '16px',
      color: '#fdf0d5',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    container.add([bg, txt]);
    container.setSize(size, size);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerdown', onClick);
    container.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0xc49a45, 1);
      bg.fillCircle(0, 0, size / 2);
      txt.setColor('#12100e');
    });
    container.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x4a3721, 1);
      bg.fillCircle(0, 0, size / 2);
      bg.lineStyle(1, 0xc49a45, 1);
      bg.strokeCircle(0, 0, size / 2);
      txt.setColor('#fdf0d5');
    });

    return container;
  }

  private getInvKey(type: ItemType): 'rations' | 'tools' | 'tradeGoods' | 'muskets' | 'medicine' {
    switch (type) {
      case ItemType.RATIONS: return 'rations';
      case ItemType.TOOLS: return 'tools';
      case ItemType.TRADE_GOODS: return 'tradeGoods';
      case ItemType.MUSKETS: return 'muskets';
      case ItemType.MEDICINE: return 'medicine';
    }
  }

  private calculateTotalWeight(): number {
    return this.expedition.cargoWeight;
  }

  private updateUI(): void {
    // Update Gold & Tonnage
    this.goldText.setText(`💰 Treasury: ${this.remainingGold} Gold`);
    const weight = this.calculateTotalWeight();
    this.tonnageText.setText(`⚓ Cargo: ${weight} / ${this.maxTonnage} Tons`);
    if (weight > this.maxTonnage) {
      this.tonnageText.setColor('#ff4d4d');
    } else {
      this.tonnageText.setColor('#80ed99');
    }

    // Update Crew Counters
    for (const [role, txt] of this.crewCountTexts.entries()) {
      txt.setText(this.expedition.crew[role].toString());
    }

    // Update Item Counters
    for (const [item, txt] of this.itemCountTexts.entries()) {
      const invKey = this.getInvKey(item);
      txt.setText(this.expedition.inventory[invKey].toString());
    }

    // Update Live Summary
    const totalMen = this.expedition.totalCrewCount;
    const rations = this.expedition.inventory.rations;
    const estRationTurns = totalMen > 0 ? Math.floor(rations / Math.max(1, totalMen / 5)) : 0;
    const combat = this.expedition.combatStrength;
    const vision = this.expedition.visionRadius;

    this.statsSummaryText.setText(
      `👥 Total Crew: ${totalMen} men  |  🥖 Food: ${rations} rations (~${estRationTurns} turns)  |  ⚔️ Combat Power: ${combat}  |  🧭 Vision: ${vision} cells`
    );

    // Validation
    if (this.expedition.crew[CrewRole.SAILOR] < 3) {
      this.warningText.setText('⚠️ Warning: Need at least 3 sailors to safely navigate the caravel across the ocean!');
    } else if (rations < 30) {
      this.warningText.setText('⚠️ Warning: Very low rations! Your men may starve during the expedition.');
    } else {
      this.warningText.setText('');
    }
  }

  private applyDefaultLoadout(): void {
    // Reset
    this.remainingGold = 250;
    this.expedition = new Expedition();
    this.updateUI();
  }

  private confirmAndSetSail(): void {
    if (this.expedition.crew[CrewRole.SAILOR] < 2) {
      this.warningText.setText('❌ Cannot set sail without at least 2 sailors to crew the ship!');
      return;
    }
    if (this.calculateTotalWeight() > this.maxTonnage) {
      this.warningText.setText('❌ Ship is overburdened! Reduce crew or cargo tonnage.');
      return;
    }

    // Store remaining gold in pocket
    this.expedition.inventory.gold = this.remainingGold;

    // Transition to Sea Crossing Voyage
    this.scene.start('SeaVoyageScene', { expedition: this.expedition });
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
