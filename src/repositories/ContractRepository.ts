import { eq, and } from "drizzle-orm";
import { playerContracts } from "../db/schema";
import { BaseRepository } from "./BaseRepository";

export type ContractSelect = typeof playerContracts.$inferSelect;
export type ContractInsert = typeof playerContracts.$inferInsert;

export class ContractRepository extends BaseRepository {
  async findActiveByTeamId(teamId: number): Promise<ContractSelect[]> {
    return await this.db
      .select()
      .from(playerContracts)
      .where(
        and(
          eq(playerContracts.teamId, teamId),
          eq(playerContracts.status, "active")
        )
      );
  }

  async findExpiring(date: string): Promise<ContractSelect[]> {
    return await this.db
      .select()
      .from(playerContracts)
      .where(
        and(
          eq(playerContracts.endDate, date),
          eq(playerContracts.status, "active")
        )
      );
  }

  async findActiveByPlayerId(
    playerId: number
  ): Promise<ContractSelect | undefined> {
    const result = await this.db
      .select()
      .from(playerContracts)
      .where(
        and(
          eq(playerContracts.playerId, playerId),
          eq(playerContracts.status, "active")
        )
      )
      .limit(1);

    return result[0];
  }

  async updateStatus(contractId: number, status: string): Promise<void> {
    await this.db
      .update(playerContracts)
      .set({ status })
      .where(eq(playerContracts.id, contractId));
  }

  async update(id: number, data: Partial<ContractInsert>): Promise<void> {
    await this.db
      .update(playerContracts)
      .set(data)
      .where(eq(playerContracts.id, id));
  }

  async updateTerms(
    contractId: number,
    wage: number,
    endDate: string,
    releaseClause?: number
  ): Promise<void> {
    const data: Partial<ContractInsert> = { wage, endDate };
    if (releaseClause !== undefined) {
      data.releaseClause = releaseClause;
    }
    await this.update(contractId, data);
  }

  async create(data: ContractInsert): Promise<number> {
    const result = await this.db
      .insert(playerContracts)
      .values(data)
      .returning({ id: playerContracts.id });
    return result[0].id;
  }
}

export const contractRepository = new ContractRepository();
