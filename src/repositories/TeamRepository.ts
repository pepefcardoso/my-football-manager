import { eq } from "drizzle-orm";
import { teams } from "../db/schema";
import { BaseRepository } from "./BaseRepository";
import type { Team, TeamAchievement } from "../domain/models";
import type { GameEventBus } from "../lib/GameEventBus";
import { GameEventType } from "../domain/GameEventTypes";

export class TeamRepository extends BaseRepository {
  private eventBus: GameEventBus | null = null;

  public setEventBus(eventBus: GameEventBus): void {
    this.eventBus = eventBus;
  }

  async findAll(): Promise<Team[]> {
    const result = await this.db.select().from(teams);
    return result as unknown as Team[];
  }

  async findById(id: number): Promise<Team | undefined> {
    const result = await this.db.select().from(teams).where(eq(teams.id, id));
    return result[0] as unknown as Team;
  }

  async findHumanTeam(): Promise<Team | undefined> {
    const result = await this.db
      .select()
      .from(teams)
      .where(eq(teams.isHuman, true));
    return result[0] as unknown as Team;
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

  async update(id: number, data: Partial<Team>): Promise<void> {
    await this.db
      .update(teams)
      .set(data as any)
      .where(eq(teams.id, id));
  }

  async updateBudget(id: number, newBudget: number): Promise<void> {
    await this.db
      .update(teams)
      .set({ budget: newBudget })
      .where(eq(teams.id, id));

    if (this.eventBus) {
      this.eventBus.publish(GameEventType.BUDGET_UPDATED, {
        teamId: id,
        newBudget: newBudget,
      });
    }
  }

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
