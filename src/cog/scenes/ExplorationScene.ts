import Phaser from 'phaser';
import { TurnManager, TurnPhase } from '../../game/turns/TurnManager';
import { GridCoord, coordsEqual, manhattanDistance } from '../../game/grid/GridCoord';
import { Expedition } from '../models/Expedition';
import { WorldMap, FogState } from '../models/WorldMap';
import { EnemyAI } from '../models/EnemyAI';
import { LandmarkEntity } from '../models/LandmarkEntity';
import { EnemyEntity } from '../models/EnemyEntity';
import { LandmarkType, LANDMARK_DEFINITIONS } from '../data/LandmarkData';
import { EnemyType, ENEMY_DEFINITIONS } from '../data/EnemyData';
import { TerrainType, TERRAIN_DEFINITIONS } from '../data/TerrainData';

export class ExplorationScene extends Phaser.Scene {
  private expedition!: Expedition;
  private map!: WorldMap;
  private turnManager!: TurnManager;

  // Player position on grid
  private playerCoord!: GridCoord;

  // Grid visual tile sprites
  private readonly tileSize: number = 32;
  private tileSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private fogSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private landmarkSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private enemySprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private playerSprite!: Phaser.GameObjects.Sprite;
  private selectionCursor!: Phaser.GameObjects.Sprite;

  // Containers
  private mapContainer!: Phaser.GameObjects.Container;
  private hudContainer!: Phaser.GameObjects.Container;
  private activeModal: Phaser.GameObjects.Container | null = null;

  // HUD Elements
  private turnText!: Phaser.GameObjects.Text;
  private rationsText!: Phaser.GameObjects.Text;
  private crewText!: Phaser.GameObjects.Text;
  private moraleText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private leaderText!: Phaser.GameObjects.Text;
  private logText!: Phaser.GameObjects.Text;

  // Minimap
  private minimapContainer!: Phaser.GameObjects.Container;
  private minimapGraphics!: Phaser.GameObjects.Graphics;
  private isMinimapOpen: boolean = false;

  // Activity Log history
  private activityLogs: string[] = [];

  constructor() {
    super('ExplorationScene');
  }

  public init(data: { expedition?: Expedition }): void {
    this.expedition = data.expedition || new Expedition();
  }

  public create(): void {
    const { width, height } = this.scale;

    // 1. Initialize Map & Turn Manager
    this.map = new WorldMap(48, 32);
    this.playerCoord = { ...this.map.shipPosition };

    this.turnManager = new TurnManager({
      onTurnStart: (turn) => {
        this.updateHUD();
      },
      onEnemyTurn: async () => {
        await this.handleEnemyTurn();
      },
    });

    // 2. Setup Map Visual Container with Camera
    this.mapContainer = this.add.container(0, 0);

    this.renderWorldMap();
    this.setupPlayerParty();
    this.updateFogAndVisibility();

    // 3. Setup Camera
    this.setupCamera();

    // 4. Setup Input (Keyboard + Mouse)
    this.setupInput();

    // 5. Setup UI HUD Overlay (fixed to camera)
    this.setupHUD();

    // 6. Setup Minimap Window
    this.setupMinimap();

    // Initial log message
    this.log(`Day 1: Anchored at the coast. Ready to explore the New World continent!`);
    this.log(`Tip: Move with WASD, Arrow keys, or click adjacent cells.`);

    this.updateHUD();
  }

  private setupCamera(): void {
    const { width, height } = this.scale;
    const worldWidth = this.map.width * this.tileSize;
    const worldHeight = this.map.height * this.tileSize;

    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setZoom(1.35);
    this.centerCameraOnPlayer();
  }

  private centerCameraOnPlayer(smooth: boolean = false): void {
    const targetX = this.playerCoord.x * this.tileSize + this.tileSize / 2;
    const targetY = this.playerCoord.y * this.tileSize + this.tileSize / 2;

    if (smooth) {
      this.cameras.main.pan(targetX, targetY, 200, 'Sine.easeInOut');
    } else {
      this.cameras.main.centerOn(targetX, targetY);
    }
  }

