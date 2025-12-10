import { eq, and } from "drizzle-orm";
import { playerContracts } from "../db/schema";
import { db } from "../lib/db";
import { FinancialCategory } from "../domain/enums";
import { BaseService } from "./BaseService";
import { Result } from "./types/ServiceResults";
import type { ServiceResult } from "./types/ServiceResults";
import type { IRepositoryContainer } from "../repositories/IRepositories";
import { GameEventBus } from "./events/GameEventBus";
import { GameEventType } from "./events/GameEventTypes";
import { FinancialOperationValidator } from "./validators/FinancialOperationValidator";

export interface WageBillDetails {
  playerWages: number;
  staffWages: number;
  total: number;
  playerCount: number;
  staffCount: number;
}

export interface ContractExpirationResult {
  playersReleased: number;
  staffReleased: number;
}

export interface ProcessDailyWagesInput {
  teamId: number;
  currentDate: string;
  seasonId: number;
}

export interface RenewContractInput {
  playerId: number;
  newWage: number;
  newEndDate: string;
}

export class ContractService extends BaseService {
  private eventBus: GameEventBus;

  constructor(repositories: IRepositoryContainer, eventBus: GameEventBus) {
    super(repositories, "ContractService");
    this.eventBus = eventBus;
  }

  async calculateMonthlyWageBill(
    teamId: number
  ): Promise<ServiceResult<WageBillDetails>> {
    return this.execute("calculateMonthlyWageBill", teamId, async (teamId) => {
      const [playerWages, staffWages] = await Promise.all([
        this.calculatePlayerWages(teamId),
        this.calculateStaffWages(teamId),
      ]);

      return {
        playerWages: playerWages.monthly,
        staffWages: staffWages.monthly,
        total: playerWages.monthly + staffWages.monthly,
        playerCount: playerWages.count,
        staffCount: staffWages.count,
      };
    });
  }

  async checkExpiringContracts(
    currentDate: string
  ): Promise<ServiceResult<ContractExpirationResult>> {
    return this.execute("checkExpiringContracts", currentDate, async (date) => {
      const [playersReleased, staffReleased] = await Promise.all([
        this.processExpiringPlayerContracts(date),
        this.processExpiringStaffContracts(date),
      ]);

      return { playersReleased, staffReleased };
    });
  }

  async processDailyWages(
    input: ProcessDailyWagesInput
  ): Promise<ServiceResult<void>> {
    return this.executeVoid(
      "processDailyWages",
      input,
      async ({ teamId, currentDate, seasonId }) => {
        const wageBillResult = await this.calculateMonthlyWageBill(teamId);
        if (Result.isFailure(wageBillResult))
          throw new Error(wageBillResult.error.message);

        const wageBill = wageBillResult.data;
        const dailyPlayerWages = Math.round(wageBill.playerWages / 30);
        const dailyStaffWages = Math.round(wageBill.staffWages / 30);

        if (dailyPlayerWages > 0) {
          await this.repos.financial.addRecord({
            teamId,
            seasonId,
            date: currentDate,
            type: "expense",
            category: FinancialCategory.SALARY,
            amount: dailyPlayerWages,
            description: "Salários Diários - Jogadores",
          });
        }
        if (dailyStaffWages > 0) {
          await this.repos.financial.addRecord({
            teamId,
            seasonId,
            date: currentDate,
            type: "expense",
            category: FinancialCategory.STAFF_SALARY,
            amount: dailyStaffWages,
            description: "Salários Diários - Staff",
          });
        }
      }
    );
  }

  async renewPlayerContract(
    input: RenewContractInput
  ): Promise<ServiceResult<void>> {
    const validation = FinancialOperationValidator.validateWage(input.newWage);
    if (!validation.isValid) {
      return Result.validation(validation.errors!.join(", "));
    }

    return this.executeVoid(
      "renewPlayerContract",
      input,
      async ({ playerId, newWage, newEndDate }) => {
        const currentContract = await db
          .select()
          .from(playerContracts)
          .where(
            and(
              eq(playerContracts.playerId, playerId),
              eq(playerContracts.status, "active")
            )
          )
          .limit(1);

        if (currentContract.length === 0)
          throw new Error(
            `Nenhum contrato ativo encontrado para jogador ${playerId}`
          );

        await db
          .update(playerContracts)
          .set({ wage: newWage, endDate: newEndDate })
          .where(eq(playerContracts.id, currentContract[0].id));
      }
    );
  }

  private async calculatePlayerWages(
    teamId: number
  ): Promise<{ monthly: number; count: number }> {
    const activeContracts = await db
      .select()
      .from(playerContracts)
      .where(
        and(
          eq(playerContracts.teamId, teamId),
          eq(playerContracts.status, "active")
        )
      );

    const annualTotal = activeContracts.reduce(
      (sum, contract) => sum + (contract.wage || 0),
      0
    );
    return {
      monthly: Math.round(annualTotal / 12),
      count: activeContracts.length,
    };
  }

  private async calculateStaffWages(
    teamId: number
  ): Promise<{ monthly: number; count: number }> {
    const staffMembers = await this.repos.staff.findByTeamId(teamId);
    const annualTotal = staffMembers.reduce(
      (sum, member) => sum + (member.salary || 0),
      0
    );
    return {
      monthly: Math.round(annualTotal / 12),
      count: staffMembers.length,
    };
  }

  private async processExpiringPlayerContracts(
    currentDate: string
  ): Promise<number> {
    const expiringContracts = await db
      .select()
      .from(playerContracts)
      .where(
        and(
          eq(playerContracts.endDate, currentDate),
          eq(playerContracts.status, "active")
        )
      );

    for (const contract of expiringContracts) {
      await db
        .update(playerContracts)
        .set({ status: "expired" })
        .where(eq(playerContracts.id, contract.id));
      await this.repos.players.update(contract.playerId, { teamId: null });

      await this.eventBus.publish(GameEventType.CONTRACT_EXPIRED, {
        playerId: contract.playerId,
        teamId: contract.teamId,
        date: currentDate,
      });
    }

    return expiringContracts.length;
  }

  private async processExpiringStaffContracts(
    currentDate: string
  ): Promise<number> {
    const allStaff = await this.repos.staff.findFreeAgents();

    const expiredStaff = allStaff.filter((s) => s.contractEnd === currentDate);
    for (const member of expiredStaff) {
      await this.repos.staff.fire(member.id);
    }
    return expiredStaff.length;
  }
}
