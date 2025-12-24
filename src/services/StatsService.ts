import type { MatchResult } from "../domain/types";
import { MatchEventType } from "../domain/enums";
import type {
  IRepositoryContainer,
  PlayerCompetitionStats,
} from "../repositories/IRepositories";
import { BaseService } from "./BaseService";
import type { ServiceResult } from "../domain/ServiceResults";
import { getBalanceValue } from "../engine/GameBalanceConfig";

const MATCH_CONFIG = getBalanceValue("MATCH");

export class StatsService extends BaseService {
  constructor(repositories: IRepositoryContainer) {
    super(repositories, "StatsService");
  }

  async processMatchStats(
    matchId: number,
    competitionId: number,
    seasonId: number,
    result: MatchResult
  ): Promise<ServiceResult<void>> {
    return this.executeVoid(
      "processMatchStats",
      { matchId, competitionId, seasonId, result },
      async ({ matchId, competitionId, seasonId, result }) => {
        const match = await this.repos.matches.findById(matchId);

        if (!match) {
          this.logger.warn(
            `Partida ${matchId} não encontrada. Estatísticas ignoradas.`
          );
          return;
        }

        await this.updatePlayerStats(competitionId, seasonId, result, match);
      }
    );
  }

  async getTopGoalkeepers(
    competitionId: number,
    seasonId: number,
    limit: number = 10
  ): Promise<ServiceResult<any[]>> {
    return this.execute(
      "getTopGoalkeepers",
      { competitionId, seasonId, limit },
      async ({ competitionId, seasonId, limit }) => {
        return await this.repos.competitions.getTopGoalkeepers(
          competitionId,
          seasonId,
          limit
        );
      }
    );
  }

  async getTopScorers(
    competitionId: number,
    seasonId: number,
    limit: number = 10
  ): Promise<ServiceResult<any[]>> {
    return this.execute(
      "getTopScorers",
      { competitionId, seasonId, limit },
      async ({ competitionId, seasonId, limit }) => {
        return await this.repos.competitions.getTopScorers(
          competitionId,
          seasonId,
          limit
        );
      }
    );
  }

  async getPlayerStats(
    playerId: number,
    competitionId: number,
    seasonId: number
  ): Promise<ServiceResult<PlayerCompetitionStats | undefined>> {
    return this.execute(
      "getPlayerStats",
      { playerId, competitionId, seasonId },
      async ({ playerId, competitionId, seasonId }) => {
        return await this.repos.competitions.findPlayerStats(
          playerId,
          competitionId,
          seasonId
        );
      }
    );
  }

  private async updatePlayerStats(
    competitionId: number,
    seasonId: number,
    result: MatchResult,
    match: any
  ): Promise<void> {
    const events = result.events;
    this.logger.debug(
      `Analisando ${events.length} eventos para estatísticas individuais...`
    );

    const statsMap = new Map<
      number,
      {
        goals: number;
        assists: number;
        yellow: number;
        red: number;
        saves: number;
      }
    >();

    events.forEach((event) => {
      if (!event.playerId) return;

      const current = statsMap.get(event.playerId) || {
        goals: 0,
        assists: 0,
        yellow: 0,
        red: 0,
        saves: 0,
      };

      if (event.type === MatchEventType.GOAL) current.goals++;
      if (event.type === MatchEventType.ASSIST) current.assists++;
      if (event.type === MatchEventType.YELLOW_CARD) current.yellow++;
      if (event.type === MatchEventType.RED_CARD) current.red++;
      if (event.type === MatchEventType.SAVE) current.saves++;

      statsMap.set(event.playerId, current);
    });

    const allPlayerIds = new Set([
      ...result.playerUpdates.map((u) => u.playerId),
      ...Array.from(statsMap.keys()),
    ]);

    let updatedCount = 0;

    for (const playerId of allPlayerIds) {
      const player = await this.repos.players.findById(playerId);
      if (!player || !player.teamId) continue;

      const stats = statsMap.get(playerId) || {
        goals: 0,
        assists: 0,
        yellow: 0,
        red: 0,
        saves: 0,
      };

      let cleanSheet = 0;
      let goalsConceded = 0;

      if (player.position === "GK") {
        const isHomeTeam = player.teamId === match.homeTeamId;
        const goalsAgainst = isHomeTeam ? result.awayScore : result.homeScore;

        goalsConceded = goalsAgainst;
        if (goalsAgainst === 0) {
          cleanSheet = 1;
        }
      }

      const existing = await this.repos.competitions.findPlayerStats(
        playerId,
        competitionId,
        seasonId
      );

      if (existing) {
        await this.repos.competitions.updatePlayerStats(existing.id, {
          matches: (existing.matches ?? 0) + 1,
          goals: (existing.goals ?? 0) + stats.goals,
          assists: (existing.assists ?? 0) + stats.assists,
          yellowCards: (existing.yellowCards ?? 0) + stats.yellow,
          redCards: (existing.redCards ?? 0) + stats.red,
          saves: (existing.saves ?? 0) + stats.saves,
          cleanSheets: (existing.cleanSheets ?? 0) + cleanSheet,
          goalsConceded: (existing.goalsConceded ?? 0) + goalsConceded,
          minutesPlayed:
            (existing.minutesPlayed ?? 0) + MATCH_CONFIG.FULL_MATCH_MINUTES,
        });
      } else {
        await this.repos.competitions.createPlayerStats({
          playerId,
          teamId: player.teamId,
          competitionId,
          seasonId,
          matches: 1,
          goals: stats.goals,
          assists: stats.assists,
          yellowCards: stats.yellow,
          redCards: stats.red,
          saves: stats.saves,
          cleanSheets: cleanSheet,
          goalsConceded: goalsConceded,
          minutesPlayed: MATCH_CONFIG.FULL_MATCH_MINUTES,
        });
      }
      updatedCount++;
    }

    this.logger.debug(
      `Estatísticas individuais atualizadas para ${updatedCount} jogadores.`
    );
  }
}
