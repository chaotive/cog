export type Terrain = 'ocean' | 'shore' | 'grass' | 'forest' | 'jungle' | 'hill' | 'mountain' | 'river';
export interface TerrainInfo { name: string; color: number; cost: number; description: string }
export const TERRAIN: Record<Terrain, TerrainInfo> = {
  ocean: { name: 'Open sea', color: 0x3a727c, cost: 0, description: 'Beyond the reach of an expedition on foot.' },
  shore: { name: 'Golden coast', color: 0xc7bd89, cost: 1, description: 'Salt air, pale sand, and the promise of a safe return.' },
  grass: { name: 'Lowland meadow', color: 0x94aa77, cost: 1, description: 'Open country. An easy march for a weary company.' },
  forest: { name: 'Cloud forest', color: 0x5c8b70, cost: 1, description: 'Cool shade and edible plants. A good place to forage.' },
  jungle: { name: 'Emerald jungle', color: 0x467c60, cost: 2, description: 'Dense undergrowth. Tools reduce the cost of passage.' },
  hill: { name: 'Sunlit highlands', color: 0xa1a17a, cost: 2, description: 'A hard climb, rewarded with a wider view of the land.' },
  mountain: { name: 'The stone spine', color: 0x8b9185, cost: 0, description: 'Sheer cliffs. Find a pass around the mountains.' },
  river: { name: 'River crossing', color: 0x75a7a2, cost: 2, description: 'A shallow ford. Cross slowly and keep your supplies dry.' },
};
export type SiteKind = 'ship' | 'village' | 'ruin' | 'spring' | 'city';
export const SITE_LABEL: Record<SiteKind, string> = { ship: 'Flagship', village: 'Settlement', ruin: 'Ancient ruins', spring: 'Freshwater spring', city: 'City of Gold' };
export const LOADOUTS = [
  { id: 'balanced', name: 'The Wayfinder', subtitle: 'A steady hand in unknown lands', icon: 'compass', supplies: 95, tools: 8, medicine: 3, soldiers: 3, scouts: 2, gold: 35 },
  { id: 'scout', name: 'The Cartographer', subtitle: 'Travel light. See farther.', icon: 'eye', supplies: 115, tools: 5, medicine: 2, soldiers: 2, scouts: 4, gold: 25 },
  { id: 'guard', name: 'The Vanguard', subtitle: 'Steel for whatever lies ahead', icon: 'shield', supplies: 85, tools: 6, medicine: 4, soldiers: 5, scouts: 1, gold: 45 },
] as const;
export type LoadoutId = typeof LOADOUTS[number]['id'];
