import { BaseService } from "../BaseService";
import type { IRepositoryContainer } from "../../repositories/IRepositories";
import type { ServiceResult } from "../types/ServiceResults";

export class MatchFanSatisfactionProcessor extends BaseService {
  constructor(repositories: IRepositoryContainer) {
    super(repositories, "MatchFanSatisfactionProcessor");
  }

  async updateSatisfactionForMatch(
    matchId: number,
    homeScore: number,
    awayScore: number
  ): Promise<ServiceResult<void>> {
    return this.executeVoid(
      "updateSatisfactionForMatch",
      { matchId, homeScore, awayScore },
      async ({ matchId, homeScore, awayScore }) => {
        const match = await this.repos.matches.findById(matchId);
        if (!match) return;

        const homeTeam = await this.repos.teams.findById(match.homeTeamId!);
        const awayTeam = await this.repos.teams.findById(match.awayTeamId!);

        if (!homeTeam || !awayTeam) return;

        const homeTeamRep = homeTeam.reputation || 0;
        const awayTeamRep = awayTeam.reputation || 0;

        let homeResult: "win" | "draw" | "loss" = "draw";
        if (homeScore > awayScore) homeResult = "win";
        else if (homeScore < awayScore) homeResult = "loss";

        await this.updateTeamSatisfaction(
          match.homeTeamId!,
          homeResult,
          true,
          awayTeamRep,
          homeTeamRep,
          homeTeam.fanSatisfaction ?? 50
        );

        let awayResult: "win" | "draw" | "loss" = "draw";
        if (awayScore > homeScore) awayResult = "win";
        else if (awayScore < homeScore) awayResult = "loss";

        await this.updateTeamSatisfaction(
          match.awayTeamId!,
          awayResult,
          false,
          homeTeamRep,
          awayTeamRep,
          awayTeam.fanSatisfaction ?? 50
        );
      }
    );
  }

  private async updateTeamSatisfaction(
    teamId: number,
    result: "win" | "draw" | "loss",
    isHomeGame: boolean,
    opponentReputation: number,
    teamReputation: number,
    currentSatisfaction: number
  ): Promise<void> {
    const reputationDiff = opponentReputation - teamReputation;
    let change = 0;

    if (result === "win") {
      change = 2 + Math.max(0, reputationDiff / 1000);
      if (isHomeGame) change += 1;
    } else if (result === "loss") {
      change = -3;
      if (reputationDiff > 2000) change += 1;
      if (isHomeGame) change -= 1;
    } else {
      if (reputationDiff > 500) change = 1;
      else if (reputationDiff < -500) change = -2;
      else change = 0;
    }

    change = Math.max(-5, Math.min(5, Math.round(change)));

    const newSatisfaction = Math.max(
      0,
      Math.min(100, currentSatisfaction + change)
    );

    if (newSatisfaction !== currentSatisfaction) {
      await this.repos.teams.update(teamId, {
        fanSatisfaction: newSatisfaction,
      });

      const symbol = change > 0 ? "+" : "";
      this.logger.info(
        `Satisfação da torcida atualizada: ${currentSatisfaction}% ➡️ ${newSatisfaction}% (${symbol}${change})`
      );
    }
  }
}
