import { eq } from "drizzle-orm";
import { teams } from "../db/schema";
import { db } from "../lib/db";

export type TeamSelect = typeof teams.$inferSelect;
export type TeamInsert = typeof teams.$inferInsert;

export class TeamRepository {
  async findAll(): Promise<TeamSelect[]> {
    return await db.select().from(teams);
  }

  async findById(id: number): Promise<TeamSelect | undefined> {
    const result = await db.select().from(teams).where(eq(teams.id, id));
    return result[0];
  }

  async findHumanTeam(): Promise<TeamSelect | undefined> {
    const result = await db.select().from(teams).where(eq(teams.isHuman, true));
    return result[0];
  }

  async findByIdWithRelations(id: number) {
    return await db.query.teams.findFirst({
      where: eq(teams.id, id),
      with: {
        players: true,
        staff: true,
        headCoach: true,
      },
    });
  }

  async update(id: number, data: Partial<TeamInsert>): Promise<void> {
    await db.update(teams).set(data).where(eq(teams.id, id));
  }

  async updateBudget(id: number, newBudget: number): Promise<void> {
    await db.update(teams).set({ budget: newBudget }).where(eq(teams.id, id));
  }
}

export const teamRepository = new TeamRepository();
