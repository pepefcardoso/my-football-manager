import type { TeamStrength } from "../domain/types";
import type {
  EngineTeam,
  EnginePosition,
  EnginePlayer,
} from "./types/EngineTypes";
import { GameBalance } from "./GameBalanceConfig";

export class TeamStrengthCalculator {
  private static readonly POSITION_PENALTIES: Record<
    EnginePosition,
    Record<string, number>
  > = {
    GK: { DF: 1.0, MF: 0.1, FW: 0.05 },
    DF: { DF: 1.0, MF: 0.7, FW: 0.4 },
    MF: { DF: 0.7, MF: 1.0, FW: 0.7 },
    FW: { DF: 0.3, MF: 0.6, FW: 1.0 },
  };

  public static calculate(team: EngineTeam, tactics?: any): TeamStrength {
    const { players, tacticalBonus } = team;

    if (players.length === 0) return this.getDefaultStrength();

    const totalOverall = players.reduce((acc, p) => acc + p.overall, 0);
    const totalMoral = players.reduce((acc, p) => acc + p.condition.moral, 0);
    const totalEnergy = players.reduce((acc, p) => acc + p.condition.energy, 0);

    let fitnessBase = 0.7 + (totalEnergy / players.length / 100) * 0.3;

    if (tactics?.marking === "man_to_man") {
      fitnessBase *= 0.95;
    }

    return {
      overall: Math.round(totalOverall / players.length),
      attack: this.calculateSectorStrength(
        players,
        "FW",
        tacticalBonus,
        tactics?.gameStyle
      ),
      midfield: this.calculateSectorStrength(
        players,
        "MF",
        tacticalBonus,
        tactics?.gameStyle
      ),
      defense: this.calculateSectorStrength(
        players,
        "DF",
        tacticalBonus,
        tactics?.gameStyle
      ),
      moralBonus: Math.round((totalMoral / players.length - 50) / 10),
      fitnessMultiplier: Number(fitnessBase.toFixed(2)),
    };
  }

  public static calculateSectorStrength(
    players: EnginePlayer[],
    sector: "DF" | "MF" | "FW",
    tacticalBonus: number,
    gameStyle?: string
  ): number {
    const sectorPlayers = players.filter((p) => {
      if (sector === "DF") return p.position === "DF" || p.position === "GK";
      return p.position === sector;
    });

    if (sectorPlayers.length === 0) return 30;

    let totalWeightedScore = 0;

    for (const p of sectorPlayers) {
      const weights =
        GameBalance.ATTRIBUTE_WEIGHTS[p.position as EnginePosition] ||
        this.getDefaultWeights();
      const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

      let weightedScore =
        (p.skills.defending * weights.defending +
          p.skills.physical * weights.physical +
          p.skills.passing * weights.passing +
          p.skills.finishing * weights.finishing +
          p.skills.dribbling * weights.dribbling +
          p.skills.pace * weights.pace +
          p.skills.shooting * weights.shooting) /
        totalWeight;

      weightedScore *= this.getPositionPenalty(p.position, sector);

      totalWeightedScore += weightedScore;
    }

    let avgAttributePower = totalWeightedScore / sectorPlayers.length;

    avgAttributePower = this.applyGameStyleModifiers(
      avgAttributePower,
      sector,
      gameStyle
    );

    const avgMoral =
      players.reduce((acc, p) => acc + p.condition.moral, 0) / players.length;
    const avgEnergy =
      players.reduce((acc, p) => acc + p.condition.energy, 0) / players.length;

    const attributePart = avgAttributePower * 0.7;
    const tacticalPart = avgAttributePower * (1 + tacticalBonus / 100) * 0.2;
    const conditionPart =
      avgAttributePower * (avgMoral / 100) * (avgEnergy / 100) * 0.1;

    return Math.round(attributePart + tacticalPart + conditionPart);
  }

  private static applyGameStyleModifiers(
    power: number,
    sector: string,
    style?: string
  ): number {
    if (!style) return power;

    switch (style) {
      case "possession":
        if (sector === "MF") return power * 1.1;
        return power;

      case "counter_attack":
        if (sector === "FW") return power * 1.1;
        if (sector === "MF") return power * 0.95;
        return power;

      case "long_ball":
        if (sector === "FW") return power * 1.05;
        if (sector === "MF") return power * 0.9;
        return power;

      case "pressing":
        if (sector === "DF") return power * 1.05;
        if (sector === "MF") return power * 1.05;
        return power;

      default:
        return power;
    }
  }

  private static getPositionPenalty(
    naturalPos: EnginePosition,
    assignedSector: string
  ): number {
    if (naturalPos === assignedSector) return 1.0;
    if (naturalPos === "GK" && assignedSector === "DF") return 1.0;
    return this.POSITION_PENALTIES[naturalPos]?.[assignedSector] ?? 0.5;
  }

  private static getDefaultWeights() {
    return {
      defending: 1,
      physical: 1,
      passing: 1,
      finishing: 1,
      dribbling: 1,
      pace: 1,
      shooting: 1,
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
