import { Entity } from '../../game/entities/Entity';
import { EnemyType, EnemyDef, ENEMY_DEFINITIONS } from '../data/EnemyData';

export class EnemyEntity extends Entity {
  public readonly def: EnemyDef;
  public enemyType: EnemyType;
  public hp: number;
  public maxHp: number;
  public attackPower: number;
  public detectionRange: number;
  public moveDelay: number;
  public moveCooldown: number = 0;
  public isDefeated: boolean = false;

  constructor(id: string, enemyType: EnemyType, x: number, y: number) {
    const def = ENEMY_DEFINITIONS[enemyType];
    super(id, def.name, x, y, false); // impassable by default
    this.def = def;
    this.enemyType = enemyType;
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.attackPower = def.attackPower;
    this.detectionRange = def.detectionRange;
    this.moveDelay = def.speed;
    this.addTag('ENEMY');
    this.addTag(enemyType);
  }

  public canMoveThisTurn(): boolean {
    this.moveCooldown++;
    if (this.moveCooldown >= this.moveDelay) {
      this.moveCooldown = 0;
      return true;
    }
    return false;
  }

  public takeDamage(amount: number): boolean {
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) {
      this.isDefeated = true;
      this.isActive = false;
      return true;
    }
    return false;
  }
}
