import type { TeamStrength } from "../domain/types";
import type { EngineTeam, EnginePosition } from "./types/EngineTypes";
import { GameBalance } from "./GameBalanceConfig";

export class TeamStrengthCalculator {
  /**
   * Calcula a força baseada na estrutura do EngineTeam.
   * Utiliza os pesos definidos em GameBalanceConfig para garantir consistência.
   */
  public static calculate(team: EngineTeam): TeamStrength {
    const { players, tacticalBonus } = team;

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
      totalMoral += p.condition.moral;
      totalEnergy += p.condition.energy;

      const weights = GameBalance.ATTRIBUTE_WEIGHTS[
        p.position as EnginePosition
      ] || {
        defending: 1,
        physical: 1,
        passing: 1,
        finishing: 1,
        dribbling: 1,
        pace: 1,
        shooting: 1,
      };

      const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

      const weightedScore =
        (p.skills.defending * weights.defending +
          p.skills.physical * weights.physical +
          p.skills.passing * weights.passing +
          p.skills.finishing * weights.finishing +
          p.skills.dribbling * weights.dribbling +
          p.skills.pace * weights.pace +
          p.skills.shooting * weights.shooting) /
        totalWeight;

      if (p.position === "FW") {
        stats.attack.sum += weightedScore;
        stats.attack.count++;
      } else if (p.position === "MF") {
        stats.midfield.sum += weightedScore;
        stats.midfield.count++;
      } else if (p.position === "DF" || p.position === "GK") {
        stats.defense.sum += weightedScore;
        stats.defense.count++;
      }
    }

    const getAvg = (set: { sum: number; count: number }) =>
      set.count > 0 ? set.sum / set.count : 50;

    const tacticalMultiplier = 1 + tacticalBonus / 100;

    return {
      overall: Math.round(totalOverall / players.length),
      attack: Math.round(getAvg(stats.attack) * tacticalMultiplier),
      midfield: Math.round(getAvg(stats.midfield) * tacticalMultiplier),
      defense: Math.round(getAvg(stats.defense) * tacticalMultiplier),
      moralBonus: Math.round((totalMoral / players.length - 50) / 10),
      fitnessMultiplier: Number(
        (0.7 + (totalEnergy / players.length / 100) * 0.3).toFixed(2)
      ),
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
