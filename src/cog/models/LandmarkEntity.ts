import { Entity } from '../../game/entities/Entity';
import { LandmarkType, LandmarkDef, LANDMARK_DEFINITIONS } from '../data/LandmarkData';

export class LandmarkEntity extends Entity {
  public readonly landmarkType: LandmarkType;
  public readonly def: LandmarkDef;
  public isVisited: boolean = false;
  public isLooted: boolean = false;
  public customName?: string;
  public villageTradeInventory?: {
    foodAvailable: number;
    goldCostPerFood: number;
    beadsDemand: number;
  };

  constructor(id: string, type: LandmarkType, x: number, y: number, name?: string) {
    const def = LANDMARK_DEFINITIONS[type];
    super(id, name || def.name, x, y, true); // Landmarks can be stepped on to interact
    this.landmarkType = type;
    this.def = def;
    this.customName = name;
    this.addTag('LANDMARK');
    this.addTag(type);

    if (type === LandmarkType.NATIVE_VILLAGE) {
      this.villageTradeInventory = {
        foodAvailable: Math.floor(Math.random() * 30 + 30),
        goldCostPerFood: 2,
        beadsDemand: 5,
      };
    }
  }
}
