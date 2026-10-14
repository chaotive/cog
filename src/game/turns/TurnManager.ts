export enum TurnPhase {
  PLAYER_INPUT = 'PLAYER_INPUT',
  PLAYER_ACTION = 'PLAYER_ACTION',
  ENEMY_TURN = 'ENEMY_TURN',
  WORLD_TICK = 'WORLD_TICK',
  TURN_RESOLVED = 'TURN_RESOLVED',
}

export interface TurnEventHandlers {
  onPhaseChange?: (phase: TurnPhase) => void;
  onTurnStart?: (turn: number) => void;
  onTurnEnd?: (turn: number) => void;
  onEnemyTurn?: () => Promise<void> | void;
  onWorldTick?: () => Promise<void> | void;
}

export class TurnManager {
  private currentTurn: number = 1;
  private currentPhase: TurnPhase = TurnPhase.PLAYER_INPUT;
  private isProcessing: boolean = false;
  private handlers: TurnEventHandlers;

  constructor(handlers: TurnEventHandlers = {}) {
    this.handlers = handlers;
  }

  public get turn(): number {
    return this.currentTurn;
  }

  public get phase(): TurnPhase {
    return this.currentPhase;
  }

  public get isPlayerTurn(): boolean {
    return this.currentPhase === TurnPhase.PLAYER_INPUT && !this.isProcessing;
  }

  public setHandlers(handlers: TurnEventHandlers): void {
    this.handlers = { ...this.handlers, ...handlers };
  }

  private setPhase(phase: TurnPhase): void {
    this.currentPhase = phase;
    if (this.handlers.onPhaseChange) {
      this.handlers.onPhaseChange(phase);
    }
  }

  /**
   * Called when player commits an action (moving, waiting, camping).
   * This triggers the turn sequence: Player Action -> Enemies -> World -> Next Turn.
   */
  public async commitPlayerAction(actionFn?: () => Promise<void> | void): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // 1. Player Action Phase
      this.setPhase(TurnPhase.PLAYER_ACTION);
      if (actionFn) {
        await actionFn();
      }

      // 2. Enemy Turn Phase
      this.setPhase(TurnPhase.ENEMY_TURN);
      if (this.handlers.onEnemyTurn) {
        await this.handlers.onEnemyTurn();
      }

      // 3. World / Environment Tick Phase
      this.setPhase(TurnPhase.WORLD_TICK);
      if (this.handlers.onWorldTick) {
        await this.handlers.onWorldTick();
      }

      // 4. Conclude Turn
      this.setPhase(TurnPhase.TURN_RESOLVED);
      if (this.handlers.onTurnEnd) {
        this.handlers.onTurnEnd(this.currentTurn);
      }

      this.currentTurn++;

      // 5. Start Next Turn
      if (this.handlers.onTurnStart) {
        this.handlers.onTurnStart(this.currentTurn);
      }
      this.setPhase(TurnPhase.PLAYER_INPUT);
    } finally {
      this.isProcessing = false;
    }
  }

  public reset(startingTurn: number = 1): void {
    this.currentTurn = startingTurn;
    this.currentPhase = TurnPhase.PLAYER_INPUT;
    this.isProcessing = false;
  }
}
