import { Position } from "../domain/enums";


const WEIGHTS = {
  [Position.GK]: {
    defending: 4,
    physical: 2,
    passing: 1,
    finishing: 0,
    dribbling: 0,
    pace: 1,
    shooting: 0,
  },
  [Position.DF]: {
    defending: 4,
    physical: 3,
    passing: 2,
    pace: 2,
    dribbling: 1,
    finishing: 0,
    shooting: 0,
  },
  [Position.MF]: {
    passing: 4,
    dribbling: 3,
    physical: 2,
    defending: 2,
    pace: 2,
    shooting: 1,
    finishing: 1,
  },
  [Position.FW]: {
    finishing: 4,
    shooting: 3,
    pace: 3,
    dribbling: 3,
    physical: 2,
    passing: 1,
    defending: 0,
  },
};

export class AttributeCalculator {
  static calculateOverall(
    position: Position,
    attrs: {
      finishing: number;
      passing: number;
      dribbling: number;
      defending: number;
      physical: number;
      pace: number;
      shooting: number;
    }
  ): number {
    const w = WEIGHTS[position];
    if (!w) return 50;

    const totalWeight = Object.values(w).reduce((a, b) => a + b, 0);
    const weightedSum =
      attrs.defending * w.defending +
      attrs.physical * w.physical +
      attrs.passing * w.passing +
      attrs.finishing * w.finishing +
      attrs.dribbling * w.dribbling +
      attrs.pace * w.pace +
      attrs.shooting * w.shooting;

    return Math.round(weightedSum / totalWeight);
  }

  static calculatePotentialGrowth(
    age: number,
    currentOverall: number,
    potential: number
  ): number {
    if (currentOverall >= potential) return 0;

    let growthFactor = 0;
    if (age < 21) growthFactor = 3;
    else if (age < 24) growthFactor = 2;
    else if (age < 28) growthFactor = 1;

    const gap = potential - currentOverall;
    return Math.min(gap, Math.floor(Math.random() * growthFactor) + 1);
  }
}
