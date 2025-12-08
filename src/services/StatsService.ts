import { playerRepository } from "../repositories/PlayerRepository";
import { db } from "../lib/db";
import { playerCompetitionStats } from "../db/schema";
import { eq, and } from "drizzle-orm";
import type { MatchResult } from "../domain/types";
import { MatchEventType } from "../domain/enums";

export class StatsService {
  /**
   * Atualiza tabela e estatísticas de jogadores após uma partida
   */
  async processMatchStats(
    _matchId: number,
    competitionId: number,
    seasonId: number,
    result: MatchResult
  ): Promise<void> {
    // TODO: Mover lógica do MatchService.updateStandings para cá

    await this.updatePlayerStats(competitionId, seasonId, result);
  }

  private async updatePlayerStats(
    competitionId: number,
    seasonId: number,
    result: MatchResult
  ) {
    const events = result.events;

    const statsMap = new Map<
      number,
      { goals: number; assists: number; yellow: number; red: number }
    >();

    events.forEach((event) => {
      if (!event.playerId) return;

      const current = statsMap.get(event.playerId) || {
        goals: 0,
        assists: 0,
        yellow: 0,
        red: 0,
      };

      if (event.type === MatchEventType.GOAL) current.goals++;
      if (event.type === MatchEventType.ASSIST) current.assists++;
      if (event.type === MatchEventType.YELLOW_CARD) current.yellow++;
      if (event.type === MatchEventType.RED_CARD) current.red++;

      statsMap.set(event.playerId, current);
    });

    for (const [playerId, stats] of statsMap.entries()) {
      const player = await playerRepository.findById(playerId);
      if (!player || !player.teamId) continue;

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
        });
      }
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
  }
}

export const statsService = new StatsService();
