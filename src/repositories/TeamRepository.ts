import { eq } from "drizzle-orm";
import { teams } from "../db/schema";
import { BaseRepository } from "./BaseRepository";
import type { TeamAchievement } from "../domain/models";

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

  /**
   * Adiciona uma conquista (título ou posição relevante) ao histórico do clube.
   * Recupera o histórico atual, adiciona o novo item e persiste.
   * * @param teamId ID do time
   * @param achievement Objeto contendo detalhes da conquista
   */
  async addAchievement(
    teamId: number,
    achievement: TeamAchievement
  ): Promise<void> {
    const team = await this.findById(teamId);

    if (!team) {
      throw new Error(
        `TeamRepository: Time ${teamId} não encontrado ao adicionar conquista.`
      );
    }

    const currentHistory = team.history || [];
    const newHistory = [...currentHistory, achievement];

    await this.db
      .update(teams)
      .set({ history: newHistory })
      .where(eq(teams.id, teamId));
  }
}

export const teamRepository = new TeamRepository();
