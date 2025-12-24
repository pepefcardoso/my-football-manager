import { eq, and, or, asc, gte, lte } from "drizzle-orm";
import { matches, matchEvents, matchTactics } from "../db/schema";
import { BaseRepository } from "./BaseRepository";
import type { TeamLineup } from "../domain/types";

export type MatchSelect = typeof matches.$inferSelect;
export type MatchInsert = typeof matches.$inferInsert;
export type MatchEventInsert = typeof matchEvents.$inferInsert;
export type MatchEventSelect = typeof matchEvents.$inferSelect;

export class MatchRepository extends BaseRepository {
  async findById(id: number): Promise<MatchSelect | undefined> {
    const result = await this.db
      .select()
      .from(matches)
      .where(eq(matches.id, id));
    return result[0];
  }

  async findByTeamAndSeason(
    teamId: number,
    seasonId: number
  ): Promise<MatchSelect[]> {
    return await this.db
      .select()
      .from(matches)
      .where(
        and(
          eq(matches.seasonId, seasonId),
          or(eq(matches.homeTeamId, teamId), eq(matches.awayTeamId, teamId))
        )
      )
      .orderBy(asc(matches.date));
  }

  async findByDateRange(
    startDate: string,
    endDate: string
  ): Promise<MatchSelect[]> {
    return await this.db
      .select()
      .from(matches)
      .where(and(gte(matches.date, startDate), lte(matches.date, endDate)))
      .orderBy(asc(matches.date));
  }

  async findPendingMatchesByDate(date: string): Promise<MatchSelect[]> {
    return await this.db
      .select()
      .from(matches)
      .where(and(eq(matches.isPlayed, false), eq(matches.date, date)));
  }

  async findEventsByMatchId(matchId: number): Promise<MatchEventSelect[]> {
    return await this.db
      .select()
      .from(matchEvents)
      .where(eq(matchEvents.matchId, matchId))
      .orderBy(asc(matchEvents.minute));
  }

  async updateMatchResult(
    id: number,
    homeScore: number,
    awayScore: number,
    attendance: number,
    ticketRevenue: number
  ): Promise<void> {
    await this.db
      .update(matches)
      .set({
        homeScore,
        awayScore,
        isPlayed: true,
        attendance,
        ticketRevenue,
      })
      .where(eq(matches.id, id));
  }

  async createMatchEvents(events: MatchEventInsert[]): Promise<void> {
    if (events.length > 0) {
      await this.db.insert(matchEvents).values(events);
    }
  }

  async createMany(matchesData: MatchInsert[]): Promise<void> {
    if (matchesData.length === 0) return;
    await this.db.insert(matches).values(matchesData);
  }

  async upsertMatchTactics(
    matchId: number,
    teamId: number,
    isHome: boolean,
    lineup: TeamLineup
  ): Promise<void> {
    const existing = await this.db
      .select()
      .from(matchTactics)
      .where(
        and(eq(matchTactics.matchId, matchId), eq(matchTactics.teamId, teamId))
      )
      .limit(1);

    const dataToSave = {
      matchId,
      teamId,
      isHome,
      formation: lineup.formation,
      gameStyle: lineup.tactics.style,
      marking: lineup.tactics.marking,
      mentality: lineup.tactics.mentality,
      passingDirectness: lineup.tactics.passingDirectness,
      startingLineup: lineup.starters,
      bench: lineup.bench,
    };

    if (existing.length > 0) {
      await this.db
        .update(matchTactics)
        .set(dataToSave)
        .where(eq(matchTactics.id, existing[0].id));
    } else {
      await this.db.insert(matchTactics).values(dataToSave);
    }
  }

  async findMatchTactics(
    matchId: number,
    teamId: number
  ): Promise<any | undefined> {
    const result = await this.db
      .select()
      .from(matchTactics)
      .where(
        and(eq(matchTactics.matchId, matchId), eq(matchTactics.teamId, teamId))
      )
      .limit(1);

    return result[0];
  }
}

export const matchRepository = new MatchRepository();
