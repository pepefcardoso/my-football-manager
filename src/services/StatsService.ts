import type { MatchResult } from "../domain/types";
import { MatchEventType } from "../domain/enums";
import { Logger } from "../lib/Logger";
import type { IRepositoryContainer } from "../repositories/IRepositories";

export class StatsService {
  private readonly logger: Logger;
  private readonly repos: IRepositoryContainer;

  constructor(repositories: IRepositoryContainer) {
    this.repos = repositories;
    this.logger = new Logger("StatsService");
  }

  async processMatchStats(
    matchId: number,
    competitionId: number,
    seasonId: number,
    result: MatchResult
  ): Promise<void> {
    this.logger.info(
      `Processando estatísticas da partida ${matchId} (Comp: ${competitionId})...`
    );

    try {
      const match = await this.repos.matches.findById(matchId);
      if (!match) {
        this.logger.warn(
          `Partida ${matchId} não encontrada. Estatísticas ignoradas.`
        );
        return;
      }

      await this.updatePlayerStats(competitionId, seasonId, result, match);
      this.logger.info(
        `Estatísticas atualizadas com sucesso para a partida ${matchId}.`
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar estatísticas da partida ${matchId}:`,
        error
      );
    }
  }

  private async updatePlayerStats(
    competitionId: number,
    seasonId: number,
    result: MatchResult,
    match: any
  ) {
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
          minutesPlayed: (existing.minutesPlayed ?? 0) + 90,
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
          minutesPlayed: 90,
        });
      }
      updatedCount++;
    }

    this.logger.debug(
      `Estatísticas individuais atualizadas para ${updatedCount} jogadores.`
    );
  }

  async getTopGoalkeepers(
    competitionId: number,
    seasonId: number,
    limit: number = 10
  ) {
    this.logger.debug(
      `Buscando top ${limit} goleiros (Comp: ${competitionId})`
    );
    try {
      return await this.repos.competitions.getTopGoalkeepers(
        competitionId,
        seasonId,
        limit
      );
    } catch (error) {
      this.logger.error("Erro ao buscar top goleiros:", error);
      return [];
    }
  }

  async getTopScorers(
    competitionId: number,
    seasonId: number,
    limit: number = 10
  ) {
    this.logger.debug(
      `Buscando top ${limit} artilheiros (Comp: ${competitionId})`
    );
    try {
      return await this.repos.competitions.getTopScorers(
        competitionId,
        seasonId,
        limit
      );
    } catch (error) {
      this.logger.error("Erro ao buscar top artilheiros:", error);
      return [];
    }
  }

  async getPlayerStats(
    playerId: number,
    competitionId: number,
    seasonId: number
  ) {
    this.logger.debug(
      `Buscando estatísticas do jogador ${playerId} na competição ${competitionId}...`
    );

    try {
      return await this.repos.competitions.findPlayerStats(
        playerId,
        competitionId,
        seasonId
      );
    } catch (error) {
      this.logger.error(
        `Erro ao buscar estatísticas do jogador ${playerId}:`,
        error
      );
      return null;
    }
  }
}
