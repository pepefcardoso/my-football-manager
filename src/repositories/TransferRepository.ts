import { eq, desc } from "drizzle-orm";
import { transfers } from "../db/schema";
import { BaseRepository } from "./BaseRepository";

export type TransferInsert = typeof transfers.$inferInsert;

export class TransferRepository extends BaseRepository {
  /**
   * Regista uma nova transferência no banco de dados.
   */
  async create(data: TransferInsert): Promise<void> {
    await this.db.insert(transfers).values(data);
  }

  /**
   * Busca as transferências mais recentes (geral), independentemente da temporada.
   * Útil para o feed de notícias ou dashboard.
   */
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

  /**
   * Busca o histórico de transferências de um jogador específico.
   */
  async findByPlayerId(playerId: number) {
    return await this.db
      .select()
      .from(transfers)
      .where(eq(transfers.playerId, playerId))
      .orderBy(desc(transfers.date));
  }

  /**
   * Busca todas as transferências ocorridas numa temporada específica.
   * Útil para consultar o histórico e arquivos de temporadas passadas.
   * * @param seasonId O ID da temporada a consultar.
   */
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
