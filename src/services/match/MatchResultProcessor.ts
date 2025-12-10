import { BaseService } from "../BaseService";
import type { IRepositoryContainer } from "../../repositories/IRepositories";
import type { ServiceResult } from "../types/ServiceResults";
import type { MatchResult } from "../../domain/types";

export class MatchResultProcessor extends BaseService {
  constructor(repositories: IRepositoryContainer) {
    super(repositories, "MatchResultProcessor");
  }

  async processResult(
    matchId: number,
    result: MatchResult,
    ticketRevenue: number,
    attendance: number
  ): Promise<ServiceResult<void>> {
    return this.executeVoid(
      "processResult",
      { matchId, result, ticketRevenue, attendance },
      async ({ matchId, result, ticketRevenue, attendance }) => {
        await this.repos.matches.updateMatchResult(
          matchId,
          result.homeScore,
          result.awayScore,
          attendance,
          ticketRevenue
        );

        await this.saveMatchEvents(matchId, result);
        await this.updatePlayerConditions(result);
      }
    );
  }

  async updateStandings(
    competitionId: number,
    seasonId: number,
    homeTeamId: number,
    awayTeamId: number,
    homeScore: number,
    awayScore: number
  ): Promise<ServiceResult<void>> {
    return this.executeVoid(
      "updateStandings",
      { competitionId, seasonId, homeTeamId, awayTeamId, homeScore, awayScore },
      async ({
        competitionId,
        seasonId,
        homeTeamId,
        awayTeamId,
        homeScore,
        awayScore,
      }) => {
        const homeStanding = await this.repos.competitions.getStandings(
          competitionId,
          seasonId
        );
        const homeData = homeStanding.find((s) => s.teamId === homeTeamId);

        const homeWin = homeScore > awayScore;
        const draw = homeScore === awayScore;

        await this.repos.competitions.updateStanding(
          competitionId,
          seasonId,
          homeTeamId,
          {
            played: (homeData?.played || 0) + 1,
            wins: (homeData?.wins || 0) + (homeWin ? 1 : 0),
            draws: (homeData?.draws || 0) + (draw ? 1 : 0),
            losses: (homeData?.losses || 0) + (!homeWin && !draw ? 1 : 0),
            goalsFor: (homeData?.goalsFor || 0) + homeScore,
            goalsAgainst: (homeData?.goalsAgainst || 0) + awayScore,
            points: (homeData?.points || 0) + (homeWin ? 3 : draw ? 1 : 0),
          }
        );

        const awayData = homeStanding.find((s) => s.teamId === awayTeamId);
        const awayWin = awayScore > homeScore;

        await this.repos.competitions.updateStanding(
          competitionId,
          seasonId,
          awayTeamId,
          {
            played: (awayData?.played || 0) + 1,
            wins: (awayData?.wins || 0) + (awayWin ? 1 : 0),
            draws: (awayData?.draws || 0) + (draw ? 1 : 0),
            losses: (awayData?.losses || 0) + (!awayWin && !draw ? 1 : 0),
            goalsFor: (awayData?.goalsFor || 0) + awayScore,
            goalsAgainst: (awayData?.goalsAgainst || 0) + homeScore,
            points: (awayData?.points || 0) + (awayWin ? 3 : draw ? 1 : 0),
          }
        );
      }
    );
  }

  private async saveMatchEvents(
    matchId: number,
    result: MatchResult
  ): Promise<void> {
    const eventsToSave = result.events
      .filter((e) =>
        ["goal", "yellow_card", "red_card", "injury"].includes(e.type)
      )
      .map((e) => ({
        matchId,
        minute: e.minute,
        type: e.type,
        teamId: e.teamId,
        playerId: e.playerId || null,
        description: e.description,
      }));

    await this.repos.matches.createMatchEvents(eventsToSave);
  }

  private async updatePlayerConditions(result: MatchResult): Promise<void> {
    await this.repos.players.updateDailyStatsBatch(
      result.playerUpdates.map((u) => ({
        id: u.playerId,
        energy: u.energy,
        fitness: Math.max(0, 100 - (100 - u.energy)),
        moral: u.moral,
        isInjured: u.isInjured,
        injuryDays: u.injuryDays,
      }))
    );
  }
}
