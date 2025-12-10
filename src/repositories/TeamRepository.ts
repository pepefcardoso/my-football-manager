import { eq } from "drizzle-orm";
import { teams } from "../db/schema";
import { BaseRepository } from "./BaseRepository";

export type TeamSelect = typeof teams.$inferSelect;
export type TeamInsert = typeof teams.$inferInsert;

export class TeamRepository extends BaseRepository {
  async findAll(): Promise<TeamSelect[]> {
    return await this.db.select().from(teams);
  }

  async findById(id: number): Promise<TeamSelect | undefined> {
    const result = await this.db.select().from(teams).where(eq(teams.id, id));
    return result[0];
  }

  async findHumanTeam(): Promise<TeamSelect | undefined> {
    const result = await this.db
      .select()
      .from(teams)
      .where(eq(teams.isHuman, true));
    return result[0];
  }

  async findByIdWithRelations(id: number) {
    return await this.db.query.teams.findFirst({
      where: eq(teams.id, id),
      with: {
        players: true,
        staff: true,
        headCoach: true,
      },
    });
  }

  async update(id: number, data: Partial<TeamInsert>): Promise<void> {
    await this.db.update(teams).set(data).where(eq(teams.id, id));
  }

  async updateBudget(id: number, newBudget: number): Promise<void> {
    await this.db
      .update(teams)
      .set({ budget: newBudget })
      .where(eq(teams.id, id));
  }
}

export const teamRepository = new TeamRepository();
