import { eq, desc } from "drizzle-orm";
import { db } from "../../db/client";
import { transfers } from "../../db/schema";

export type TransferInsert = typeof transfers.$inferInsert;

export class TransferRepository {
  async create(data: TransferInsert): Promise<void> {
    await db.insert(transfers).values(data);
  }

  async findRecent(limit: number = 10) {
    return await db.query.transfers.findMany({
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
    return await db
      .select()
      .from(transfers)
      .where(eq(transfers.playerId, playerId))
      .orderBy(desc(transfers.date));
  }
}

export const transferRepository = new TransferRepository();
