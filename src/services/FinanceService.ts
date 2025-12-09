import { FinancialCategory } from "../domain/enums";
import { ContractService } from "./ContractService";
import type { IRepositoryContainer } from "../repositories/IRepositories";
import { Logger } from "../lib/Logger";
import {
  FinancialThresholds,
  PenaltyWeights,
  MatchRevenueConfig,
} from "./config/ServiceConstants";
import type { InfrastructureService } from "./InfrastructureService";

export class FinanceService {
  private logger: Logger;
  private repos: IRepositoryContainer;
  private contractService: ContractService;
  private infraService: InfrastructureService;

  constructor(
    repositories: IRepositoryContainer,
    contractService: ContractService,
    infraService: InfrastructureService
  ) {
    this.repos = repositories;
    this.contractService = contractService;
    this.infraService = infraService;
    this.logger = new Logger("FinanceService");
  }

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
    ticketPrice: number = MatchRevenueConfig.BASE_TICKET_PRICE
  ): { revenue: number; attendance: number } {
    const satisfactionMultiplier = Math.max(
      MatchRevenueConfig.MIN_SATISFACTION_MULTIPLIER,
      Math.min(
        MatchRevenueConfig.MAX_SATISFACTION_MULTIPLIER,
        fanSatisfaction / 100
      )
    );

    const baseAttendance = stadiumCapacity * satisfactionMultiplier;
    const expectedAttendance = baseAttendance * matchImportance;

    const randomFactor =
      MatchRevenueConfig.ATTENDANCE_RANDOM_FACTOR_BASE +
      Math.random() * MatchRevenueConfig.ATTENDANCE_RANDOM_VARIANCE;

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
  async processMonthlyExpenses(
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
    this.logger.info(
      `Processando despesas mensais para time ${teamId} em ${currentDate}`
    );

    try {
      const wageBill = await this.contractService.calculateMonthlyWageBill(
        teamId
      );

      const team = await this.repos.teams.findById(teamId);
      if (!team) {
        throw new Error(`Time ${teamId} não encontrado`);
      }

      const infraMaintenance = this.infraService.calculateMonthlyMaintenance(
        team.stadiumCapacity || 10000,
        team.stadiumQuality || 50
      );

      if (infraMaintenance > 0) {
        await this.repos.financial.addRecord({
          teamId,
          seasonId,
          date: currentDate,
          type: "expense",
          category: FinancialCategory.STADIUM_MAINTENANCE,
          amount: infraMaintenance,
          description: `Manutenção de Estádio e Instalações`,
        });
      }

      const currentBudget = team.budget ?? 0;
      const totalExpense = wageBill.total + infraMaintenance;

      const newBudget = currentBudget - totalExpense;

      await this.repos.teams.updateBudget(teamId, newBudget);

      if (wageBill.playerWages > 0) {
        await this.repos.financial.addRecord({
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
        await this.repos.financial.addRecord({
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

      this.logger.info(message);

      return {
        success: true,
        totalExpense,
        newBudget,
        playerWages: wageBill.playerWages,
        staffWages: wageBill.staffWages,
        message,
      };
    } catch (error) {
      this.logger.error("Erro ao processar despesas mensais:", error);
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
  async checkFinancialHealth(teamId: number): Promise<{
    isHealthy: boolean;
    currentBudget: number;
    hasTransferBan: boolean;
    penaltiesApplied: string[];
    severity: "none" | "warning" | "critical";
  }> {
    try {
      const team = await this.repos.teams.findById(teamId);
      if (!team) {
        throw new Error(`Time ${teamId} não encontrado`);
      }

      const currentBudget = team.budget ?? 0;
      const penaltiesApplied: string[] = [];
      let hasTransferBan = false;
      let severity: "none" | "warning" | "critical" = "none";

      if (currentBudget < 0) {
        const debtAmount = Math.abs(currentBudget);

        if (debtAmount > FinancialThresholds.CRITICAL_DEBT) {
          severity = "critical";
        } else if (debtAmount > FinancialThresholds.WARNING_DEBT) {
          severity = "warning";
        } else {
          severity = "warning";
        }

        const players = await this.repos.players.findByTeamId(teamId);
        const moralPenalty =
          severity === "critical"
            ? PenaltyWeights.MORAL_CRITICAL
            : PenaltyWeights.MORAL_WARNING;

        const playerUpdates = players.map((p) => ({
          id: p.id,
          energy: p.energy,
          fitness: p.fitness,
          moral: Math.max(0, p.moral + moralPenalty),
        }));

        if (playerUpdates.length > 0) {
          await this.repos.players.updateDailyStatsBatch(playerUpdates);
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

        const fanPenalty =
          severity === "critical"
            ? PenaltyWeights.SATISFACTION_PENALTY_CRITICAL
            : PenaltyWeights.SATISFACTION_PENALTY_WARNING;

        const newFanSatisfaction = Math.max(
          0,
          (team.fanSatisfaction ?? 50) + fanPenalty
        );

        await this.repos.teams.update(teamId, {
          fanSatisfaction: newFanSatisfaction,
        });

        penaltiesApplied.push(
          `Satisfação da torcida reduzida em ${Math.abs(fanPenalty)} pontos`
        );

        if (severity === "critical") {
          const activeSeason = await this.repos.seasons.findActiveSeason();
          if (activeSeason) {
            const competitions = await this.repos.competitions.findAll();
            const mainComp =
              competitions.find((c) => c.tier === 1) || competitions[0];

            if (mainComp) {
              const standings = await this.repos.competitions.getStandings(
                mainComp.id,
                activeSeason.id
              );
              const teamStanding = standings.find((s) => s.teamId === teamId);

              if (teamStanding && (teamStanding.points ?? 0) > 0) {
                const pointsPenalty = PenaltyWeights.POINTS_DEDUCTION;

                await this.repos.competitions.updateStanding(
                  mainComp.id,
                  activeSeason.id,
                  teamId,
                  {
                    points: Math.max(
                      0,
                      (teamStanding.points ?? 0) - pointsPenalty
                    ),
                  }
                );

                penaltiesApplied.push(
                  `Punição na Liga: Perda de ${pointsPenalty} pontos na tabela do ${mainComp.name}`
                );
              }
            }
          }
        }

        this.logger.info(`CRISE FINANCEIRA - ${team.name}`);
        this.logger.info(`Dívida: €${debtAmount.toLocaleString("pt-PT")}`);
        this.logger.info(`Severidade: ${severity.toUpperCase()}`);
        penaltiesApplied.forEach((p) => this.logger.info(`   • ${p}`));
      }

      return {
        isHealthy: currentBudget >= 0,
        currentBudget,
        hasTransferBan,
        penaltiesApplied,
        severity,
      };
    } catch (error) {
      this.logger.error("Erro ao verificar saúde financeira:", error);
      throw error;
    }
  }

  /**
   * Verifica se um time tem permissão para fazer transferências
   * @param teamId ID do time
   * @returns true se pode contratar, false se está sob transfer ban
   */
  async canMakeTransfers(teamId: number): Promise<{
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
    const fine = Math.round(
      Math.abs(debtAmount) * PenaltyWeights.FINE_PERCENTAGE
    );

    return {
      fine,
      description: `Multa por má gestão financeira (${
        PenaltyWeights.FINE_PERCENTAGE * 100
      }% da dívida: €${debtAmount.toLocaleString("pt-PT")})`,
    };
  }

  /**
   * Obtém os registros financeiros de um time em uma temporada específica
   * @param teamId ID do time
   * @param seasonId ID da temporada
   * @returns Lista de registros financeiros
   */
  async getFinancialRecords(teamId: number, seasonId: number) {
    return await this.repos.financial.findByTeamAndSeason(teamId, seasonId);
  }
}
