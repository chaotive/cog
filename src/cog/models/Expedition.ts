import { CrewRole, CREW_DEFINITIONS, ItemType } from '../data/ExpeditionData';

export interface LeaderProfile {
  name: string;
  title: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  perks: string[];
}

export class Expedition {
  public leader: LeaderProfile;
  public crew: Record<CrewRole, number>;
  public inventory: {
    rations: number;     // Number of individual meals/portions
    tools: number;       // Sets of tools/machetes
    tradeGoods: number;  // Bundles of beads/cloth
    muskets: number;     // Firearms
    medicine: number;    // Doses
    gold: number;        // Gold doubloons currently carried in pack
    goldRelics: number;  // Ancient golden artifacts found
  };

  public shipStores: {
    gold: number;        // Safely deposited in ship hull
    rations: number;     // Reserve rations
    relics: number;      // Stored relics
  };

  public morale: number; // 0 to 100
  public health: number; // 0 to 100 (overall expedition fitness)
  public isDisembarked: boolean = false; // Whether party is on foot vs aboard ship

  constructor() {
    this.leader = {
      name: 'Don Diego de Mendoza',
      title: 'Captain General',
      level: 1,
      xp: 0,
      xpToNextLevel: 100,
      perks: ['Royal Charter', 'Cartographer'],
    };

    this.crew = {
      [CrewRole.SAILOR]: 8,
      [CrewRole.SOLDIER]: 4,
      [CrewRole.SCOUT]: 2,
      [CrewRole.DOCTOR]: 1,
      [CrewRole.PRIEST]: 1,
    };

    this.inventory = {
      rations: 80,
      tools: 5,
      tradeGoods: 15,
      muskets: 6,
      medicine: 4,
      gold: 150,
      goldRelics: 0,
    };

    this.shipStores = {
      gold: 0,
      rations: 0,
      relics: 0,
    };

    this.morale = 95;
    this.health = 100;
  }

  public get totalCrewCount(): number {
    return Object.values(this.crew).reduce((acc, count) => acc + count, 0);
  }

  public get visionRadius(): number {
    const scoutBonus = Math.floor(this.crew[CrewRole.SCOUT] / 2);
    const perkBonus = this.leader.perks.includes('Eagle Eye') ? 1 : 0;
    return Math.min(5, Math.max(2, 2 + scoutBonus + perkBonus));
  }

  public get combatStrength(): number {
    const soldierStrength = this.crew[CrewRole.SOLDIER] * 12;
    const musketBonus = Math.min(this.crew[CrewRole.SOLDIER], this.inventory.muskets) * 8;
    const leaderBonus = this.leader.level * 5;
    const moraleMod = this.morale / 100;
    return Math.round((soldierStrength + musketBonus + leaderBonus + 10) * (0.6 + 0.4 * moraleMod));
  }

  public get cargoWeight(): number {
    let weight = 0;
    // Crew weight
    weight += this.totalCrewCount;
    // Cargo weight
    weight += Math.ceil(this.inventory.rations / 10);
    weight += Math.ceil(this.inventory.tools / 2);
    weight += Math.ceil(this.inventory.tradeGoods / 5);
    weight += Math.ceil(this.inventory.muskets / 2);
    weight += Math.ceil(this.inventory.medicine / 5);
    weight += Math.floor(this.inventory.gold / 200);
    return weight;
  }

  public addXp(amount: number): { leveledUp: boolean; newPerk?: string } {
    this.leader.xp += amount;
    let leveledUp = false;
    let newPerk: string | undefined = undefined;

    while (this.leader.xp >= this.leader.xpToNextLevel) {
      this.leader.xp -= this.leader.xpToNextLevel;
      this.leader.level += 1;
      this.leader.xpToNextLevel = Math.round(this.leader.xpToNextLevel * 1.5);
      leveledUp = true;

      // Milestone perks
      if (this.leader.level === 2 && !this.leader.perks.includes('Eagle Eye')) {
        newPerk = 'Eagle Eye (+1 Sight Radius)';
        this.leader.perks.push('Eagle Eye');
      } else if (this.leader.level === 3 && !this.leader.perks.includes('Iron Will')) {
        newPerk = 'Iron Will (+20 Max Morale Resilience)';
        this.leader.perks.push('Iron Will');
      } else if (this.leader.level === 4 && !this.leader.perks.includes('Master Navigator')) {
        newPerk = 'Master Navigator (-25% Terrain Move Cost)';
        this.leader.perks.push('Master Navigator');
      } else {
        newPerk = `Expedition Rank ${this.leader.level} Veteran`;
      }
    }

    return { leveledUp, newPerk };
  }