  private renderWorldMap(): void {
    // 1. Terrain Tiles
    for (let y = 0; y < this.map.height; y++) {
      for (let x = 0; x < this.map.width; x++) {
        const terrain = this.map.terrainGrid.get(x, y)!;
        const px = x * this.tileSize + this.tileSize / 2;
        const py = y * this.tileSize + this.tileSize / 2;

        const tile = this.add.sprite(px, py, `tile_${terrain}`);
        this.mapContainer.add(tile);
        this.tileSprites.set(`${x},${y}`, tile);

        // Fog overlay sprite
        const fog = this.add.sprite(px, py, 'fog_hidden');
        this.mapContainer.add(fog);
        this.fogSprites.set(`${x},${y}`, fog);
      }
    }

    // 2. Landmarks
    for (const landmark of this.map.landmarks) {
      const px = landmark.x * this.tileSize + this.tileSize / 2;
      const py = landmark.y * this.tileSize + this.tileSize / 2;
      const sprite = this.add.sprite(px, py, `landmark_${landmark.landmarkType}`);
      this.mapContainer.add(sprite);
      this.landmarkSprites.set(landmark.id, sprite);
    }

    // 3. Enemies
    for (const enemy of this.map.enemies) {
      const px = enemy.x * this.tileSize + this.tileSize / 2;
      const py = enemy.y * this.tileSize + this.tileSize / 2;
      const sprite = this.add.sprite(px, py, `enemy_${enemy.enemyType}`);
      this.mapContainer.add(sprite);
      this.enemySprites.set(enemy.id, sprite);
    }

    // 4. Selection Cursor
    this.selectionCursor = this.add.sprite(0, 0, 'selection_cursor');
    this.selectionCursor.setVisible(false);
    this.selectionCursor.setDepth(15);
    this.mapContainer.add(this.selectionCursor);
  }

  private setupPlayerParty(): void {
    const px = this.playerCoord.x * this.tileSize + this.tileSize / 2;
    const py = this.playerCoord.y * this.tileSize + this.tileSize / 2;
    this.playerSprite = this.add.sprite(px, py, 'sprite_player');
    this.playerSprite.setDepth(20);
    this.mapContainer.add(this.playerSprite);
  }

  private updateFogAndVisibility(): void {
    this.map.updateFog(this.playerCoord.x, this.playerCoord.y, this.expedition.visionRadius);

    for (let y = 0; y < this.map.height; y++) {
      for (let x = 0; x < this.map.width; x++) {
        const key = `${x},${y}`;
        const fog = this.fogSprites.get(key);
        const fogState = this.map.fogGrid.get(x, y);

        if (!fog) continue;

        if (fogState === FogState.VISIBLE) {
          fog.setVisible(false);
        } else if (fogState === FogState.EXPLORED) {
          fog.setVisible(true);
          fog.setTexture('fog_explored');
        } else {
          fog.setVisible(true);
          fog.setTexture('fog_hidden');
        }
      }
    }

    // Update landmark visibility
    for (const landmark of this.map.landmarks) {
      const sprite = this.landmarkSprites.get(landmark.id);
      if (sprite) {
        const isExplored = this.map.isExplored(landmark.x, landmark.y);
        sprite.setVisible(isExplored && landmark.isActive);
      }
    }

    // Update enemy visibility: Only visible if CURRENTLY in visible sight!
    for (const enemy of this.map.enemies) {
      const sprite = this.enemySprites.get(enemy.id);
      if (sprite) {
        const isCurrentlyVisible = this.map.isVisible(enemy.x, enemy.y);
        sprite.setVisible(isCurrentlyVisible && enemy.isActive && !enemy.isDefeated);
      }
    }
  }

  private setupInput(): void {
    // Keyboard Input
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (this.activeModal !== null) return;
      if (!this.turnManager.isPlayerTurn) return;

      let dx = 0;
      let dy = 0;

      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          dy = -1;
          break;
        case 'ArrowDown':
        case 'KeyS':
          dy = 1;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          dx = -1;
          break;
        case 'ArrowRight':
        case 'KeyD':
          dx = 1;
          break;
        case 'Space':
          this.waitTurn();
          return;
        case 'KeyC':
          this.makeCamp();
          return;
        case 'KeyM':
          this.toggleMinimap();
          return;
        default:
          return;
      }

