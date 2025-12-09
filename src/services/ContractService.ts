import { FinancialCategory } from "../domain/enums";
import { db } from "../lib/db";
import { playerContracts } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { Logger } from "../lib/Logger";
import type { IRepositoryContainer } from "../repositories/IRepositories";

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

export class ContractService {
  private readonly logger: Logger;
  private readonly repos: IRepositoryContainer;

  constructor(repositories: IRepositoryContainer) {
    this.repos = repositories;
    this.logger = new Logger("ContractService");
  }

  async calculateMonthlyWageBill(teamId: number): Promise<WageBillDetails> {
    this.logger.debug(`Calculando folha salarial para o time ${teamId}`);

    try {
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
    } catch (error) {
      this.logger.error("Erro ao calcular folha salarial:", error);
      throw error;
    }
  }

  async checkExpiringContracts(
    currentDate: string
  ): Promise<ContractExpirationResult> {
    this.logger.info(`Verificando contratos expirando em ${currentDate}`);

    try {
      const [playersReleased, staffReleased] = await Promise.all([
        this.processExpiringPlayerContracts(currentDate),
        this.processExpiringStaffContracts(currentDate),
      ]);

      return { playersReleased, staffReleased };
    } catch (error) {
      this.logger.error("Erro ao verificar contratos expirando:", error);
      return { playersReleased: 0, staffReleased: 0 };
    }
  }

  async processDailyWages(
    teamId: number,
    currentDate: string,
    seasonId: number
  ): Promise<void> {
    this.logger.debug(`Processando salários diários para time ${teamId}`);

    try {
      const wageBill = await this.calculateMonthlyWageBill(teamId);

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
    } catch (error) {
      this.logger.error("Erro ao processar salários diários:", error);
    }
  }

  async renewPlayerContract(
    playerId: number,
    newWage: number,
    newEndDate: string
  ): Promise<void> {
    this.logger.info(`Tentativa de renovação: Jogador ${playerId}`);

    try {
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

      if (currentContract.length === 0) {
        throw new Error(
          `Nenhum contrato ativo encontrado para jogador ${playerId}`
        );
      }

      await db
        .update(playerContracts)
        .set({
          wage: newWage,
          endDate: newEndDate,
        })
        .where(eq(playerContracts.id, currentContract[0].id));

      this.logger.info(
        `Contrato renovado: Jogador ${playerId} - €${newWage.toLocaleString()}/ano até ${newEndDate}`
      );
    } catch (error) {
      this.logger.error("Erro ao renovar contrato:", error);
      throw error;
    }
  }

  private async calculatePlayerWages(teamId: number): Promise<{
    monthly: number;
    count: number;
  }> {
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

  private async calculateStaffWages(teamId: number): Promise<{
    monthly: number;
    count: number;
  }> {
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

      this.logger.info(
        `Contrato expirado: Jogador ID ${contract.playerId} liberado`
      );
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
      this.logger.info(`Contrato expirado: Staff ID ${member.id} liberado`);
    }

    return expiredStaff.length;
  }
}
