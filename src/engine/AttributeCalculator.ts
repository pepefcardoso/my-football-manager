import { Position } from "../domain/enums";
import type { Player } from "../domain/models";
import type { PlayerAttributes } from "../domain/types";
import { GameBalance } from "./GameBalanceConfig";

export class AttributeCalculator {
  static calculateOverall(position: Position, attrs: PlayerAttributes): number {
    const w = GameBalance.ATTRIBUTE_WEIGHTS[position];
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

  static calculateEffectiveOverall(player: Player): number {
    const baseOverall = player.overall;
    const moral = player.moral;

    let modifier = 1.0;

    if (moral < 50) {
      modifier = 0.85 + (moral / 50) * 0.15;
    } else {
      modifier = 1.0 + ((moral - 50) / 50) * 0.05;
    }

    return Math.round(baseOverall * modifier);
  }
}
