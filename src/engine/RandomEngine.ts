export class RandomEngine {
  private static seed: number = Date.now();

  static setSeed(seed: number) {
    this.seed = seed;
  }

  private static random(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  static getInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  static chance(percentage: number): boolean {
    return this.random() * 100 < percentage;
  }

  static getNormalDistribution(mean: number, stdDev: number): number {
    let u = 0,
      v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return Math.round(num * stdDev + mean);
  }

  static pickOne<T>(items: T[]): T {
    return items[this.getInt(0, items.length - 1)];
  }

  static pickWeighted<T>(items: T[], weights: number[]): T {
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = this.random() * totalWeight;

    for (let i = 0; i < items.length; i++) {
      if (random < weights[i]) return items[i];
      random -= weights[i];
    }
    return items[0];
  }
}
