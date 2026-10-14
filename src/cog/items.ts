export type ItemId = 'crew' | 'food' | 'weapons' | 'goods';

export interface ItemDef {
  id: ItemId;
  name: string;
  cost: number;
  /** Cargo slots used per unit. */
  slots: number;
  /** Units you cannot go below in the loadout. */
  min: number;
  description: string;
}

export const ITEMS: readonly ItemDef[] = [
  { id: 'crew', name: 'Crew', cost: 10, slots: 1, min: 1, description: 'Fight and explore. Lose them all and the expedition ends.' },
  { id: 'food', name: 'Food', cost: 2, slots: 1, min: 0, description: 'Eaten every few turns. Without it, crew starve.' },
  { id: 'weapons', name: 'Weapons', cost: 6, slots: 1, min: 0, description: 'Each one adds +2 to your strength in a fight.' },
  { id: 'goods', name: 'Trade goods', cost: 4, slots: 1, min: 0, description: 'Native villages trade food and gold for them.' }
];
