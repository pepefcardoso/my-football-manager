export class RandomEngine {
  private static defaultInstance = new RandomEngine(Date.now());

  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  public setSeed(seed: number) {
    this.seed = seed;
  }

  private next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  public getInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  public chance(percentage: number): boolean {
    return this.next() * 100 < percentage;
  }

  public pickOne<T>(items: T[]): T | null {
    if (items.length === 0) return null;
    return items[this.getInt(0, items.length - 1)];
  }

  public pickWeighted<T>(items: T[], weights: number[]): T {
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let randomVal = this.next() * totalWeight;

    for (let i = 0; i < items.length; i++) {
      if (randomVal < weights[i]) return items[i];
      randomVal -= weights[i];
    }
    return items[0];
  }

  static setSeed(seed: number) {
    this.defaultInstance.setSeed(seed);
  }

  static getInt(min: number, max: number): number {
    return this.defaultInstance.getInt(min, max);
  }

  static chance(percentage: number): boolean {
    return this.defaultInstance.chance(percentage);
  }

  static pickOne<T>(items: T[]): T {
    const result = this.defaultInstance.pickOne(items);
    if (result === null && items.length > 0) return items[0];
    return result as T;
  }

  static pickWeighted<T>(items: T[], weights: number[]): T {
    return this.defaultInstance.pickWeighted(items, weights);
  }
}
