export class RandomEngine {
  static getInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  static chance(percentage: number): boolean {
    return Math.random() * 100 < percentage;
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
}
