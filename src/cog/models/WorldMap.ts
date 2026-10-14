import { Grid2D } from '../../game/grid/Grid2D';
import { GridCoord, euclideanDistance } from '../../game/grid/GridCoord';
import { TerrainType, TerrainDef, TERRAIN_DEFINITIONS } from '../data/TerrainData';
import { LandmarkType } from '../data/LandmarkData';
import { LandmarkEntity } from './LandmarkEntity';
import { EnemyType } from '../data/EnemyData';
import { EnemyEntity } from './EnemyEntity';

export enum FogState {
  HIDDEN = 0,
  EXPLORED = 1,
  VISIBLE = 2,
}

export class WorldMap {
  public readonly width: number;
  public readonly height: number;
  public readonly terrainGrid: Grid2D<TerrainType>;
  public readonly fogGrid: Grid2D<FogState>;
  public readonly landmarks: LandmarkEntity[] = [];
  public readonly enemies: EnemyEntity[] = [];

  public shipPosition: GridCoord = { x: 8, y: 17 };
  public cityOfGoldCoord: GridCoord = { x: 42, y: 18 };

  constructor(width: number = 48, height: number = 32) {
    this.width = width;
    this.height = height;

    this.terrainGrid = new Grid2D<TerrainType>(width, height, TerrainType.DEEP_OCEAN);
    this.fogGrid = new Grid2D<FogState>(width, height, FogState.HIDDEN);

    this.generateContinent();
  }

  private generateContinent(): void {
    const w = this.width;
    const h = this.height;

    // Coastline X boundary with natural sinusoidal noise
    const coastLine: number[] = [];
    for (let y = 0; y < h; y++) {
      const baseCoast = 8;
      const variation = Math.sin(y * 0.4) * 2 + Math.cos(y * 0.2) * 1.5;
      coastLine[y] = Math.max(6, Math.min(11, Math.round(baseCoast + variation)));
    }

    // River paths
    const riverY1 = Math.floor(h * 0.35);
    const riverY2 = Math.floor(h * 0.7);

    // City of gold location deep inland
    const goldX = w - 6;
    const goldY = Math.floor(h * 0.5);
    this.cityOfGoldCoord = { x: goldX, y: goldY };

    // Fill terrain
    for (let y = 0; y < h; y++) {
      const coastX = coastLine[y];
      for (let x = 0; x < w; x++) {
        if (x < coastX - 2) {
          this.terrainGrid.set(x, y, TerrainType.DEEP_OCEAN);
        } else if (x < coastX) {
          this.terrainGrid.set(x, y, TerrainType.SHALLOW_OCEAN);
        } else if (x === coastX || x === coastX + 1) {
          this.terrainGrid.set(x, y, TerrainType.COAST);
        } else {
          // Continental landmass
          // Distance inland (0.0 to 1.0)
          const inlandNorm = (x - coastX) / (w - coastX);

          // River crossing
          const isRiver1 = Math.abs(y - (riverY1 + Math.sin(x * 0.3) * 2)) < 0.8 && x < w - 8;
          const isRiver2 = Math.abs(y - (riverY2 + Math.cos(x * 0.25) * 2)) < 0.8 && x < w - 10;

          if (isRiver1 || isRiver2) {
            this.terrainGrid.set(x, y, TerrainType.RIVER);
            continue;
          }

          // Mountains guarding the far interior
          const distToGold = Math.hypot(x - goldX, y - goldY);
          if (distToGold < 5 && distToGold > 1.8 && (x !== goldX - 3 || y !== goldY)) {
            // Mountain ring with an entrance path
            this.terrainGrid.set(x, y, TerrainType.MOUNTAINS);
            continue;
          }

          // Deep interior mountains
          const isMountainRidge = (x > w - 12 && (y < 8 || y > h - 8)) || (x === w - 14 && y > 10 && y < 22 && Math.random() < 0.6);
          if (isMountainRidge) {
            this.terrainGrid.set(x, y, TerrainType.MOUNTAINS);
            continue;
          }

          // Swamps near lower coast/river deltas
          if (x > coastX + 1 && x < coastX + 6 && y > riverY2 - 3 && y < riverY2 + 3) {
            this.terrainGrid.set(x, y, TerrainType.SWAMP);
            continue;
          }

          // Hills
          if (Math.sin(x * 0.5) * Math.cos(y * 0.5) > 0.45) {
            this.terrainGrid.set(x, y, TerrainType.HILLS);
            continue;
          }

          // Jungles in warmer central latitudes
          const jungleScore = Math.sin(x * 0.3) + Math.cos(y * 0.4) + inlandNorm * 0.8;
          if (jungleScore > 0.6) {
            this.terrainGrid.set(x, y, TerrainType.JUNGLE);
            continue;
          }

          // Forests vs Plains
          if ((x + y * 2) % 5 === 0) {
            this.terrainGrid.set(x, y, TerrainType.FOREST);
          } else {
            this.terrainGrid.set(x, y, TerrainType.PLAINS);
          }
        }
      }
    }

    // Ship anchor point on the coast
    const midY = Math.floor(h / 2);
    const shipX = coastLine[midY];
    this.shipPosition = { x: shipX, y: midY };
    this.terrainGrid.set(shipX, midY, TerrainType.COAST);

    // Add Ship Anchor landmark
    const shipLandmark = new LandmarkEntity(
      'landmark_ship',
      LandmarkType.SHIP_ANCHOR,
      shipX,
      midY,
      'Caravel Flagship "La Niña"'
    );
    this.landmarks.push(shipLandmark);

    // Place City of Gold in the inner sanctuary
    this.terrainGrid.set(goldX, goldY, TerrainType.PLAINS);
    const cityOfGold = new LandmarkEntity(
      'landmark_city_of_gold',
      LandmarkType.CITY_OF_GOLD,
      goldX,
      goldY,
      'The Legendary City of Gold: Manoa'
    );
    this.landmarks.push(cityOfGold);

    // Place other landmarks
    this.placeLandmark(LandmarkType.NATIVE_VILLAGE, 'Village of the Tupi', 15, 12);
    this.placeLandmark(LandmarkType.NATIVE_VILLAGE, 'Village of the Arawak', 25, 24);
    this.placeLandmark(LandmarkType.NATIVE_VILLAGE, 'Highland Chibcha Town', 34, 9);

    this.placeLandmark(LandmarkType.ANCIENT_RUINS, 'Overgrown Jade Stele', 18, 20);
    this.placeLandmark(LandmarkType.ANCIENT_RUINS, 'Sunken Temple of Quetzal', 29, 15);
    this.placeLandmark(LandmarkType.ANCIENT_RUINS, 'Crypt of the Serpent Lord', 38, 26);

    this.placeLandmark(LandmarkType.GOLDEN_TEMPLE, 'Pyramid of the Sun King', 32, 21);
    this.placeLandmark(LandmarkType.FRESH_SPRING, 'Hidden Oasis Spring', 20, 7);
    this.placeLandmark(LandmarkType.FRESH_SPRING, 'Cenote of Eternal Youth', 36, 17);

    // Spawn initial enemies
    this.spawnEnemy(EnemyType.JAGUAR, 16, 18);
    this.spawnEnemy(EnemyType.JAGUAR, 28, 12);
    this.spawnEnemy(EnemyType.JAGUAR, 35, 22);
    this.spawnEnemy(EnemyType.ALLIGATOR, 12, riverY2);
    this.spawnEnemy(EnemyType.ALLIGATOR, 22, riverY1);
    this.spawnEnemy(EnemyType.HOSTILE_PATROL, 24, 8);
    this.spawnEnemy(EnemyType.HOSTILE_PATROL, 33, 27);
    this.spawnEnemy(EnemyType.RIVAL_CONQUISTADOR, 27, 19);
  }