      if (dx !== 0 || dy !== 0) {
        this.attemptMove(this.playerCoord.x + dx, this.playerCoord.y + dy);
      }
    });

    // Mouse pointer movement & clicking
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.activeModal !== null) return;

      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const cellX = Math.floor(worldPoint.x / this.tileSize);
      const cellY = Math.floor(worldPoint.y / this.tileSize);

      if (this.map.terrainGrid.isInBounds(cellX, cellY)) {
        this.selectionCursor.setPosition(
          cellX * this.tileSize + this.tileSize / 2,
          cellY * this.tileSize + this.tileSize / 2
        );
        this.selectionCursor.setVisible(true);
      } else {
        this.selectionCursor.setVisible(false);
      }
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.activeModal !== null) return;
      if (pointer.y < 80 || pointer.y > this.scale.height - 110) return; // Prevent clicking through HUD
      if (!this.turnManager.isPlayerTurn) return;

      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const targetX = Math.floor(worldPoint.x / this.tileSize);
      const targetY = Math.floor(worldPoint.y / this.tileSize);

      // Only allow clicking adjacent cells or current cell to move
      const dist = manhattanDistance(this.playerCoord, { x: targetX, y: targetY });
      if (dist === 1) {
        this.attemptMove(targetX, targetY);
      } else if (dist === 0) {
        this.waitTurn();
      }
    });
  }

  private attemptMove(targetX: number, targetY: number): void {
    if (!this.map.terrainGrid.isInBounds(targetX, targetY)) {
      return;
    }

    const terrain = this.map.getTerrain(targetX, targetY);

    // If moving onto ocean without ship
    if (!terrain.passableOnFoot) {
      if (terrain.type === TerrainType.MOUNTAINS) {
        this.log(`⚠️ Jagged mountain cliffs block the passage!`);
      } else if (terrain.type === TerrainType.DEEP_OCEAN || terrain.type === TerrainType.SHALLOW_OCEAN) {
        this.log(`⚠️ You cannot march across deep open sea on foot!`);
      }
      return;
    }

    // Check if moving directly into an enemy -> triggers attack
    const enemy = this.map.getEnemyAt(targetX, targetY);
    if (enemy) {
      this.engageCombatWith(enemy);
      return;
    }

    // Execute Move via TurnManager
    this.turnManager.commitPlayerAction(async () => {
      await this.executePlayerStep(targetX, targetY, terrain);
    });
  }

  private async executePlayerStep(targetX: number, targetY: number, terrain: any): Promise<void> {
    // Move player coordinate
    this.playerCoord = { x: targetX, y: targetY };

    // Move sprite animation
    const targetPx = targetX * this.tileSize + this.tileSize / 2;
    const targetPy = targetY * this.tileSize + this.tileSize / 2;

    await new Promise<void>((resolve) => {
      this.tweens.add({
        targets: this.playerSprite,
        x: targetPx,
        y: targetPy,
        duration: 120,
        ease: 'Linear',
        onComplete: () => resolve(),
      });
    });

    this.centerCameraOnPlayer(true);

    // Supply consumption
    const consumptionResult = this.expedition.consumeTurn(terrain.moveCost);
    if (consumptionResult.starving) {
      this.log(`⚠️ Starvation! The expedition has run out of food! Morale falls.`);
      if (consumptionResult.lossEvent) {
        this.log(`💀 ${consumptionResult.lossEvent}`);
      }
    } else {
      this.log(`Moved onto ${terrain.name}. (-${consumptionResult.rationsConsumed} rations)`);
    }

    // Foraging chance
    if (terrain.forageChance > 0) {
      const foraged = this.expedition.forage(terrain.forageChance);
      if (foraged > 0) {
        this.log(`🍎 Foraged ${foraged} wild fruit and game from the wilderness!`);
      }
    }

    // Update fog
    this.updateFogAndVisibility();

    // Check if stepping on a landmark
    const landmark = this.map.getLandmarkAt(targetX, targetY);
    if (landmark) {
      this.handleLandmarkEncounter(landmark);
    }

    // Check survival/game over
    if (this.expedition.totalCrewCount <= 0 || this.expedition.health <= 0) {
      this.showGameOverModal('Your expedition party has perished in the wilderness.');
    }
  }

  private waitTurn(): void {
    if (!this.turnManager.isPlayerTurn) return;

    this.turnManager.commitPlayerAction(async () => {
      this.log(`Waited a turn to observe terrain and rest.`);
      const res = this.expedition.consumeTurn(0.8);
      this.updateFogAndVisibility();
    });
  }

  private async handleEnemyTurn(): Promise<void> {
    const aiResults = EnemyAI.processEnemyTurn(
      this.map,
      this.map.enemies,
      this.playerCoord,
      this.expedition
    );

    for (const res of aiResults) {
      if (res.type === 'MOVED') {
        const sprite = this.enemySprites.get(res.enemy.id);
        if (sprite) {
          const px = res.toCoord.x * this.tileSize + this.tileSize / 2;
          const py = res.toCoord.y * this.tileSize + this.tileSize / 2;
          this.tweens.add({
            targets: sprite,
            x: px,
            y: py,
            duration: 100,
          });
        }
      } else if (res.type === 'ATTACKED') {
        if (res.message) {
          this.log(`⚔️ ${res.message}`);
        }
        // Hostile enemy reached player!
        this.engageCombatWith(res.enemy);
        break;
      }
    }

    this.updateFogAndVisibility();
  }

  // ==========================================
  // LANDMARK & ENCOUNTER LOGIC
  // ==========================================

  private handleLandmarkEncounter(landmark: LandmarkEntity): void {
    switch (landmark.landmarkType) {
      case LandmarkType.SHIP_ANCHOR:
        this.showShipDepotModal(landmark);
        break;

      case LandmarkType.NATIVE_VILLAGE:
        this.showNativeVillageModal(landmark);
        break;

      case LandmarkType.ANCIENT_RUINS:
        this.showAncientRuinsModal(landmark);
        break;

      case LandmarkType.GOLDEN_TEMPLE:
        this.showGoldenTempleModal(landmark);
        break;

      case LandmarkType.CITY_OF_GOLD:
        this.showCityOfGoldTriumphModal(landmark);
        break;

      case LandmarkType.FRESH_SPRING:
        this.showFreshSpringModal(landmark);
        break;
    }
  }

  private showShipDepotModal(landmark: LandmarkEntity): void {
    const goldInPack = this.expedition.inventory.gold;
    const relicsInPack = this.expedition.inventory.goldRelics;
    const bankedGold = this.expedition.shipStores.gold;

    this.createModal(
      'CARAVEL FLAGSHIP ANCHORAGE',
      `You have returned to your flagship anchored safely by the sandy coast.\n\n` +
      `• Gold on expedition: ${goldInPack} Doubloons\n` +
      `• Gold safely in ship hold: ${bankedGold} Doubloons\n` +
      `• Golden relics in hold: ${this.expedition.shipStores.relics}\n` +
      `• Ship reserve food: ${this.expedition.shipStores.rations} rations`,
      [
        {
          label: `Secure Gold in Ship Hold (${goldInPack} G)`,
          color: 0x8b5a2b,
          action: () => {
            const deposited = this.expedition.depositAllGoldToShip();
            this.log(`⚓ Secured ${deposited} Gold and ${relicsInPack} Relics safely in the caravel hold!`);
            this.closeModal();
            this.updateHUD();
          },
        },
        {
          label: 'Embark Onboard Ship (End Day & Rest)',
          color: 0x2b472b,
          action: () => {
            this.expedition.campRest();
            this.log(`⚓ The crew rested comfortably aboard ship. Health and morale restored!`);
            this.closeModal();
            this.updateHUD();
          },
        },
        {
          label: 'Continue Exploration',
          color: 0x4a443d,
          action: () => this.closeModal(),
        },
      ]
    );
  }

  private showNativeVillageModal(village: LandmarkEntity): void {
    const beads = this.expedition.inventory.tradeGoods;
    const foodAvailable = village.villageTradeInventory?.foodAvailable || 30;

    let narrative =
      `You enter the thatched village of the welcoming local tribe.\n` +
      `The Chieftain greets your party with woven garlands and fresh water.\n\n` +
      `The villagers are eager to trade for European glass beads and cloth.`;

    if (!village.isVisited) {
      village.isVisited = true;
      const xpRes = this.expedition.addXp(50);
      narrative += `\n\n★ First Contact XP: +50 XP!`;
      if (xpRes.leveledUp) narrative += ` Leader Leveled Up!`;
    }

    this.createModal(
      village.customName || 'NATIVE VILLAGE',
      narrative,
      [
        {
          label: `Trade 5 Beads for 25 Food (Have ${beads} Beads)`,
          color: 0x1f5922,
          action: () => {
            if (this.expedition.inventory.tradeGoods >= 5) {
              this.expedition.inventory.tradeGoods -= 5;
              this.expedition.inventory.rations += 25;
              this.log(`🤝 Traded 5 bundles of beads with the village for 25 food rations!`);
              this.closeModal();
              this.updateHUD();
            } else {
              this.log(`❌ Not enough trade goods to barter!`);
            }
          },
        },
        {
          label: 'Ask Chieftain for Rumors of the City of Gold',
          color: 0x8b5a2b,
          action: () => {
            const goldX = this.map.cityOfGoldCoord.x;
            const goldY = this.map.cityOfGoldCoord.y;
            const dirX = goldX > this.playerCoord.x ? 'East' : 'West';
            const dirY = goldY > this.playerCoord.y ? 'South' : 'North';

            this.log(
              `🗣️ The Chieftain points far to the ${dirY}-${dirX}: "The Great Golden City of Manoa lies deep beyond the mountain cordillera!"`
            );
            this.expedition.addXp(25);
            this.closeModal();
            this.updateHUD();
          },
        },
        {
          label: 'Depart in Peace',
          color: 0x4a443d,
          action: () => this.closeModal(),
        },
      ]
    );
  }

  private showAncientRuinsModal(ruins: LandmarkEntity): void {
    if (ruins.isLooted) {
      this.createModal(
        ruins.customName || 'ANCIENT RUINS',
        'These ancient mossy stone stelae have already been examined and cataloged.',
        [{ label: 'Depart', color: 0x4a443d, action: () => this.closeModal() }]
      );
      return;
    }

    this.createModal(
      ruins.customName || 'OVERGROWN ANCIENT RUINS',
      `Before you stand megalithic carved stone pillars shrouded in jungle vines.\n` +
      `Intricate Mayan-like sun glyphs and snake reliefs cover the granite lintels.\n\n` +
      `Your scouts detect carved hollows beneath the central altar.`,
      [
        {
          label: 'Excavate the Ruins with Tools',
          color: 0x8b5a2b,
          action: () => {
            ruins.isLooted = true;
            const goldFound = Math.floor(Math.random() * 80 + 70);
            this.expedition.inventory.gold += goldFound;
            this.expedition.inventory.goldRelics += 1;
            const xpRes = this.expedition.addXp(120);

            this.log(`🏛️ Excavated ancient ruins! Discovered ${goldFound} Gold and a priceless Golden Relic! (+120 XP)`);
            if (xpRes.leveledUp) this.log(`🎉 Leader attained Level ${this.expedition.leader.level}!`);

            this.closeModal();
            this.updateHUD();
          },
        },
        {
          label: 'Leave Sacred Ground Undisturbed',
          color: 0x4a443d,
          action: () => this.closeModal(),
        },
      ]
    );
  }

  private showGoldenTempleModal(temple: LandmarkEntity): void {
    this.createModal(
      temple.customName || 'SACRED SUN TEMPLE',
      `A magnificent stepped pyramid rises toward the sun, crowned with pure gold plate.\n` +
      `Priests once worshipped the Golden Falcon here.\n\n` +
      `Tremendous sacred treasures lie within the pyramid sanctum!`,
      [
        {
          label: 'Enter Sanctum and Recover Sun Idols',
          color: 0xc49a45,
          action: () => {
            temple.isLooted = true;
            temple.isActive = false;
            this.expedition.inventory.gold += 250;
            this.expedition.inventory.goldRelics += 2;
            const xpRes = this.expedition.addXp(250);

            this.log(`☀️ Recovered sacred Sun Idols! Gained 250 Gold and 2 Golden Relics! (+250 XP)`);
            if (xpRes.leveledUp) this.log(`🎉 Leader attained Level ${this.expedition.leader.level}!`);

            this.closeModal();
            this.updateHUD();
          },
        },
        {
          label: 'Pay Homage & Depart',
          color: 0x4a443d,
          action: () => this.closeModal(),
        },
      ]
    );
  }

  private showFreshSpringModal(spring: LandmarkEntity): void {
    this.expedition.health = Math.min(100, this.expedition.health + 20);
    this.expedition.morale = Math.min(100, this.expedition.morale + 15);
    this.expedition.inventory.rations += 10;

    this.createModal(
      spring.customName || 'CRYSTAL OASIS SPRING',
      `The party drinks deeply from the revitalizing crystal mineral pool.\n\n` +
      `• Health Restored (+20 HP)\n` +
      `• Morale Uplifted (+15 Morale)\n` +
      `• Fresh Water collected (+10 Rations)`,
      [{ label: 'Refreshed & Ready', color: 0x1f5922, action: () => this.closeModal() }]
    );
  }

  private showCityOfGoldTriumphModal(city: LandmarkEntity): void {
    // VICTORY!
    const totalGold = this.expedition.inventory.gold + this.expedition.shipStores.gold + 1000;
    const totalRelics = this.expedition.inventory.goldRelics + this.expedition.shipStores.relics + 5;
    const score = totalGold * 2 + totalRelics * 200 + this.expedition.leader.level * 300 - this.turnManager.turn * 10;

    this.cameras.main.flash(600, 255, 215, 0);

    this.createModal(
      '👑 EL DORADO — THE CITY OF GOLD DISCOVERED! 👑',
      `BEHOLD THE LEGENDARY FULFILLMENT OF YOUR ROYAL CHARTER!\n\n` +
      `You have breached the mountain ring and gaze upon the Golden City of Manoa!\n` +
      `Towers of pure gold, emerald mosaics, and golden aqueducts glitter before your eyes.\n` +
      `Your expedition has carved its name into eternal history!\n\n` +
      `🏆 EXPEDITION FINAL METRICS:\n` +
      `• Turns Taken: ${this.turnManager.turn} Days\n` +
      `• Total Crew Survived: ${this.expedition.totalCrewCount} Men\n` +
      `• Leader Level: ${this.expedition.leader.name} (Level ${this.expedition.leader.level})\n` +
      `• Total Gold Discovered: ${totalGold} Doubloons\n` +
      `• Golden Artifacts Found: ${totalRelics} Relics\n` +
      `• Overall Score: ${Math.max(500, score)} Points`,
      [
        {
          label: '★ Start Another New World Voyage ★',
          color: 0x8b5a2b,
          action: () => {
            this.closeModal();
            this.scene.start('TitleScene');
          },
        },
      ]
    );
  }

  // ==========================================
  // COMBAT SYSTEM
  // ==========================================

  private engageCombatWith(enemy: EnemyEntity): void {
    const partyPower = this.expedition.combatStrength;
    const enemyPower = enemy.attackPower;
    const muskets = this.expedition.inventory.muskets;

    this.createModal(
      `HOSTILE ENCOUNTER: ${enemy.name.toUpperCase()}`,
      `A fierce ${enemy.name} has confronted your expedition!\n\n` +
      `• Enemy Threat: ${enemy.attackPower} Attack Power | ${enemy.hp} HP\n` +
      `• Party Combat Strength: ${partyPower} Power\n` +
      `• Matchlock Muskets: ${muskets} ready to fire`,
      [
        {
          label: '⚔️ Order Line Volley & Engage!',
          color: 0x8b2500,
          action: () => {
            this.resolveCombat(enemy, true);
          },
        },
        {
          label: '🏃 Tactical Retreat (Consume 15 Morale)',
          color: 0x4a443d,
          action: () => {
            this.expedition.morale = Math.max(10, this.expedition.morale - 15);
            this.log(`🏃 The expedition performed a tactical retreat from ${enemy.name}.`);
            this.closeModal();
            this.updateHUD();
          },
        },
      ]
    );
  }

  private resolveCombat(enemy: EnemyEntity, hasMuskets: boolean): void {
    const partyPower = this.expedition.combatStrength + (hasMuskets ? 20 : 0);
    const winChance = partyPower / (partyPower + enemy.attackPower);

    if (Math.random() < winChance) {
      // Victory!
      enemy.isDefeated = true;
      enemy.isActive = false;
      const sprite = this.enemySprites.get(enemy.id);
      if (sprite) sprite.setVisible(false);

      const goldLoot = enemy.def.goldLoot;
      this.expedition.inventory.gold += goldLoot;
      const xpRes = this.expedition.addXp(enemy.def.xpReward);

      this.log(`⚔️ Victory! Defeated ${enemy.name}! (+${goldLoot} Gold, +${enemy.def.xpReward} XP)`);
      if (xpRes.leveledUp) this.log(`🎉 Leader reached Level ${this.expedition.leader.level}!`);
    } else {
      // Wounded / Casualty
      this.expedition.health = Math.max(15, this.expedition.health - 25);
      const casualty = this.expedition.loseRandomCrewMember('battle injuries');
      this.log(`🩸 Defeated in combat! Party wounded. ${casualty}`);
    }

    this.closeModal();
    this.updateHUD();
  }

  // ==========================================
  // CAMP & RESOURCE ACTIONS
  // ==========================================

  private makeCamp(): void {
    if (this.activeModal !== null) return;

    this.createModal(
      'EXPEDITION CAMPGROUND',
      `Pitch tents and organize the expedition camp.\n` +
      `Resting allows your doctor to treat wounds and the friar to boost morale.\n\n` +
      `• Current Health: ${this.expedition.health}%\n` +
      `• Current Morale: ${this.expedition.morale}%\n` +
      `• Provisions: ${this.expedition.inventory.rations} rations`,
      [
        {
          label: 'Rest & Recover (Consumes Food)',
          color: 0x1f5922,
          action: () => {
            const res = this.expedition.campRest();
            if (res.rationsUsed > 0) {
              this.log(`🏕️ Made camp for the night. Restored ${res.healedHp} HP & ${res.moraleGain} Morale (-${res.rationsUsed} food).`);
            } else {
              this.log(`⚠️ Not enough food to rest properly!`);
            }
            this.closeModal();
            this.updateHUD();
          },
        },
        {
          label: 'Treat Sick with Medicine (Use 1 Dose)',
          color: 0x2774a3,
          action: () => {
            if (this.expedition.inventory.medicine > 0) {
              this.expedition.inventory.medicine--;
              this.expedition.health = Math.min(100, this.expedition.health + 30);
              this.log(`🧪 Administered medicine. Restored 30 Health!`);
            } else {
              this.log(`❌ No medicine remaining in inventory!`);
            }
            this.closeModal();
            this.updateHUD();
          },
        },
        {
          label: 'Break Camp & March',
          color: 0x4a443d,
          action: () => this.closeModal(),
        },
      ]
    );
  }

  // ==========================================
  // HUD & UI OVERLAY
  // ==========================================

  private setupHUD(): void {
    const { width, height } = this.scale;
    this.hudContainer = this.add.container(0, 0).setDepth(50);
    this.hudContainer.setScrollFactor(0); // Fix HUD to screen

    // Top Header Banner
    const topBg = this.add.graphics();
    topBg.fillStyle(0x1a1208, 0.95);
    topBg.fillRect(0, 0, width, 48);
    topBg.lineStyle(2, 0xa17838, 1);
    topBg.strokeRect(0, 0, width, 48);
    this.hudContainer.add(topBg);

    // Top HUD Stats
    const textStyle = { fontFamily: 'Georgia, serif', fontSize: '13px', color: '#f5ecd7' };

    this.turnText = this.add.text(16, 16, '📅 Day 1', { ...textStyle, fontStyle: 'bold', color: '#ffd700' });
    this.crewText = this.add.text(100, 16, '👥 Men: 16', textStyle);
    this.rationsText = this.add.text(205, 16, '🥖 Food: 80', textStyle);
    this.moraleText = this.add.text(310, 16, '❤️ Morale: 95%', textStyle);
    this.goldText = this.add.text(435, 16, '💰 Gold: 150', { ...textStyle, color: '#ffd700', fontStyle: 'bold' });
    this.leaderText = this.add.text(width - 200, 16, '🎖️ Lvl 1 Captain', { ...textStyle, color: '#80ed99' });

    this.hudContainer.add([
      this.turnText,
      this.crewText,
      this.rationsText,
      this.moraleText,
      this.goldText,
      this.leaderText,
    ]);

    // Bottom Action & Activity Log Bar
    const bottomBarY = height - 90;
    const bottomBg = this.add.graphics();
    bottomBg.fillStyle(0x161008, 0.95);
    bottomBg.fillRect(0, bottomBarY, width, 90);
    bottomBg.lineStyle(2, 0xa17838, 0.9);
    bottomBg.strokeRect(0, bottomBarY, width, 90);
    this.hudContainer.add(bottomBg);

    // Activity Log Text area
    this.logText = this.add.text(16, bottomBarY + 12, '', {
      fontFamily: 'Palatino, Georgia, serif',
      fontSize: '12px',
      color: '#e2d3b5',
      lineSpacing: 4,
    });
    this.hudContainer.add(this.logText);

    // Action buttons on bottom right
    const btnStartX = width - 360;
    this.createHudButton(btnStartX, bottomBarY + 25, 80, 40, '⛺ Camp', () => this.makeCamp());
    this.createHudButton(btnStartX + 90, bottomBarY + 25, 80, 40, '⌛ Wait', () => this.waitTurn());
    this.createHudButton(btnStartX + 180, bottomBarY + 25, 80, 40, '🗺️ Map', () => this.toggleMinimap());
    this.createHudButton(btnStartX + 270, bottomBarY + 25, 80, 40, '⚓ Ship', () => {
      // Center camera to ship
      this.cameras.main.pan(
        this.map.shipPosition.x * this.tileSize,
        this.map.shipPosition.y * this.tileSize,
        400
      );
    });
  }

  private createHudButton(x: number, y: number, w: number, h: number, text: string, onClick: () => void): void {
    const btnContainer = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(0x3d2b17, 1);
    bg.fillRoundedRect(0, 0, w, h, 4);
    bg.lineStyle(1, 0xc49a45, 1);
    bg.strokeRoundedRect(0, 0, w, h, 4);

    const txt = this.add.text(w / 2, h / 2, text, {
      fontFamily: 'Georgia, serif',
      fontSize: '13px',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    btnContainer.add([bg, txt]);
    btnContainer.setSize(w, h);
    btnContainer.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains);

    btnContainer.on('pointerdown', onClick);
    btnContainer.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0xc49a45, 1);
      bg.fillRoundedRect(0, 0, w, h, 4);
      txt.setColor('#12100e');
    });
    btnContainer.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x3d2b17, 1);
      bg.fillRoundedRect(0, 0, w, h, 4);
      bg.lineStyle(1, 0xc49a45, 1);
      bg.strokeRoundedRect(0, 0, w, h, 4);
      txt.setColor('#ffd700');
    });

    this.hudContainer.add(btnContainer);
  }

  private updateHUD(): void {
    this.turnText.setText(`📅 Day ${this.turnManager.turn}`);
    this.crewText.setText(`👥 Men: ${this.expedition.totalCrewCount}`);
    this.rationsText.setText(`🥖 Food: ${this.expedition.inventory.rations}`);
    this.moraleText.setText(`❤️ Morale: ${this.expedition.morale}%`);
    this.goldText.setText(`💰 Gold: ${this.expedition.inventory.gold} (+${this.expedition.shipStores.gold})`);
    this.leaderText.setText(`🎖️ Lvl ${this.expedition.leader.level} ${this.expedition.leader.name.split(' ')[1]}`);

    // Update log box with last 3 messages
    const recent = this.activityLogs.slice(-3);
    this.logText.setText(recent.join('\n'));

    // Update minimap if open
    if (this.isMinimapOpen) {
      this.drawMinimap();
    }
  }

  private log(message: string): void {
    this.activityLogs.push(message);
    if (this.activityLogs.length > 30) this.activityLogs.shift();
    this.updateHUD();
  }

  // ==========================================
  // MINIMAP OVERVIEW
  // ==========================================

  private setupMinimap(): void {
    const { width, height } = this.scale;
    this.minimapContainer = this.add.container(width - 240, 56).setDepth(60);
    this.minimapContainer.setScrollFactor(0);
    this.minimapContainer.setVisible(false);

    const bg = this.add.graphics();
    bg.fillStyle(0x161008, 0.95);
    bg.fillRoundedRect(0, 0, 220, 160, 6);
    bg.lineStyle(2, 0xc49a45, 1);
    bg.strokeRoundedRect(0, 0, 220, 160, 6);

    const title = this.add.text(110, 14, 'WORLD OVERVIEW RADAR', {
      fontFamily: 'Georgia, serif',
      fontSize: '11px',
      color: '#ffd700',
      fontStyle: 'bold',
      letterSpacing: 1,
    }).setOrigin(0.5);

    this.minimapGraphics = this.add.graphics();
    this.minimapGraphics.setPosition(14, 28);

    this.minimapContainer.add([bg, title, this.minimapGraphics]);
  }

  private toggleMinimap(): void {
    this.isMinimapOpen = !this.isMinimapOpen;
    this.minimapContainer.setVisible(this.isMinimapOpen);
    if (this.isMinimapOpen) {
      this.drawMinimap();
    }
  }

  private drawMinimap(): void {
    this.minimapGraphics.clear();
    const cellW = 192 / this.map.width;
    const cellH = 120 / this.map.height;

    for (let y = 0; y < this.map.height; y++) {
      for (let x = 0; x < this.map.width; x++) {
        const fog = this.map.fogGrid.get(x, y);
        if (fog === FogState.HIDDEN) {
          this.minimapGraphics.fillStyle(0x0a0908, 1);
        } else {
          const t = this.map.terrainGrid.get(x, y)!;
          const def = TERRAIN_DEFINITIONS[t];
          this.minimapGraphics.fillStyle(def.color, fog === FogState.VISIBLE ? 1.0 : 0.6);
        }
        this.minimapGraphics.fillRect(x * cellW, y * cellH, cellW, cellH);
      }
    }

    // Ship marker (white anchor dot)
    const sx = this.map.shipPosition.x * cellW;
    const sy = this.map.shipPosition.y * cellH;
    this.minimapGraphics.fillStyle(0xffffff, 1);
    this.minimapGraphics.fillCircle(sx + cellW / 2, sy + cellH / 2, 2.5);

    // Player marker (blinking bright gold dot)
    const px = this.playerCoord.x * cellW;
    const py = this.playerCoord.y * cellH;
    this.minimapGraphics.fillStyle(0xffd700, 1);
    this.minimapGraphics.fillCircle(px + cellW / 2, py + cellH / 2, 3);
  }

  // ==========================================
  // MODAL DIALOG ENGINE
  // ==========================================

  private createModal(
    title: string,
    message: string,
    buttons: { label: string; color: number; action: () => void }[]
  ): void {
    this.closeModal();

    const { width, height } = this.scale;
    const modal = this.add.container(0, 0).setDepth(100);
    modal.setScrollFactor(0);

    // Scrim
    const scrim = this.add.graphics();
    scrim.fillStyle(0x000000, 0.7);
    scrim.fillRect(0, 0, width, height);
    scrim.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);

    // Box dimensions
    const boxW = Math.min(540, width - 40);
    const boxH = Math.min(380, height - 60);
    const bx = (width - boxW) / 2;
    const by = (height - boxH) / 2;

    const boxBg = this.add.graphics();
    boxBg.fillStyle(0x20170d, 1);
    boxBg.fillRoundedRect(bx, by, boxW, boxH, 8);
    boxBg.lineStyle(3, 0xc49a45, 1);
    boxBg.strokeRoundedRect(bx, by, boxW, boxH, 8);

    const titleTxt = this.add.text(width / 2, by + 30, title, {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const msgTxt = this.add.text(bx + 24, by + 65, message, {
      fontFamily: 'Palatino, Georgia, serif',
      fontSize: '13px',
      color: '#f0dfbe',
      wordWrap: { width: boxW - 48 },
      lineSpacing: 5,
    });

    modal.add([scrim, boxBg, titleTxt, msgTxt]);

    // Buttons
    let btnY = by + boxH - 45 * buttons.length - 15;
    for (const b of buttons) {
      const btn = this.createModalButton(width / 2, btnY + 20, boxW - 60, 36, b.label, b.color, b.action);
      modal.add(btn);
      btnY += 44;
    }

    this.activeModal = modal;
  }

  private createModalButton(
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    color: number,
    action: () => void
  ): Phaser.GameObjects.Container {
    const btn = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 6);
    bg.lineStyle(1, 0xffffff, 0.4);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 6);

    const txt = this.add.text(0, 0, label, {
      fontFamily: 'Georgia, serif',
      fontSize: '13px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    btn.add([bg, txt]);
    btn.setSize(w, h);
    btn.setInteractive({ useHandCursor: true });

    btn.on('pointerdown', action);
    btn.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0xc49a45, 1);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 6);
      txt.setColor('#12100e');
    });
    btn.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(color, 1);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 6);
      bg.lineStyle(1, 0xffffff, 0.4);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 6);
      txt.setColor('#ffffff');
    });

    return btn;
  }

  private closeModal(): void {
    if (this.activeModal) {
      this.activeModal.destroy();
      this.activeModal = null;
    }
  }

  private showGameOverModal(reason: string): void {
    this.createModal(
      '☠️ EXPEDITION FAILED ☠️',
      `The wilderness has claimed your party.\n\n${reason}\n\nNo word of your expedition ever reached the Crown in Seville.`,
      [
        {
          label: 'Return to Title & Try Again',
          color: 0x8b2500,
          action: () => {
            this.closeModal();
            this.scene.start('TitleScene');
          },
        },
      ]
    );
  }
}
