export interface TurnHooks { player: () => void; enemies: () => void; world: () => void }
/** Synchronous rules make a turn atomic; visual animations never own game state. */
export class TurnClock {
  turn: number;
  private resolving = false;
  constructor(turn = 0) { this.turn = turn; }
  commit(hooks: TurnHooks): boolean {
    if (this.resolving) return false;
    this.resolving = true;
    try { hooks.player(); hooks.enemies(); hooks.world(); this.turn++; return true; }
    finally { this.resolving = false; }
  }
}
