import { eq, and, lt, desc } from "drizzle-orm";
import { clubInterests } from "../db/schema";
import { BaseRepository } from "./BaseRepository";

export type ClubInterestInsert = typeof clubInterests.$inferInsert;
export type ClubInterestSelect = typeof clubInterests.$inferSelect;

export class ClubInterestRepository extends BaseRepository {
  /**
   * Adiciona ou atualiza o interesse de um clube num jogador.
   * Utiliza a lógica de "Upsert": verifica se já existe para decidir entre insert ou update.
   * * @param data Dados do interesse (teamId, playerId, nível, prioridade, etc)
   */
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

  /**
   * Busca todos os interesses ativos relacionados a um jogador específico.
   * Útil para saber se haverá "leilão" (bidding war) pelo jogador.
   */
  async findByPlayerId(playerId: number) {
    return await this.db.query.clubInterests.findMany({
      where: eq(clubInterests.playerId, playerId),
      orderBy: [desc(clubInterests.priority), desc(clubInterests.dateAdded)],
      with: {
        team: true,
      },
    });
  }

  /**
   * Busca a "Shortlist" (Alvos de Transferência) de um clube.
   */
  async findByTeamId(teamId: number) {
    return await this.db.query.clubInterests.findMany({
      where: eq(clubInterests.teamId, teamId),
      orderBy: [desc(clubInterests.priority)],
      with: {
        player: true,
      },
    });
  }

  /**
   * Remove o interesse de um clube num jogador (ex: jogador comprado por outro ou rejeitado).
   */
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

  /**
   * Limpeza de manutenção: Remove interesses que não foram atualizados desde uma certa data.
   * Isso simula que o clube "esqueceu" ou "perdeu o interesse" no jogador com o tempo.
   * * @param dateThreshold Data limite (ex: interesses anteriores a 2024-01-01)
   * @returns Número de registos removidos
   */
  async deleteOlderThan(dateThreshold: string): Promise<number> {
    const result = await this.db
      .delete(clubInterests)
      .where(lt(clubInterests.dateAdded, dateThreshold))
      .returning({ id: clubInterests.id });

    return result.length;
  }
}

export const clubInterestRepository = new ClubInterestRepository();
