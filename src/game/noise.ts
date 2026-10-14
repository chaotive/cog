import { Rng } from './rng';

/** Smoothly interpolated value noise, summed over octaves. Returns values in [0,1). */
export class ValueNoise {
  private readonly lattice: Float32Array;
  private static readonly SIZE = 256;

  constructor(seed: number) {
    const rng = new Rng(seed);
    this.lattice = new Float32Array(ValueNoise.SIZE * ValueNoise.SIZE);
    for (let i = 0; i < this.lattice.length; i++) this.lattice[i] = rng.next();
  }

  private at(ix: number, iy: number): number {
    const s = ValueNoise.SIZE;
    return this.lattice[(((iy % s) + s) % s) * s + (((ix % s) + s) % s)];
  }

  sample(x: number, y: number): number {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = x - x0;
    const fy = y - y0;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const top = this.at(x0, y0) * (1 - sx) + this.at(x0 + 1, y0) * sx;
    const bottom = this.at(x0, y0 + 1) * (1 - sx) + this.at(x0 + 1, y0 + 1) * sx;
    return top * (1 - sy) + bottom * sy;
  }

  fractal(x: number, y: number, octaves = 4): number {
    let amp = 1;
    let freq = 1;
    let sum = 0;
    let norm = 0;
    for (let i = 0; i < octaves; i++) {
      sum += this.sample(x * freq, y * freq) * amp;
      norm += amp;
      amp *= 0.5;
      freq *= 2;
    }
    return sum / norm;
  }
}
