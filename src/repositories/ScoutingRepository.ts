import { eq, and, desc } from "drizzle-orm";
import { scoutingReports } from "../db/schema";
import { BaseRepository } from "./BaseRepository";

export type ScoutingReportInsert = typeof scoutingReports.$inferInsert;
export type ScoutingReportSelect = typeof scoutingReports.$inferSelect;

export class ScoutingRepository extends BaseRepository {
  async findByPlayerAndTeam(
    playerId: number,
    teamId: number
  ): Promise<ScoutingReportSelect | undefined> {
    const result = await this.db
      .select()
      .from(scoutingReports)
      .where(
        and(
          eq(scoutingReports.playerId, playerId),
          eq(scoutingReports.teamId, teamId)
        )
      );
    return result[0];
  }

  async findByTeam(teamId: number) {
    return await this.db.query.scoutingReports.findMany({
      where: eq(scoutingReports.teamId, teamId),
      with: {
        player: true,
        scout: true,
      },
      orderBy: [desc(scoutingReports.date)],
    });
  }

  async upsert(data: ScoutingReportInsert): Promise<void> {
    const existing = await this.findByPlayerAndTeam(
      data.playerId!,
      data.teamId!
    );

    if (existing) {
      await this.db
        .update(scoutingReports)
        .set({
          ...data,
          progress: Math.min(
            100,
            (existing.progress || 0) + (data.progress || 0)
          ),
        })
        .where(eq(scoutingReports.id, existing.id));
    } else {
      await this.db.insert(scoutingReports).values(data);
    }
  }

  async findActiveReports(): Promise<ScoutingReportSelect[]> {
    return await this.db.select().from(scoutingReports);
  }
}

export const scoutingRepository = new ScoutingRepository();
