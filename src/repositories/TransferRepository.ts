import { eq, desc } from "drizzle-orm";
import { transfers } from "../db/schema";
import { BaseRepository } from "./BaseRepository";

export type TransferInsert = typeof transfers.$inferInsert;

export class TransferRepository extends BaseRepository {
  async create(data: TransferInsert): Promise<void> {
    await this.db.insert(transfers).values(data);
  }

  async findRecent(limit: number = 10) {
    return await this.db.query.transfers.findMany({
      orderBy: [desc(transfers.date)],
      limit: limit,
      with: {
        player: true,
        fromTeam: true,
        toTeam: true,
      },
    });
  }

  async findByPlayerId(playerId: number) {
    return await this.db
      .select()
      .from(transfers)
      .where(eq(transfers.playerId, playerId))
      .orderBy(desc(transfers.date));
  }

  async findHistoryBySeason(seasonId: number) {
    return await this.db.query.transfers.findMany({
      where: eq(transfers.seasonId, seasonId),
      orderBy: [desc(transfers.date)],
      with: {
        player: true,
        fromTeam: true,
        toTeam: true,
      },
    });
  }
}

export const transferRepository = new TransferRepository();
