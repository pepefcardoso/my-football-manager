import { BaseService } from "../BaseService";
import type { IRepositoryContainer } from "../../repositories/IRepositories";
import { playerContracts } from "../../db/schema";
import { eq, and } from "drizzle-orm";
import { db } from "../../lib/db";

export interface MonthlyWageData {
  playerWages: number;
  staffWages: number;
  total: number;
  playerCount: number;
  staffCount: number;
}

export class WageCalculator extends BaseService {
  constructor(repositories: IRepositoryContainer) {
    super(repositories, "WageCalculator");
  }

  async calculateMonthlyWages(teamId: number): Promise<MonthlyWageData> {
    const activeContracts = await db
      .select()
      .from(playerContracts)
      .where(
        and(
          eq(playerContracts.teamId, teamId),
          eq(playerContracts.status, "active")
        )
      );

    const playerWages = Math.round(
      activeContracts.reduce((sum, contract) => sum + (contract.wage || 0), 0) /
        12
    );

    const allStaff = await this.repos.staff.findByTeamId(teamId);
    const staffWages = Math.round(
      allStaff.reduce((sum, s) => sum + (s.salary || 0), 0) / 12
    );

    return {
      playerWages,
      staffWages,
      total: playerWages + staffWages,
      playerCount: activeContracts.length,
      staffCount: allStaff.length,
    };
  }
}