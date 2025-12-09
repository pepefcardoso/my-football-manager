import { playerRepository } from "../repositories/PlayerRepository";
import { db } from "../lib/db";
import { playerCompetitionStats } from "../db/schema";
import { eq, and } from "drizzle-orm";
import type { MatchResult } from "../domain/types";
import { MatchEventType } from "../domain/enums";
import { matchRepository } from "../repositories/MatchRepository";
import { Logger } from "../lib/Logger";

export class StatsService {
  private logger: Logger;

  constructor() {
    this.logger = new Logger("StatsService");
  }

  /**
   * Atualiza tabela e estatísticas de jogadores após uma partida
   */
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
      const match = await matchRepository.findById(matchId);
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
      const player = await playerRepository.findById(playerId);
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

      const existing = await db
        .select()
        .from(playerCompetitionStats)
        .where(
          and(
            eq(playerCompetitionStats.playerId, playerId),
            eq(playerCompetitionStats.competitionId, competitionId),
            eq(playerCompetitionStats.seasonId, seasonId)
          )
        )
        .get();

      if (existing) {
        await db
          .update(playerCompetitionStats)
          .set({
            matches: (existing.matches ?? 0) + 1,
            goals: (existing.goals ?? 0) + stats.goals,
            assists: (existing.assists ?? 0) + stats.assists,
            yellowCards: (existing.yellowCards ?? 0) + stats.yellow,
            redCards: (existing.redCards ?? 0) + stats.red,
            saves: (existing.saves ?? 0) + stats.saves,
            cleanSheets: (existing.cleanSheets ?? 0) + cleanSheet,
            goalsConceded: (existing.goalsConceded ?? 0) + goalsConceded,
            minutesPlayed: (existing.minutesPlayed ?? 0) + 90,
          })
          .where(eq(playerCompetitionStats.id, existing.id));
      } else {
        await db.insert(playerCompetitionStats).values({
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
      return await db.query.playerCompetitionStats.findMany({
        where: and(
          eq(playerCompetitionStats.competitionId, competitionId),
          eq(playerCompetitionStats.seasonId, seasonId)
        ),
        orderBy: (stats, { desc }) => [
          desc(stats.cleanSheets),
          desc(stats.saves),
        ],
        limit: limit,
        with: {
          // Relações seriam carregadas aqui
        },
      });
    } catch (error) {
      this.logger.error("Erro ao buscar top goleiros:", error);
      return [];
    }
  }

  /**
   * Retorna os artilheiros de uma competição
   */
  async getTopScorers(
    competitionId: number,
    seasonId: number,
    limit: number = 10
  ) {
    this.logger.debug(
      `Buscando top ${limit} artilheiros (Comp: ${competitionId})`
    );
    try {
      return await db.query.playerCompetitionStats.findMany({
        where: and(
          eq(playerCompetitionStats.competitionId, competitionId),
          eq(playerCompetitionStats.seasonId, seasonId)
        ),
        orderBy: (stats, { desc }) => [desc(stats.goals), desc(stats.assists)],
        limit: limit,
        with: {
          // player: true
        },
      });
    } catch (error) {
      this.logger.error("Erro ao buscar top artilheiros:", error);
      return [];
    }
  }
}

export const statsService = new StatsService();
