export enum LandmarkType {
  SHIP_ANCHOR = 'SHIP_ANCHOR',
  NATIVE_VILLAGE = 'NATIVE_VILLAGE',
  ANCIENT_RUINS = 'ANCIENT_RUINS',
  GOLDEN_TEMPLE = 'GOLDEN_TEMPLE',
  CITY_OF_GOLD = 'CITY_OF_GOLD',
  FRESH_SPRING = 'FRESH_SPRING',
}

export interface LandmarkDef {
  type: LandmarkType;
  name: string;
  symbol: string;
  color: number;
  description: string;
  xpReward: number;
}

export const LANDMARK_DEFINITIONS: Record<LandmarkType, LandmarkDef> = {
  [LandmarkType.SHIP_ANCHOR]: {
    type: LandmarkType.SHIP_ANCHOR,
    name: 'Caravel "Santa Maria" Anchor Point',
    symbol: '⚓',
    color: 0xdeb887,
    description: 'Your anchored flagship. Safe haven to store discovered gold and resupply.',
    xpReward: 0,
  },
  [LandmarkType.NATIVE_VILLAGE]: {
    type: LandmarkType.NATIVE_VILLAGE,
    name: 'Native Village',
    symbol: '⛺',
    color: 0xcd853f,
    description: 'A peaceful thatched village with a watchful chieftain and tribal shamans.',
    xpReward: 50,
  },
  [LandmarkType.ANCIENT_RUINS]: {
    type: LandmarkType.ANCIENT_RUINS,
    name: 'Ancient Stone Ruins',
    symbol: '🏛️',
    color: 0xa9a9a9,
    description: 'Crumbling mossy glyph-inscribed megaliths hiding gold relics and mysterious maps.',
    xpReward: 100,
  },
  [LandmarkType.GOLDEN_TEMPLE]: {
    type: LandmarkType.GOLDEN_TEMPLE,
    name: 'Sacred Sun Temple',
    symbol: '☀️',
    color: 0xffd700,
    description: 'Towering stepped pyramid dedicated to the Sun Deity, bathed in gold leaf.',
    xpReward: 250,
  },
  [LandmarkType.CITY_OF_GOLD]: {
    type: LandmarkType.CITY_OF_GOLD,
    name: 'The Legendary City of Gold (El Dorado)',
    symbol: '👑',
    color: 0xffe033,
    description: 'The fabled golden metropolis of high towers, pure gold plazas, and untold emeralds!',
    xpReward: 1000,
  },
  [LandmarkType.FRESH_SPRING]: {
    type: LandmarkType.FRESH_SPRING,
    name: 'Crystal Oasis Spring',
    symbol: '💧',
    color: 0x00ffff,
    description: 'A pure bubbling freshwater pool that revitalizes weary explorers.',
    xpReward: 30,
  },
};
