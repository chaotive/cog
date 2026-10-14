export type TurnListener = (turn: number) => void;

/** Turn counter. Systems register listeners that run, in order, whenever a turn passes. */
export class TurnManager {
  private _turn = 0;
  private readonly listeners: TurnListener[] = [];

  get turn(): number {
    return this._turn;
  }

  onTurn(listener: TurnListener): void {
    this.listeners.push(listener);
  }

  endTurn(): void {
    this._turn++;
    for (const l of this.listeners) l(this._turn);
  }
}
