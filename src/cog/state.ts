import { STARTING_GOLD } from './config';
import { ItemId } from './items';

export type Supplies = Record<ItemId, number>;

/** The expedition leader: the RPG side of the game. */
export interface Leader {
  level: number;
  xp: number;
}

export interface GameState {
  gold: number;
  supplies: Supplies;
  leader: Leader;
  citiesFound: number;
}

export function newGameState(): GameState {
  return {
    gold: STARTING_GOLD,
    supplies: { crew: 3, food: 0, weapons: 0, goods: 0 },
    leader: { level: 1, xp: 0 },
    citiesFound: 0
  };
}

export const xpToNextLevel = (leader: Leader) => leader.level * 15;

/** Adds XP and returns true if the leader levelled up. */
export function grantXp(leader: Leader, amount: number): boolean {
  leader.xp += amount;
  let levelled = false;
  while (leader.xp >= xpToNextLevel(leader)) {
    leader.xp -= xpToNextLevel(leader);
    leader.level++;
    levelled = true;
  }
  return levelled;
}

/** Strength before dice: crew + weapons x2 + leader level. */
export const combatStrength = (s: GameState) => s.supplies.crew + s.supplies.weapons * 2 + s.leader.level;

/** Experienced leaders scout further on land: +1 sight every 2 levels. */
export const sightBonus = (s: GameState) => Math.floor((s.leader.level - 1) / 2);
