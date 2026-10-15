/** Small, reproducible PRNG. Its state is serializable alongside a saved game. */
export class Random {
  state: number;
  constructor(seed: number) { this.state = seed >>> 0 || 1; }
  next(): number {
    let t = this.state += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    this.state >>>= 0;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  int(min: number, max: number): number { return min + Math.floor(this.next() * (max - min + 1)); }
  pick<T>(values: readonly T[]): T { return values[this.int(0, values.length - 1)]; }
}
