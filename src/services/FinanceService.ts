import { FinancialCategory } from "../domain/enums";
import { contractService } from "./ContractService";
import { financialRepository } from "../repositories/FinancialRepository";
import { teamRepository } from "../repositories/TeamRepository";
import { playerRepository } from "../repositories/PlayerRepository";

export class FinanceService {
  /**
   * Calcula a receita de bilheteria de uma partida com base em múltiplos fatores
   * @param stadiumCapacity Capacidade total do estádio
   * @param fanSatisfaction Satisfação da torcida (0-100)
   * @param matchImportance Importância da partida (0.5 = amistoso, 1.0 = campeonato, 1.5 = final)
   * @param ticketPrice Preço base do ingresso (valor padrão: €50)
   * @returns Objeto com receita total e público presente
   */
  static calculateMatchDayRevenue(
    stadiumCapacity: number,
    fanSatisfaction: number,
    matchImportance: number = 1.0,
    ticketPrice: number = 50
  ): { revenue: number; attendance: number } {
    const satisfactionMultiplier = Math.max(
      0.3,
      Math.min(1.0, fanSatisfaction / 100)
    );

    const baseAttendance = stadiumCapacity * satisfactionMultiplier;

    const expectedAttendance = baseAttendance * matchImportance;

    const randomFactor = 0.95 + Math.random() * 0.1;
    const actualAttendance = Math.round(
      Math.min(stadiumCapacity, expectedAttendance * randomFactor)
    );

    const revenue = Math.round(actualAttendance * ticketPrice);

    return {
      revenue,
      attendance: actualAttendance,
    };
  }

  /**
   * Processa as despesas mensais de salários de um time
   * Debita do orçamento e cria registros financeiros
   * @param teamId ID do time
   * @param currentDate Data no formato YYYY-MM-DD
   * @param seasonId ID da temporada atual
   * @returns Objeto com detalhes da transação
   */
  static async processMonthlyExpenses(
    teamId: number,
    currentDate: string,
    seasonId: number
  ): Promise<{
    success: boolean;
    totalExpense: number;
    newBudget: number;
    playerWages: number;
    staffWages: number;
    message: string;
  }> {
    try {
      const wageBill = await contractService.calculateMonthlyWageBill(teamId);

      const team = await teamRepository.findById(teamId);
      if (!team) {
        throw new Error(`Time ${teamId} não encontrado`);
      }

      const currentBudget = team.budget ?? 0;
      const totalExpense = wageBill.total;

      const newBudget = currentBudget - totalExpense;

      await teamRepository.updateBudget(teamId, newBudget);

      if (wageBill.playerWages > 0) {
        await financialRepository.addRecord({
          teamId,
          seasonId,
          date: currentDate,
          type: "expense",
          category: FinancialCategory.SALARY,
          amount: wageBill.playerWages,
          description: `Folha Salarial Mensal - ${wageBill.playerCount} jogadores`,
        });
      }

      if (wageBill.staffWages > 0) {
        await financialRepository.addRecord({
          teamId,
          seasonId,
          date: currentDate,
          type: "expense",
          category: FinancialCategory.STAFF_SALARY,
          amount: wageBill.staffWages,
          description: `Folha Salarial Mensal - ${wageBill.staffCount} profissionais`,
        });
      }

      const budgetStatus = newBudget < 0 ? "NEGATIVO ⚠️" : "positivo";
      const message = `Despesas mensais processadas: €${totalExpense.toLocaleString(
        "pt-PT"
      )} | Orçamento: €${newBudget.toLocaleString("pt-PT")} (${budgetStatus})`;

      console.log(`💸 ${message}`);

      return {
        success: true,
        totalExpense,
        newBudget,
        playerWages: wageBill.playerWages,
        staffWages: wageBill.staffWages,
        message,
      };
    } catch (error) {
      console.error("❌ Erro ao processar despesas mensais:", error);
      return {
        success: false,
        totalExpense: 0,
        newBudget: 0,
        playerWages: 0,
        staffWages: 0,
        message: `Erro ao processar despesas: ${error}`,
      };
    }
  }

  /**
   * Verifica se é o dia de pagamento mensal (dia 1 de cada mês)
   * @param currentDate Data no formato YYYY-MM-DD
   * @returns true se for dia de pagamento
   */
  static isPayDay(currentDate: string): boolean {
    const date = new Date(currentDate);
    return date.getDate() === 1;
  }

  /**
   * Determina a importância de uma partida baseada na competição
   * @param competitionTier Tier da competição (1 = elite, 2 = segunda divisão, etc)
   * @param round Rodada da competição
   * @param isKnockout Se é fase eliminatória
   * @returns Multiplicador de importância (0.5 a 2.0)
   */
  static getMatchImportance(
    competitionTier: number,
    round?: number,
    isKnockout: boolean = false
  ): number {
    let importance = 1.0;

    if (competitionTier === 1) importance *= 1.2;

    if (isKnockout) importance *= 1.3;

    if (round && round > 30) importance *= 1.2;

    return Math.min(2.0, importance);
  }

