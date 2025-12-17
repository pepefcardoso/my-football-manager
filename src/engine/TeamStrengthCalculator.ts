import type { TeamStrength } from "../domain/types";
import type {
  EngineTeam,
  EnginePosition,
  EnginePlayer,
} from "./types/EngineTypes";
import { GameBalance } from "./GameBalanceConfig";

export class TeamStrengthCalculator {
  public static calculate(team: EngineTeam): TeamStrength {
    const { players, tacticalBonus } = team;

    if (players.length === 0) return this.getDefaultStrength();

    const totalOverall = players.reduce((acc, p) => acc + p.overall, 0);
    const totalMoral = players.reduce((acc, p) => acc + p.condition.moral, 0);
    const totalEnergy = players.reduce((acc, p) => acc + p.condition.energy, 0);

    return {
      overall: Math.round(totalOverall / players.length),
      attack: this.calculateSectorStrength(players, "FW", tacticalBonus),
      midfield: this.calculateSectorStrength(players, "MF", tacticalBonus),
      defense: this.calculateSectorStrength(players, "DF", tacticalBonus),
      moralBonus: Math.round((totalMoral / players.length - 50) / 10),
      fitnessMultiplier: Number(
        (0.7 + (totalEnergy / players.length / 100) * 0.3).toFixed(2)
      ),
    };
  }

  public static calculateSectorStrength(
    players: EnginePlayer[],
    sector: "DF" | "MF" | "FW",
    tacticalBonus: number
  ): number {
    const sectorPlayers = players.filter((p) => {
      if (sector === "DF") return p.position === "DF" || p.position === "GK";
      return p.position === sector;
    });

    if (sectorPlayers.length === 0) return 30;

    let totalWeightedScore = 0;
    let totalMoral = 0;
    let totalEnergy = 0;

    for (const p of sectorPlayers) {
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

      totalWeightedScore += weightedScore;
      totalMoral += p.condition.moral;
      totalEnergy += p.condition.energy;
    }

    const avgAttributePower = totalWeightedScore / sectorPlayers.length;
    const avgMoral = totalMoral / sectorPlayers.length;
    const avgEnergy = totalEnergy / sectorPlayers.length;

    const attributePart = avgAttributePower * 0.7;
    const tacticalPart = avgAttributePower * (1 + tacticalBonus / 100) * 0.2;
    const conditionPart =
      avgAttributePower * (avgMoral / 100) * (avgEnergy / 100) * 0.1;

    return Math.round(attributePart + tacticalPart + conditionPart);
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
