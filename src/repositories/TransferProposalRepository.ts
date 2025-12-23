import { eq, and, lt, desc, or } from "drizzle-orm";
import { transferProposals } from "../db/schema";
import { BaseRepository } from "./BaseRepository";
import { TransferStatus } from "../domain/enums";

export type TransferProposalInsert = typeof transferProposals.$inferInsert;
export type TransferProposalSelect = typeof transferProposals.$inferSelect;

export class TransferProposalRepository extends BaseRepository {
  async create(data: TransferProposalInsert): Promise<number> {
    const result = await this.db
      .insert(transferProposals)
      .values(data)
      .returning({ id: transferProposals.id });

    return result[0].id;
  }

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

  async update(
    id: number,
    data: Partial<TransferProposalInsert>
  ): Promise<void> {
    await this.db
      .update(transferProposals)
      .set(data)
      .where(eq(transferProposals.id, id));
  }

  async delete(id: number): Promise<void> {
    await this.db.delete(transferProposals).where(eq(transferProposals.id, id));
  }

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

  async findWhereTeamIsBuyer(teamId: number) {
    return await this.db.query.transferProposals.findMany({
      where: eq(transferProposals.toTeamId, teamId),
      orderBy: [desc(transferProposals.createdAt)],
      with: {
        player: true,
        fromTeam: true,
      },
    });
  }

  async findWhereTeamIsSeller(teamId: number) {
    return await this.db.query.transferProposals.findMany({
      where: eq(transferProposals.fromTeamId, teamId),
      orderBy: [desc(transferProposals.responseDeadline)],
      with: {
        player: true,
        toTeam: true,
      },
    });
  }
}

export const transferProposalRepository = new TransferProposalRepository();
