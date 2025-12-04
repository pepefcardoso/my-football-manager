import { eq, and } from "drizzle-orm";
import { db } from "../db/client";
import { financialRecords } from "../db/schema";

export type FinancialRecordInsert = typeof financialRecords.$inferInsert;

export class FinancialRepository {
  async addRecord(record: FinancialRecordInsert): Promise<void> {
    await db.insert(financialRecords).values(record);
  }

  async findByTeamAndSeason(teamId: number, seasonId: number) {
    return await db
      .select()
      .from(financialRecords)
      .where(
        and(
          eq(financialRecords.teamId, teamId),
          eq(financialRecords.seasonId, seasonId)
        )
      );
  }

  async getBalance(teamId: number, seasonId: number): Promise<number> {
    const records = await this.findByTeamAndSeason(teamId, seasonId);

    let balance = 0;
    for (const record of records) {
      if (record.type === "income") balance += record.amount;
      else balance -= record.amount;
    }

    return balance;
  }
}

export const financialRepository = new FinancialRepository();