  /**
   * Consumes food and checks health/morale for a single turn movement.
   */
  public consumeTurn(moveCostMultiplier: number = 1.0): {
    rationsConsumed: number;
    starving: boolean;
    lossEvent?: string;
  } {
    // Basic ration consumption: ~1 ration per 4 crew per turn, modified by terrain
    let effectiveCost = moveCostMultiplier;
    if (this.inventory.tools > 0 && moveCostMultiplier > 1.2) {
      effectiveCost = Math.max(1.0, moveCostMultiplier - 0.5); // Tools help machete through jungle
    }

    const consumption = Math.max(1, Math.round((this.totalCrewCount / 5) * effectiveCost));
    let starving = false;
    let lossEvent: string | undefined;

    if (this.inventory.rations >= consumption) {
      this.inventory.rations -= consumption;
    } else {
      // Starvation!
      this.inventory.rations = 0;
      starving = true;
      this.morale = Math.max(5, this.morale - 8);
      this.health = Math.max(10, this.health - 10);

      // Chance of crew casualty
      if (Math.random() < 0.25 && this.totalCrewCount > 2) {
        lossEvent = this.loseRandomCrewMember('starvation');
      }
    }

    // Passive morale drift based on health and food
    if (!starving && this.morale < 80) {
      this.morale = Math.min(100, this.morale + 1);
    }

    return { rationsConsumed: consumption, starving, lossEvent };
  }

  public forage(chance: number): number {
    if (Math.random() < chance) {
      const sailorBonus = this.crew[CrewRole.SAILOR] * 0.5;
      const found = Math.floor(Math.random() * 6 + 3 + sailorBonus);
      this.inventory.rations += found;
      return found;
    }
    return 0;
  }

  public campRest(): { healedHp: number; moraleGain: number; rationsUsed: number } {
    const rationsNeeded = Math.max(2, Math.round(this.totalCrewCount / 3));
    if (this.inventory.rations < rationsNeeded) {
      return { healedHp: 0, moraleGain: 0, rationsUsed: 0 };
    }

    this.inventory.rations -= rationsNeeded;
    const docBonus = this.crew[CrewRole.DOCTOR] * 8;
    const priestBonus = this.crew[CrewRole.PRIEST] * 6;

    const healedHp = Math.min(100 - this.health, 15 + docBonus);
    this.health += healedHp;

    const moraleGain = Math.min(100 - this.morale, 12 + priestBonus);
    this.morale += moraleGain;

    return { healedHp, moraleGain, rationsUsed: rationsNeeded };
  }

  public loseRandomCrewMember(cause: string): string {
    const roles = Object.keys(this.crew) as CrewRole[];
    const available = roles.filter(r => this.crew[r] > 0);
    if (available.length === 0) return 'No crew remaining!';

    const chosen = available[Math.floor(Math.random() * available.length)];
    this.crew[chosen]--;
    const def = CREW_DEFINITIONS[chosen];
    return `Lost a ${def.name} to ${cause}!`;
  }

  public depositAllGoldToShip(): number {
    const deposited = this.inventory.gold;
    this.shipStores.gold += deposited;
    this.inventory.gold = 0;

    const relics = this.inventory.goldRelics;
    this.shipStores.relics += relics;
    this.inventory.goldRelics = 0;

    return deposited;
  }

  public restockFromShip(rationsCount: number): number {
    const take = Math.min(rationsCount, this.shipStores.rations);
    this.shipStores.rations -= take;
    this.inventory.rations += take;
    return take;
  }
}
