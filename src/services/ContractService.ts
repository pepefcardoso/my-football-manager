import { playerRepository } from "../repositories/PlayerRepository";
import { staffRepository } from "../repositories/StaffRepository";
import { financialRepository } from "../repositories/FinancialRepository";
import { FinancialCategory } from "../domain/enums";
import { db } from "../lib/db";
import { playerContracts } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { Logger } from "../lib/Logger";

export class ContractService {
  private logger: Logger;

  constructor() {
    this.logger = new Logger("ContractService");
  }

  /**
   * Calcula a folha salarial mensal total de um time
   * Inclui jogadores e equipe técnica
   * @param teamId ID do time
   * @returns Objeto com detalhamento dos salários
   */
  async calculateMonthlyWageBill(teamId: number): Promise<{
    playerWages: number;
    staffWages: number;
    total: number;
    playerCount: number;
    staffCount: number;
  }> {
    this.logger.debug(`Calculando folha salarial para o time ${teamId}`);
    try {
      const activeContracts = await db
        .select()
        .from(playerContracts)
        .where(
          and(
            eq(playerContracts.teamId, teamId),
            eq(playerContracts.status, "active")
          )
        );

      const playerWagesAnnual = activeContracts.reduce(
        (sum, contract) => sum + (contract.wage || 0),
        0
      );
      const playerWagesMonthly = Math.round(playerWagesAnnual / 12);

      const staffMembers = await staffRepository.findByTeamId(teamId);

      const staffWagesAnnual = staffMembers.reduce(
        (sum, member) => sum + (member.salary || 0),
        0
      );
      const staffWagesMonthly = Math.round(staffWagesAnnual / 12);

      return {
        playerWages: playerWagesMonthly,
        staffWages: staffWagesMonthly,
        total: playerWagesMonthly + staffWagesMonthly,
        playerCount: activeContracts.length,
        staffCount: staffMembers.length,
      };
    } catch (error) {
      this.logger.error("Erro ao calcular folha salarial:", error);
      throw error;
    }
  }

  /**
   * Verifica contratos que estão expirando na data atual
   * @param currentDate Data no formato YYYY-MM-DD
   * @returns Número de contratos liberados
   */
  async checkExpiringContracts(currentDate: string): Promise<{
    playersReleased: number;
    staffReleased: number;
  }> {
    this.logger.info(`Verificando contratos expirando em ${currentDate}`);
    try {
      const expiringPlayerContracts = await db
        .select()
        .from(playerContracts)
        .where(
          and(
            eq(playerContracts.endDate, currentDate),
            eq(playerContracts.status, "active")
          )
        );

      for (const contract of expiringPlayerContracts) {
        await db
          .update(playerContracts)
          .set({ status: "expired" })
          .where(eq(playerContracts.id, contract.id));

        await playerRepository.update(contract.playerId, { teamId: null });

        this.logger.info(
          `Contrato expirado: Jogador ID ${contract.playerId} liberado`
        );
      }

      // TODO: Melhorar lógica para verificar staff de todos os times, não apenas teamId 0 ou genérico
      const expiringStaff = await staffRepository.findFreeAgents(); // Ajuste conforme lógica de negócio real
      const expiredStaff = expiringStaff.filter(
        (s) => s.contractEnd === currentDate
      );

      for (const member of expiredStaff) {
        await staffRepository.fire(member.id);
        this.logger.info(`Contrato expirado: Staff ID ${member.id} liberado`);
      }

      return {
        playersReleased: expiringPlayerContracts.length,
        staffReleased: expiredStaff.length,
      };
    } catch (error) {
      this.logger.error("Erro ao verificar contratos expirando:", error);
      return { playersReleased: 0, staffReleased: 0 };
    }
  }

  /**
   * Processa pagamento de salários diários para jogadores e staff
   * @param teamId ID do time
   * @param currentDate Data atual (YYYY-MM-DD)
   * @param seasonId ID da temporada atual
   */
  async processDailyWages(
    teamId: number,
    currentDate: string,
    seasonId: number
  ): Promise<void> {
    this.logger.debug(
      `Processando salários diários (pro-rata) para time ${teamId}`
    );

    try {
      const staffMembers = await staffRepository.findByTeamId(teamId);

      // TODO: Buscar contratos reais dos jogadores para cálculo preciso
      const playerTotal = 1000; // Valor placeholder
      const staffTotal =
        staffMembers.reduce((sum, s) => sum + (s.salary || 0), 0) / 365;

      if (playerTotal > 0) {
        await financialRepository.addRecord({
          teamId,
          seasonId,
          date: currentDate,
          type: "expense",
          category: FinancialCategory.SALARY,
          amount: Math.round(playerTotal),
          description: "Salários Diários - Jogadores",
        });
      }

      if (staffTotal > 0) {
        await financialRepository.addRecord({
          teamId,
          seasonId,
          date: currentDate,
          type: "expense",
          category: FinancialCategory.STAFF_SALARY,
          amount: Math.round(staffTotal),
          description: "Salários Diários - Staff",
        });
      }
    } catch (error) {
      this.logger.error("Erro ao processar salários diários:", error);
    }
  }

  /**
   * Renova contrato de um jogador com novos termos
   * @param playerId ID do jogador
   * @param newWage Novo salário anual
   * @param newEndDate Nova data de término (YYYY-MM-DD)
   */
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
}

export const contractService = new ContractService();
