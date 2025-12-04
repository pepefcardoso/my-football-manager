import type { Player } from "../domain/models";
import type { TeamStrength } from "../domain/types";
import { Position } from "../domain/enums";

export class TeamStrengthCalculator {
  public static calculate(players: Player[]): TeamStrength {
    if (players.length === 0) return this.getDefaultStrength();

    let totalOverall = 0;
    let totalMoral = 0;
    let totalEnergy = 0;

    const stats = {
      attack: { sum: 0, count: 0 },
      midfield: { sum: 0, count: 0 },
      defense: { sum: 0, count: 0 },
    };

    for (const p of players) {
      totalOverall += p.overall;
      totalMoral += p.moral;
      totalEnergy += p.energy;

      if (p.position === Position.FW) {
        stats.attack.sum += (p.finishing + p.shooting + p.pace) / 3;
        stats.attack.count++;
      } else if (p.position === Position.MF) {
        stats.midfield.sum += (p.passing + p.dribbling + p.pace) / 3;
        stats.midfield.count++;
      } else if (p.position === Position.DF || p.position === Position.GK) {
        const defAttr =
          p.position === Position.GK
            ? p.defending
            : (p.defending + p.physical) / 2;
        stats.defense.sum += defAttr;
        stats.defense.count++;
      }
    }

    const getAvg = (set: { sum: number; count: number }) =>
      set.count > 0 ? set.sum / set.count : 50;

    return {
      overall: totalOverall / players.length,
      attack: getAvg(stats.attack),
      midfield: getAvg(stats.midfield),
      defense: getAvg(stats.defense),
      moralBonus: (totalMoral / players.length - 50) / 10,
      fitnessMultiplier: 0.7 + (totalEnergy / players.length / 100) * 0.3,
    };
  }

  private static getDefaultStrength(): TeamStrength {
    return {
      overall: 50,
      attack: 50,
      defense: 50,
      midfield: 50,
      moralBonus: 0,
      fitnessMultiplier: 1.0,
    };
  }
}
