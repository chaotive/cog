export enum EnemyType {
  JAGUAR = 'JAGUAR',
  ALLIGATOR = 'ALLIGATOR',
  HOSTILE_PATROL = 'HOSTILE_PATROL',
  RIVAL_CONQUISTADOR = 'RIVAL_CONQUISTADOR',
}

export interface EnemyDef {
  type: EnemyType;
  name: string;
  symbol: string;
  color: number;
  hp: number;
  attackPower: number;
  detectionRange: number; // Cells within which AI detects and moves towards player
  speed: number;          // Moves 1 step every N turns
  goldLoot: number;
  xpReward: number;
  preferredTerrain: string[];
  description: string;
}

export const ENEMY_DEFINITIONS: Record<EnemyType, EnemyDef> = {
  [EnemyType.JAGUAR]: {
    type: EnemyType.JAGUAR,
    name: 'Spotted Jungle Jaguar',
    symbol: '🐆',
    color: 0xcc7722,
    hp: 30,
    attackPower: 12,
    detectionRange: 4,
    speed: 1,
    goldLoot: 15,
    xpReward: 40,
    preferredTerrain: ['JUNGLE', 'FOREST', 'HILLS'],
    description: 'A swift, predatory feline stalking silent through the jungle foliage.',
  },
  [EnemyType.ALLIGATOR]: {
    type: EnemyType.ALLIGATOR,
    name: 'Giant Marsh Alligator',
    symbol: '🐊',
    color: 0x2e5618,
    hp: 45,
    attackPower: 16,
    detectionRange: 3,
    speed: 2, // Moves every 2 turns
    goldLoot: 20,
    xpReward: 45,
    preferredTerrain: ['SWAMP', 'RIVER'],
    description: 'An ancient armored beast lying in wait beneath murky swamp waters.',
  },
  [EnemyType.HOSTILE_PATROL]: {
    type: EnemyType.HOSTILE_PATROL,
    name: 'Tribal Warband',
    symbol: '🏹',
    color: 0x9e2a2b,
    hp: 55,
    attackPower: 20,
    detectionRange: 4,
    speed: 1,
    goldLoot: 50,
    xpReward: 60,
    preferredTerrain: ['JUNGLE', 'PLAINS', 'HILLS'],
    description: 'Fierce native warriors defending their sacred territory with poisoned darts and obsidian macuahuitl.',
  },
  [EnemyType.RIVAL_CONQUISTADOR]: {
    type: EnemyType.RIVAL_CONQUISTADOR,
    name: 'Rival Expeditionary Force',
    symbol: '⚔️',
    color: 0x4a154b,
    hp: 70,
    attackPower: 26,
    detectionRange: 5,
    speed: 1,
    goldLoot: 120,
    xpReward: 90,
    preferredTerrain: ['PLAINS', 'FOREST', 'HILLS'],
    description: 'A cutthroat mercenary band also seeking the Cities of Gold, ready to eliminate competitors.',
  },
};
