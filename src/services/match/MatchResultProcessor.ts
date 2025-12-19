import { BaseService } from "../BaseService";
import type { IRepositoryContainer } from "../../repositories/IRepositories";
import type { MatchFinishedPayload } from "../../domain/GameEventTypes";
import type { StatsService } from "../StatsService";
import type { ServiceResult } from "../../domain/ServiceResults";
import type { MatchResult } from "../../domain/types";

export class MatchResultProcessor extends BaseService {
  private statsService: StatsService;

  constructor(repositories: IRepositoryContainer, statsService: StatsService) {
    super(repositories, "MatchResultProcessor");
    this.statsService = statsService;
  }

  async handleMatchFinished(
    payload: MatchFinishedPayload
  ): Promise<ServiceResult<void>> {
    return this.executeVoid("handleMatchFinished", payload, async (data) => {
      const {
        matchId,
        matchResult,
        competitionId,
        seasonId,
        homeTeamId,
        awayTeamId,
        homeScore,
        awayScore,
      } = data;

      this.logger.info(`Processando pós-jogo da partida ${matchId}...`);

      if (matchResult) {
        await this.saveMatchEvents(matchId, matchResult);
        await this.updatePlayerConditions(matchResult);

        if (competitionId && seasonId) {
          await this.statsService.processMatchStats(
            matchId,
            competitionId,
            seasonId,
            matchResult
          );
        }
      }

      if (competitionId && seasonId) {
        await this.updateStandings(
          competitionId,
          seasonId,
          homeTeamId,
          awayTeamId,
          homeScore,
          awayScore
        );
      }
    });
  }

  private async updateStandings(
    competitionId: number,
    seasonId: number,
    homeTeamId: number,
    awayTeamId: number,
    homeScore: number,
    awayScore: number
  ): Promise<void> {
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

  private async saveMatchEvents(
    matchId: number,
    result: MatchResult
  ): Promise<void> {
    const eventsToSave = result.events
      .filter((e) =>
        ["goal", "yellow_card", "red_card", "injury", "substitution"].includes(
          e.type
        )
      )
      .map((e) => ({
        matchId,
        minute: e.minute,
        type: e.type,
        teamId: e.teamId,
        playerId: e.playerId || null,
        description: e.description,
      }));

    if (eventsToSave.length > 0) {
      await this.repos.matches.createMatchEvents(eventsToSave);
    }
  }

  private async updatePlayerConditions(result: MatchResult): Promise<void> {
    if (result.playerUpdates.length === 0) return;

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
