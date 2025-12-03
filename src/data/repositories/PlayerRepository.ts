import { eq, and } from "drizzle-orm";
import { db } from "../../db/client";
import { players } from "../../db/schema";

export type PlayerSelect = typeof players.$inferSelect;
export type PlayerInsert = typeof players.$inferInsert;

export class PlayerRepository {
  async findById(id: number): Promise<PlayerSelect | undefined> {
    const result = await db.select().from(players).where(eq(players.id, id));
    return result[0];
  }

  async findByTeamId(teamId: number): Promise<PlayerSelect[]> {
    return await db.select().from(players).where(eq(players.teamId, teamId));
  }

  async findFreeAgents(): Promise<PlayerSelect[]> {
    return await db
      .select()
      .from(players)
      .where(eq(players.teamId, null as any));
  }

  async findYouthAcademy(teamId: number): Promise<PlayerSelect[]> {
    return await db
      .select()
      .from(players)
      .where(and(eq(players.teamId, teamId), eq(players.isYouth, true)));
  }

  async create(player: PlayerInsert): Promise<number> {
    const result = await db
      .insert(players)
      .values(player)
      .returning({ id: players.id });
    return result[0].id;
  }

  async update(id: number, data: Partial<PlayerInsert>): Promise<void> {
    await db.update(players).set(data).where(eq(players.id, id));
  }

  async updateConditionBatch(
    updates: { id: number; energy: number; fitness: number }[]
  ): Promise<void> {
    await db.transaction(async (tx) => {
      for (const update of updates) {
        await tx
          .update(players)
          .set({ energy: update.energy, fitness: update.fitness })
          .where(eq(players.id, update.id));
      }
    });
  }
}

export const playerRepository = new PlayerRepository();
