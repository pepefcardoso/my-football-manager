import { eq, and, desc } from "drizzle-orm";
import { scoutingReports } from "../db/schema";
import { db } from "../lib/db";

export type ScoutingReportInsert = typeof scoutingReports.$inferInsert;
export type ScoutingReportSelect = typeof scoutingReports.$inferSelect;

export class ScoutingRepository {
  /**
   * Encontra um relatório específico de um jogador para um time
   */
  async findByPlayerAndTeam(
    playerId: number,
    teamId: number
  ): Promise<ScoutingReportSelect | undefined> {
    const result = await db
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

  /**
   * Lista todos os relatórios de um time (Lista de Observação)
   */
  async findByTeam(teamId: number) {
    return await db.query.scoutingReports.findMany({
      where: eq(scoutingReports.teamId, teamId),
      with: {
        player: true,
        scout: true,
      },
      orderBy: [desc(scoutingReports.date)],
    });
  }

  /**
   * Cria ou atualiza um relatório
   */
  async upsert(data: ScoutingReportInsert): Promise<void> {
    const existing = await this.findByPlayerAndTeam(
      data.playerId!,
      data.teamId!
    );

    if (existing) {
      await db
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
      await db.insert(scoutingReports).values(data);
    }
  }

  /**
   * Busca relatórios ativos (que ainda não chegaram a 100%) para simulação diária
   */
  async findActiveReports(): Promise<ScoutingReportSelect[]> {
    return await db.select().from(scoutingReports);
  }
}

export const scoutingRepository = new ScoutingRepository();
