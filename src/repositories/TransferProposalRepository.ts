import { eq, and, lt, desc, or } from "drizzle-orm";
import { transferProposals } from "../db/schema";
import { BaseRepository } from "./BaseRepository";
import { TransferStatus } from "../domain/enums";

export type TransferProposalInsert = typeof transferProposals.$inferInsert;
export type TransferProposalSelect = typeof transferProposals.$inferSelect;

export class TransferProposalRepository extends BaseRepository {
  /**
   * Cria uma nova proposta de transferência.
   * @param data Dados da proposta
   * @returns ID da nova proposta
   */
  async create(data: TransferProposalInsert): Promise<number> {
    const result = await this.db
      .insert(transferProposals)
      .values(data)
      .returning({ id: transferProposals.id });

    return result[0].id;
  }

  /**
   * Busca uma proposta pelo ID, incluindo relacionamentos importantes.
   */
  async findById(id: number) {
    return await this.db.query.transferProposals.findFirst({
      where: eq(transferProposals.id, id),
      with: {
        player: true,
        fromTeam: true,
        toTeam: true,
      },
    });
  }

  /**
   * Atualiza os dados de uma proposta existente.
   */
  async update(
    id: number,
    data: Partial<TransferProposalInsert>
  ): Promise<void> {
    await this.db
      .update(transferProposals)
      .set(data)
      .where(eq(transferProposals.id, id));
  }

  /**
   * Remove (deleta) uma proposta do banco de dados.
   * Cuidado: Geralmente preferimos mudar o status para CANCELLED/WITHDRAWN.
   */
  async delete(id: number): Promise<void> {
    await this.db.delete(transferProposals).where(eq(transferProposals.id, id));
  }

  /**
   * Busca todas as propostas enviadas por um time.
   */
  async findSentByTeam(teamId: number) {
    return await this.db.query.transferProposals.findMany({
      where: eq(transferProposals.fromTeamId, teamId),
      orderBy: [desc(transferProposals.createdAt)],
      with: {
        player: true,
        toTeam: true,
      },
    });
  }

  /**
   * Busca todas as propostas recebidas por um time.
   */
  async findReceivedByTeam(teamId: number) {
    return await this.db.query.transferProposals.findMany({
      where: eq(transferProposals.toTeamId, teamId),
      orderBy: [desc(transferProposals.responseDeadline)],
      with: {
        player: true,
        fromTeam: true,
      },
    });
  }

  /**
   * Verifica se já existe uma proposta ativa (pendente ou negociando)
   * entre dois times para um jogador específico.
   * Útil para evitar duplicação de ofertas.
   */
  async findActiveProposal(
    playerId: number,
    fromTeamId: number,
    toTeamId: number
  ): Promise<TransferProposalSelect | undefined> {
    const result = await this.db
      .select()
      .from(transferProposals)
      .where(
        and(
          eq(transferProposals.playerId, playerId),
          eq(transferProposals.fromTeamId, fromTeamId),
          eq(transferProposals.toTeamId, toTeamId),
          or(
            eq(transferProposals.status, TransferStatus.PENDING),
            eq(transferProposals.status, TransferStatus.NEGOTIATING)
          )
        )
      )
      .limit(1);

    return result[0];
  }

  /**
   * Busca todas as propostas ativas relacionadas a um jogador.
   * Útil para a IA decidir se entra numa "Leilão" (Bidding War).
   */
  async findActiveByPlayer(playerId: number) {
    return await this.db.query.transferProposals.findMany({
      where: and(
        eq(transferProposals.playerId, playerId),
        or(
          eq(transferProposals.status, TransferStatus.PENDING),
          eq(transferProposals.status, TransferStatus.NEGOTIATING)
        )
      ),
      with: {
        fromTeam: true,
      },
    });
  }

  /**
   * Expira propostas cujo prazo de resposta passou da data atual.
   * Muda o status de 'pending'/'negotiating' para 'withdrawn' (se não respondida).
   * * @param currentDate Data atual da simulação (YYYY-MM-DD)
   * @returns Número de propostas expiradas
   */
  async expireProposals(currentDate: string): Promise<number> {
    const expired = await this.db
      .select({ id: transferProposals.id })
      .from(transferProposals)
      .where(
        and(
          or(
            eq(transferProposals.status, TransferStatus.PENDING),
            eq(transferProposals.status, TransferStatus.NEGOTIATING)
          ),
          lt(transferProposals.responseDeadline, currentDate)
        )
      );

    if (expired.length === 0) return 0;

    await this.db
      .update(transferProposals)
      .set({
        status: TransferStatus.WITHDRAWN,
        rejectionReason: "Prazo de resposta expirado",
      })
      .where(
        and(
          or(
            eq(transferProposals.status, TransferStatus.PENDING),
            eq(transferProposals.status, TransferStatus.NEGOTIATING)
          ),
          lt(transferProposals.responseDeadline, currentDate)
        )
      );

    return expired.length;
  }
}

export const transferProposalRepository = new TransferProposalRepository();