  /**
   * Gera descrição formatada para registros financeiros
   */
  static getTransactionDescription(
    category: FinancialCategory,
    detail?: string
  ): string {
    const map: Record<string, string> = {
      [FinancialCategory.SALARY]: "Pagamento de Salários",
      [FinancialCategory.TICKET_SALES]: "Receita de Bilheteira",
      [FinancialCategory.SPONSORS]: "Pagamento de Patrocínio",
      [FinancialCategory.STADIUM_MAINTENANCE]: "Manutenção do Estádio",
      [FinancialCategory.TV_RIGHTS]: "Direitos de Transmissão",
      [FinancialCategory.PRIZE]: "Premiação",
      [FinancialCategory.TRANSFER_IN]: "Receita de Transferência",
      [FinancialCategory.TRANSFER_OUT]: "Despesa de Transferência",
      [FinancialCategory.STAFF_SALARY]: "Salários da Equipe Técnica",
      [FinancialCategory.INFRASTRUCTURE]: "Investimento em Infraestrutura",
    };

    return detail
      ? `${map[category]} - ${detail}`
      : map[category] || "Transação Diversa";
  }

  /**
   * Verifica a saúde financeira de um time e aplica penalidades se necessário
   * @param teamId ID do time
   * @returns Objeto com status financeiro e penalidades aplicadas
   */
  static async checkFinancialHealth(teamId: number): Promise<{
    isHealthy: boolean;
    currentBudget: number;
    hasTransferBan: boolean;
    penaltiesApplied: string[];
    severity: "none" | "warning" | "critical";
  }> {
    try {
      const team = await teamRepository.findById(teamId);
      if (!team) {
        throw new Error(`Time ${teamId} não encontrado`);
      }

      const currentBudget = team.budget ?? 0;
      const penaltiesApplied: string[] = [];
      let hasTransferBan = false;
      let severity: "none" | "warning" | "critical" = "none";

      if (currentBudget < 0) {
        const debtAmount = Math.abs(currentBudget);

        if (debtAmount > 5000000) {
          severity = "critical";
        } else if (debtAmount > 1000000) {
          severity = "warning";
        } else {
          severity = "warning";
        }

        const players = await playerRepository.findByTeamId(teamId);
        const moralPenalty = severity === "critical" ? -15 : -10;

        const playerUpdates = players.map((p) => ({
          id: p.id,
          energy: p.energy,
          fitness: p.fitness,
          moral: Math.max(0, p.moral + moralPenalty),
        }));

        if (playerUpdates.length > 0) {
          await playerRepository.updateDailyStatsBatch(playerUpdates);
          penaltiesApplied.push(
            `Moral dos jogadores reduzida em ${Math.abs(
              moralPenalty
            )} pontos (${players.length} jogadores afetados)`
          );
        }

        hasTransferBan = true;
        penaltiesApplied.push(
          "Transfer Ban ativado - Contratações bloqueadas até regularização financeira"
        );

        const fanPenalty = severity === "critical" ? -15 : -10;
        const newFanSatisfaction = Math.max(
          0,
          (team.fanSatisfaction ?? 50) + fanPenalty
        );

        await teamRepository.update(teamId, {
          fanSatisfaction: newFanSatisfaction,
        });

        penaltiesApplied.push(
          `Satisfação da torcida reduzida em ${Math.abs(fanPenalty)} pontos`
        );

        console.log(`⚠️ CRISE FINANCEIRA - ${team.name}`);
        console.log(`   Dívida: €${debtAmount.toLocaleString("pt-PT")}`);
        console.log(`   Severidade: ${severity.toUpperCase()}`);
        penaltiesApplied.forEach((p) => console.log(`   • ${p}`));
      }

      return {
        isHealthy: currentBudget >= 0,
        currentBudget,
        hasTransferBan,
        penaltiesApplied,
        severity,
      };
    } catch (error) {
      console.error("❌ Erro ao verificar saúde financeira:", error);
      throw error;
    }
  }

  /**
   * Verifica se um time tem permissão para fazer transferências
   * @param teamId ID do time
   * @returns true se pode contratar, false se está sob transfer ban
   */
  static async canMakeTransfers(teamId: number): Promise<{
    allowed: boolean;
    reason?: string;
  }> {
    const health = await this.checkFinancialHealth(teamId);

    if (health.hasTransferBan) {
      return {
        allowed: false,
        reason: `Transfer Ban ativo. Orçamento atual: €${health.currentBudget.toLocaleString(
          "pt-PT"
        )}. Regularize as finanças do clube para desbloquear contratações.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Calcula multa por má gestão financeira
   * @param teamId ID do time
   * @param debtAmount Valor da dívida
   * @returns Valor da multa a ser aplicada
   */
  static calculateFinancialPenaltyFine(debtAmount: number): {
    fine: number;
    description: string;
  } {
    const fine = Math.round(Math.abs(debtAmount) * 0.05);

    return {
      fine,
      description: `Multa por má gestão financeira (5% da dívida: €${debtAmount.toLocaleString(
        "pt-PT"
      )})`,
    };
  }
}
