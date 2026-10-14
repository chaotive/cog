import { ItemId } from './items';
import { STARTING_GOLD } from './config';

export type Supplies = Record<ItemId, number>;

export interface GameState {
  gold: number;
  supplies: Supplies;
  citiesFound: number;
}

export function newGameState(): GameState {
  return {
    gold: STARTING_GOLD,
    supplies: { crew: 3, food: 0, weapons: 0, goods: 0 },
    citiesFound: 0
  };
}
