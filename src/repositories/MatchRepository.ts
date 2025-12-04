import { eq, and, or, asc, gte, lte } from "drizzle-orm";
import { matches, matchEvents } from "../db/schema";
import { db } from "../lib/db";

export type MatchSelect = typeof matches.$inferSelect;
export type MatchInsert = typeof matches.$inferInsert;
export type MatchEventInsert = typeof matchEvents.$inferInsert;

export class MatchRepository {
  async findById(id: number): Promise<MatchSelect | undefined> {
    const result = await db.select().from(matches).where(eq(matches.id, id));
    return result[0];
  }

  async findByTeamAndSeason(
    teamId: number,
    seasonId: number
  ): Promise<MatchSelect[]> {
    return await db
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
    return await db
      .select()
      .from(matches)
      .where(and(gte(matches.date, startDate), lte(matches.date, endDate)))
      .orderBy(asc(matches.date));
  }

  async findPendingMatchesByDate(date: string): Promise<MatchSelect[]> {
    return await db
      .select()
      .from(matches)
      .where(and(eq(matches.isPlayed, false), eq(matches.date, date)));
  }

  async updateMatchResult(
    id: number,
    homeScore: number,
    awayScore: number,
    attendance: number,
    ticketRevenue: number
  ): Promise<void> {
    await db
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
      await db.insert(matchEvents).values(events);
    }
  }
}

export const matchRepository = new MatchRepository();
