export enum CrewRole {
  SAILOR = 'SAILOR',
  SOLDIER = 'SOLDIER',
  SCOUT = 'SCOUT',
  DOCTOR = 'DOCTOR',
  PRIEST = 'PRIEST',
}

export interface CrewDef {
  role: CrewRole;
  name: string;
  cost: number;        // Gold cost in Seville outfitting
  weight: number;      // Tonnage cargo space occupied
  icon: string;
  description: string;
  bonusText: string;
}

export const CREW_DEFINITIONS: Record<CrewRole, CrewDef> = {
  [CrewRole.SAILOR]: {
    role: CrewRole.SAILOR,
    name: 'Experienced Sailor',
    cost: 20,
    weight: 1,
    icon: '⚓',
    description: 'Hardy mariner essential for ship navigation and shore foraging.',
    bonusText: '+1 Sea Speed, +10% Coastal Forage',
  },
  [CrewRole.SOLDIER]: {
    role: CrewRole.SOLDIER,
    name: 'Veteran Soldier',
    cost: 35,
    weight: 1,
    icon: '⚔️',
    description: 'Disciplined infantry armed with steel rapiers and shields.',
    bonusText: '+15 Party Combat Strength, Repels Hostiles',
  },
  [CrewRole.SCOUT]: {
    role: CrewRole.SCOUT,
    name: 'Trail Scout',
    cost: 40,
    weight: 1,
    icon: '🧭',
    description: 'Sharp-eyed tracker adept at reading terrain and spotting ruins.',
    bonusText: '+1 Vision Sight Radius, Reveals Hidden Paths',
  },
  [CrewRole.DOCTOR]: {
    role: CrewRole.DOCTOR,
    name: 'Expedition Surgeon',
    cost: 50,
    weight: 1,
    icon: '⚕️',
    description: 'Skilled apothecary who treats marsh fever and battlefield wounds.',
    bonusText: '-50% Disease Hazard, Recovers Wounded',
  },
  [CrewRole.PRIEST]: {
    role: CrewRole.PRIEST,
    name: 'Missionary Friar',
    cost: 30,
    weight: 1,
    icon: '✝️',
    description: 'Spiritual guide who uplifts party spirits and fosters peace.',
    bonusText: '+Morale Preservation, +Diplomacy with Natives',
  },
};

export enum ItemType {
  RATIONS = 'RATIONS',
  TOOLS = 'TOOLS',
  TRADE_GOODS = 'TRADE_GOODS',
  MUSKETS = 'MUSKETS',
  MEDICINE = 'MEDICINE',
}

export interface ItemDef {
  type: ItemType;
  name: string;
  unitName: string;
  cost: number;       // Gold cost per unit
  quantityPerUnit: number; // e.g. 1 crate of rations = 10 food rations
  weight: number;     // Tonnage
  icon: string;
  description: string;
}

export const ITEM_DEFINITIONS: Record<ItemType, ItemDef> = {
  [ItemType.RATIONS]: {
    type: ItemType.RATIONS,
    name: 'Hardtack & Salt Pork',
    unitName: 'Crate (10 Meals)',
    cost: 10,
    quantityPerUnit: 10,
    weight: 1,
    icon: '🍞',
    description: 'Long-lasting preserved rations necessary to keep the crew fed.',
  },
  [ItemType.TOOLS]: {
    type: ItemType.TOOLS,
    name: 'Machetes & Shovels',
    unitName: 'Crate (5 Sets)',
    cost: 25,
    quantityPerUnit: 5,
    weight: 2,
    icon: '🪓',
    description: 'Sharp steel blades to hack through thick jungle vines and excavate ruins.',
  },
  [ItemType.TRADE_GOODS]: {
    type: ItemType.TRADE_GOODS,
    name: 'Glass Beads & Cloth',
    unitName: 'Trunk (10 Bundles)',
    cost: 20,
    quantityPerUnit: 10,
    weight: 2,
    icon: '📿',
    description: 'Lustrous European trinkets and dyed linen prized by native chieftains.',
  },
  [ItemType.MUSKETS]: {
    type: ItemType.MUSKETS,
    name: 'Matchlock Muskets',
    unitName: 'Crate (4 Muskets & Powder)',
    cost: 50,
    quantityPerUnit: 4,
    weight: 3,
    icon: '💥',
    description: 'Devastating firearms with black powder to rout fierce beasts.',
  },
  [ItemType.MEDICINE]: {
    type: ItemType.MEDICINE,
    name: 'Quinine & Tonics',
    unitName: 'Chest (5 Doses)',
    cost: 30,
    quantityPerUnit: 5,
    weight: 1,
    icon: '🧪',
    description: 'Potent bark tinctures and salves against jungle ague and serpent bites.',
  },
};

export interface StartingOutfitBudget {
  initialGold: number;
  shipMaxCargoTonnage: number;
}

export const DEFAULT_BUDGET: StartingOutfitBudget = {
  initialGold: 1200,
  shipMaxCargoTonnage: 50,
};
