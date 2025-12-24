import { eq, and, lt, desc } from "drizzle-orm";
import { clubInterests } from "../db/schema";
import { BaseRepository } from "./BaseRepository";

export type ClubInterestInsert = typeof clubInterests.$inferInsert;
export type ClubInterestSelect = typeof clubInterests.$inferSelect;

export class ClubInterestRepository extends BaseRepository {
  async upsert(data: ClubInterestInsert): Promise<void> {
    const existing = await this.db.query.clubInterests.findFirst({
      where: and(
        eq(clubInterests.teamId, data.teamId),
        eq(clubInterests.playerId, data.playerId)
      ),
    });

    if (existing) {
      await this.db
        .update(clubInterests)
        .set({
          interestLevel: data.interestLevel,
          priority: data.priority,
          maxFeeWillingToPay: data.maxFeeWillingToPay,
          dateAdded: data.dateAdded,
        })
        .where(eq(clubInterests.id, existing.id));
    } else {
      await this.db.insert(clubInterests).values(data);
    }
  }

  async findByPlayerId(playerId: number) {
    return await this.db.query.clubInterests.findMany({
      where: eq(clubInterests.playerId, playerId),
      orderBy: [desc(clubInterests.priority), desc(clubInterests.dateAdded)],
      with: {
        team: true,
      },
    });
  }

  async findByTeamId(teamId: number) {
    return await this.db.query.clubInterests.findMany({
      where: eq(clubInterests.teamId, teamId),
      orderBy: [desc(clubInterests.priority)],
      with: {
        player: true,
      },
    });
  }

  async remove(teamId: number, playerId: number): Promise<void> {
    await this.db
      .delete(clubInterests)
      .where(
        and(
          eq(clubInterests.teamId, teamId),
          eq(clubInterests.playerId, playerId)
        )
      );
  }

  async deleteOlderThan(dateThreshold: string): Promise<number> {
    const result = await this.db
      .delete(clubInterests)
      .where(lt(clubInterests.dateAdded, dateThreshold))
      .returning({ id: clubInterests.id });

    return result.length;
  }
}

export const clubInterestRepository = new ClubInterestRepository();
