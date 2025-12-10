import { eq, and, sql, or, desc } from "drizzle-orm";
import {
  competitions,
  competitionStandings,
  matches,
  playerCompetitionStats,
} from "../db/schema";
import { BaseRepository } from "./BaseRepository";
import type { PlayerCompetitionStats } from "./IRepositories";

export type CompetitionSelect = typeof competitions.$inferSelect;
export type StandingSelect = typeof competitionStandings.$inferSelect;

export class CompetitionRepository extends BaseRepository {
  async findAll(): Promise<CompetitionSelect[]> {
    return await this.db.select().from(competitions);
  }

  async findByCountry(country: string): Promise<CompetitionSelect[]> {
    return await this.db
      .select()
      .from(competitions)
      .where(eq(competitions.country, country));
  }

  async getStandings(competitionId: number, seasonId: number) {
    return await this.db.query.competitionStandings.findMany({
      where: and(
        eq(competitionStandings.competitionId, competitionId),
        eq(competitionStandings.seasonId, seasonId)
      ),
      orderBy: (standings, { desc }) => [
        desc(standings.points),
        desc(standings.wins),
        desc(sql`(${standings.goalsFor} - ${standings.goalsAgainst})`),
        desc(standings.goalsFor),
      ],
      with: {
        team: true,
      },
    });
  }

  async updateStanding(
    competitionId: number,
    seasonId: number,
    teamId: number,
    data: Partial<StandingSelect>
  ): Promise<void> {
    const existing = await this.db
      .select()
      .from(competitionStandings)
      .where(
        and(
          eq(competitionStandings.competitionId, competitionId),
          eq(competitionStandings.seasonId, seasonId),
          eq(competitionStandings.teamId, teamId)
        )
      );

    if (existing.length === 0) {
      await this.db.insert(competitionStandings).values({
        competitionId,
        seasonId,
        teamId,
        ...data,
      } as any);
    } else {
      await this.db
        .update(competitionStandings)
        .set(data)
        .where(eq(competitionStandings.id, existing[0].id));
    }
  }

  async getTeamForm(
    teamId: number,
    competitionId: number,
    seasonId: number
  ): Promise<("W" | "D" | "L")[]> {
    const lastMatches = await this.db
      .select()
      .from(matches)
      .where(
        and(
          eq(matches.competitionId, competitionId),
          eq(matches.seasonId, seasonId),
          eq(matches.isPlayed, true),
          or(eq(matches.homeTeamId, teamId), eq(matches.awayTeamId, teamId))
        )
      )
      .orderBy(desc(matches.date))
      .limit(5);

    return lastMatches.map((m) => {
      const isHome = m.homeTeamId === teamId;
      const teamScore = isHome ? m.homeScore || 0 : m.awayScore || 0;
      const oppScore = isHome ? m.awayScore || 0 : m.homeScore || 0;

      if (teamScore > oppScore) return "W";
      if (teamScore < oppScore) return "L";
      return "D";
    });
  }

  async findPlayerStats(
    playerId: number,
    competitionId: number,
    seasonId: number
  ): Promise<PlayerCompetitionStats | undefined> {
    const result = await this.db
      .select()
      .from(playerCompetitionStats)
      .where(
        and(
          eq(playerCompetitionStats.playerId, playerId),
          eq(playerCompetitionStats.competitionId, competitionId),
          eq(playerCompetitionStats.seasonId, seasonId)
        )
      )
      .limit(1);

    return result[0] as PlayerCompetitionStats | undefined;
  }

  async createPlayerStats(
    data: Partial<PlayerCompetitionStats>
  ): Promise<void> {
    await this.db.insert(playerCompetitionStats).values(data as any);
  }

  async updatePlayerStats(
    id: number,
    data: Partial<PlayerCompetitionStats>
  ): Promise<void> {
    await this.db
      .update(playerCompetitionStats)
      .set(data as any)
      .where(eq(playerCompetitionStats.id, id));
  }

  async getTopScorers(
    competitionId: number,
    seasonId: number,
    limit: number = 10
  ): Promise<any[]> {
    return await this.db.query.playerCompetitionStats.findMany({
      where: and(
        eq(playerCompetitionStats.competitionId, competitionId),
        eq(playerCompetitionStats.seasonId, seasonId)
      ),
      orderBy: (stats, { desc }) => [desc(stats.goals), desc(stats.assists)],
      limit: limit,
      with: {
        // Relações implícitas se configuradas no schema relations
      },
    });
  }

  async getTopGoalkeepers(
    competitionId: number,
    seasonId: number,
    limit: number = 10
  ): Promise<any[]> {
    return await this.db.query.playerCompetitionStats.findMany({
      where: and(
        eq(playerCompetitionStats.competitionId, competitionId),
        eq(playerCompetitionStats.seasonId, seasonId)
      ),
      orderBy: (stats, { desc }) => [
        desc(stats.cleanSheets),
        desc(stats.saves),
      ],
      limit: limit,
    });
  }
}

export const competitionRepository = new CompetitionRepository();
