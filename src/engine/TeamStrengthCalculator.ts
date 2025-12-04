import type { Player } from "../domain/models";
import type { TeamStrength } from "../domain/types";

export class TeamStrengthCalculator {
  public static calculate(players: Player[]): TeamStrength {
    if (players.length === 0) {
      return {
        overall: 50,
        attack: 50,
        defense: 50,
        midfield: 50,
        moralBonus: 0,
        fitnessMultiplier: 1.0,
      };
    }

    const attackers = players.filter((p) => p.position === "FW");
    const midfielders = players.filter((p) => p.position === "MF");
    const defenders = players.filter((p) => p.position === "DF");
    const goalkeeper = players.find((p) => p.position === "GK");

    const attack =
      (this.calcAvg(attackers, "finishing") +
        this.calcAvg(attackers, "shooting") +
        this.calcAvg(attackers, "pace")) /
      3;

    const midfield =
      (this.calcAvg(midfielders, "passing") +
        this.calcAvg(midfielders, "dribbling") +
        this.calcAvg(midfielders, "pace")) /
      3;

    const defense =
      (this.calcAvg(defenders, "defending") +
        this.calcAvg(defenders, "physical") +
        (goalkeeper?.defending || 50)) /
      3;

    const overallAvg =
      players.reduce((sum, p) => sum + p.overall, 0) / players.length;

    const avgMoral =
      players.reduce((sum, p) => sum + p.moral, 0) / players.length;
    const moralBonus = ((avgMoral - 50) / 100) * 10;

    const avgEnergy =
      players.reduce((sum, p) => sum + p.energy, 0) / players.length;
    const fitnessMultiplier = 0.7 + (avgEnergy / 100) * 0.3;

    return {
      overall: overallAvg,
      attack,
      defense,
      midfield,
      moralBonus,
      fitnessMultiplier,
    };
  }

  private static calcAvg(arr: Player[], attr: keyof Player): number {
    return arr.length > 0
      ? arr.reduce((sum, p) => sum + (Number(p[attr]) || 0), 0) / arr.length
      : 50;
  }
}