  private placeLandmark(type: LandmarkType, name: string, preferredX: number, preferredY: number): void {
    // Find closest land cell that is passable
    const coord = this.findPassableCellNear(preferredX, preferredY);
    if (coord) {
      const entity = new LandmarkEntity(`landmark_${type}_${coord.x}_${coord.y}`, type, coord.x, coord.y, name);
      this.landmarks.push(entity);
    }
  }

  private spawnEnemy(type: EnemyType, preferredX: number, preferredY: number): void {
    const coord = this.findPassableCellNear(preferredX, preferredY);
    if (coord) {
      const enemy = new EnemyEntity(`enemy_${type}_${coord.x}_${coord.y}`, type, coord.x, coord.y);
      this.enemies.push(enemy);
    }
  }

  public findPassableCellNear(startX: number, startY: number): GridCoord | null {
    for (let r = 0; r < 8; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const x = startX + dx;
          const y = startY + dy;
          if (this.terrainGrid.isInBounds(x, y)) {
            const t = this.terrainGrid.get(x, y)!;
            const def = TERRAIN_DEFINITIONS[t];
            if (def.passableOnFoot && !this.getLandmarkAt(x, y)) {
              return { x, y };
            }
          }
        }
      }
    }
    return null;
  }

  public getLandmarkAt(x: number, y: number): LandmarkEntity | undefined {
    return this.landmarks.find(l => l.x === x && l.y === y && l.isActive);
  }

  public getEnemyAt(x: number, y: number): EnemyEntity | undefined {
    return this.enemies.find(e => e.x === x && e.y === y && e.isActive && !e.isDefeated);
  }

  public getTerrain(x: number, y: number): TerrainDef {
    const t = this.terrainGrid.get(x, y) || TerrainType.DEEP_OCEAN;
    return TERRAIN_DEFINITIONS[t];
  }

  public isPassable(x: number, y: number): boolean {
    if (!this.terrainGrid.isInBounds(x, y)) return false;
    const t = this.getTerrain(x, y);
    return t.passableOnFoot;
  }

  /**
   * Updates fog of war:
   * Cells currently visible become VISIBLE.
   * Previously visible cells become EXPLORED (dimmed memory).
   */
  public updateFog(viewerX: number, viewerY: number, radius: number): void {
    // Demote current VISIBLE to EXPLORED
    this.fogGrid.forEach((state, x, y) => {
      if (state === FogState.VISIBLE) {
        this.fogGrid.set(x, y, FogState.EXPLORED);
      }
    });

    // Reveal new sight circle
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = viewerX + dx;
        const y = viewerY + dy;
        if (this.fogGrid.isInBounds(x, y)) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= radius + 0.3) {
            this.fogGrid.set(x, y, FogState.VISIBLE);
          }
        }
      }
    }
  }

  public isVisible(x: number, y: number): boolean {
    return this.fogGrid.get(x, y) === FogState.VISIBLE;
  }

  public isExplored(x: number, y: number): boolean {
    const s = this.fogGrid.get(x, y);
    return s === FogState.VISIBLE || s === FogState.EXPLORED;
  }
}
