import { eq, and } from "drizzle-orm";
import { db } from "../../db/client";
import { competitions, competitionStandings } from "../../db/schema";

export type CompetitionSelect = typeof competitions.$inferSelect;
export type StandingSelect = typeof competitionStandings.$inferSelect;

export class CompetitionRepository {
  async findAll(): Promise<CompetitionSelect[]> {
    return await db.select().from(competitions);
  }

  async findByCountry(country: string): Promise<CompetitionSelect[]> {
    return await db
      .select()
      .from(competitions)
      .where(eq(competitions.country, country));
  }

  async getStandings(competitionId: number, seasonId: number) {
    return await db.query.competitionStandings.findMany({
      where: and(
        eq(competitionStandings.competitionId, competitionId),
        eq(competitionStandings.seasonId, seasonId)
      ),
      orderBy: (standings, { desc }) => [
        desc(standings.points),
        desc(standings.wins),
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
    const existing = await db
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
      await db.insert(competitionStandings).values({
        competitionId,
        seasonId,
        teamId,
        ...data,
      } as any);
    } else {
      await db
        .update(competitionStandings)
        .set(data)
        .where(eq(competitionStandings.id, existing[0].id));
    }
  }
}

export const competitionRepository = new CompetitionRepository();
