export type ItemId = 'crew' | 'food' | 'weapons' | 'goods';

export interface ItemDef {
  id: ItemId;
  name: string;
  cost: number;
  /** Cargo slots used per unit. */
  slots: number;
  description: string;
}

export const ITEMS: readonly ItemDef[] = [
  { id: 'crew', name: 'Crew', cost: 10, slots: 1, description: 'Explorers. Lose them all and the expedition ends.' },
  { id: 'food', name: 'Food', cost: 2, slots: 1, description: 'Eaten by the expedition as turns pass.' },
  { id: 'weapons', name: 'Weapons', cost: 6, slots: 1, description: 'Greatly improve your odds in a fight.' },
  { id: 'goods', name: 'Trade goods', cost: 4, slots: 1, description: 'Trade with natives for food and gold.' }
];
