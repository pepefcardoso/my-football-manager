import { FinancialCategory } from "../domain/enums";
import type { IRepositoryContainer } from "../repositories/IRepositories";
import { MatchRevenueConfig, PenaltyWeights } from "./config/ServiceConstants";
import { BaseService } from "./BaseService";
import type { ServiceResult } from "./types/ServiceResults";
import { FinancialHealthChecker } from "./finance/FinancialHealthChecker";
import { WageCalculator } from "./finance/WageCalculator";
import { RevenueStrategyFactory } from "./strategies/revenue/RevenueStrategyFactory";
import {
  FinancialReportFactory,
  type MonthlyFinancialSummary,
} from "./factories/ReportFactory";
import { GameEventBus } from "./events/GameEventBus";
import type {
  ProcessExpensesInput,
  ProcessExpensesResult,
  FinancialHealthResult,
  TransferPermissionResult,
} from "../domain/types";

export class FinanceService extends BaseService {
  private healthChecker: FinancialHealthChecker;
  private wageCalculator: WageCalculator;

  constructor(repositories: IRepositoryContainer, eventBus: GameEventBus) {
    super(repositories, "FinanceService");
    this.healthChecker = new FinancialHealthChecker(repositories, eventBus);
    this.wageCalculator = new WageCalculator(repositories);
  }

  /**
   * Calcula a receita estimada para um dia de jogo.
   * Utiliza a estratégia de receita apropriada.
   * * @param stadiumCapacity - Capacidade total do estádio.
   * @param fanSatisfaction - Percentual de satisfação da torcida (0-100).
   * @param ticketPrice - Preço do ingresso.
   * @returns Objeto contendo receita total e público pagante.
   */
  static calculateMatchDayRevenue(
    stadiumCapacity: number,
    fanSatisfaction: number,
    ticketPrice: number = MatchRevenueConfig.BASE_TICKET_PRICE
  ): { revenue: number; attendance: number } {
    const strategy = RevenueStrategyFactory.getStrategy();

    const result = strategy.calculateRevenue({
      stadiumCapacity,
      fanSatisfaction,
      ticketPrice,
      competitionTier: 1,
      round: 15,
    });

    return {
      revenue: result.ticketRevenue,
      attendance: result.attendance,
    };
  }

  /**
   * Verifica se a data atual corresponde ao dia de pagamento (dia 1 do mês).
   * * @param currentDate - Data atual no formato string.
   * @returns True se for dia de pagamento.
   */
  static isPayDay(currentDate: string): boolean {
    const date = new Date(currentDate);
    return date.getDate() === 1;
  }

  /**
   * Calcula o multiplicador de importância da partida para fins de receita.
   * * @param competitionTier - Nível da competição (1, 2, etc).
   * @param round - Rodada atual.
   * @param isKnockout - Se é mata-mata.
   * @returns Multiplicador de importância.
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
   * Gera uma descrição legível para uma transação financeira.
   * * @param category - Categoria da transação.
   * @param detail - Detalhe opcional.
   * @returns String formatada.
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
   * Calcula o valor da multa com base na dívida atual.
   * * @param debtAmount - Valor da dívida.
   * @returns Objeto com valor da multa e descrição.
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
   * Processa todas as despesas fixas mensais do time (salários, manutenção).
   * Atualiza o orçamento e gera registros financeiros.
   * * @param input - Dados necessários (teamId, currentDate, seasonId).
   * @returns Resultado contendo totais gastos e novo orçamento.
   * @throws Error se o time não for encontrado.
   */
  async processMonthlyExpenses(
    input: ProcessExpensesInput
  ): Promise<ServiceResult<ProcessExpensesResult>> {
    return this.execute(
      "processMonthlyExpenses",
      input,
      async ({ teamId, currentDate, seasonId }) => {
        const team = await this.repos.teams.findById(teamId);
        if (!team) {
          throw new Error(`Time ${teamId} não encontrado`);
        }

        const wageData = await this.wageCalculator.calculateMonthlyWages(
          teamId
        );

        const infraMaintenance = this.calculateMonthlyMaintenance(
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
        const totalExpense = wageData.total + infraMaintenance;
        const newBudget = currentBudget - totalExpense;

        await this.repos.teams.updateBudget(teamId, newBudget);

        if (wageData.playerWages > 0) {
          await this.repos.financial.addRecord({
            teamId,
            seasonId,
            date: currentDate,
            type: "expense",
            category: FinancialCategory.SALARY,
            amount: wageData.playerWages,
            description: `Folha Salarial Mensal - ${wageData.playerCount} jogadores`,
          });
        }

        if (wageData.staffWages > 0) {
          await this.repos.financial.addRecord({
            teamId,
            seasonId,
            date: currentDate,
            type: "expense",
            category: FinancialCategory.STAFF_SALARY,
            amount: wageData.staffWages,
            description: `Folha Salarial Mensal - ${wageData.staffCount} profissionais`,
          });
        }

        const budgetStatus = newBudget < 0 ? "NEGATIVO ⚠️" : "positivo";
        const message = `Despesas mensais processadas: €${totalExpense.toLocaleString(
          "pt-PT"
        )} | Orçamento: €${newBudget.toLocaleString(
          "pt-PT"
        )} (${budgetStatus})`;

        return {
          totalExpense,
          newBudget,
          playerWages: wageData.playerWages,
          staffWages: wageData.staffWages,
          message,
        };
      }
    );
  }

  /**
   * Verifica a saúde financeira do clube.
   * Detecta se o time está endividado e aplica penalidades (Transfer Ban) se necessário.
   * * @param teamId - O ID do time.
   * @returns Status de saúde financeira e penalidades ativas.
   */
  async checkFinancialHealth(
    teamId: number
  ): Promise<ServiceResult<FinancialHealthResult>> {
    return this.healthChecker.checkFinancialHealth(teamId);
  }

  /**
   * Verifica se o time tem permissão para realizar transferências.
   * Baseado na existência de Transfer Bans ativos.
   * * @param teamId - O ID do time.
   * @returns Objeto indicando se é permitido e o motivo (se negado).
   */
  async canMakeTransfers(
    teamId: number
  ): Promise<ServiceResult<TransferPermissionResult>> {
    return this.healthChecker.canMakeTransfers(teamId);
  }

  /**
   * Busca o histórico de transações financeiras de um time na temporada.
   * * @param teamId - O ID do time.
   * @param seasonId - O ID da temporada.
   * @returns Lista de registros financeiros.
   */
  async getFinancialRecords(teamId: number, seasonId: number) {
    return this.repos.financial.findByTeamAndSeason(teamId, seasonId);
  }

  /**
   * Gera um relatório mensal consolidado das finanças.
   * Agrupa receitas e despesas por mês e categoria.
   * * @param teamId - O ID do time.
   * @param seasonId - O ID da temporada.
   * @returns Resumo financeiro mensal.
   */
  async getMonthlyReport(
    teamId: number,
    seasonId: number
  ): Promise<ServiceResult<MonthlyFinancialSummary[]>> {
    return this.execute("getMonthlyReport", { teamId, seasonId }, async () => {
      const records = await this.repos.financial.findByTeamAndSeason(
        teamId,
        seasonId
      );
      return FinancialReportFactory.createMonthlyReport(records);
    });
  }

  private calculateMonthlyMaintenance(
    stadiumCapacity: number,
    stadiumQuality: number
  ): number {
    const seatMaintenance = stadiumCapacity * 2;
    const qualityUpkeep = stadiumQuality * 1000;
    return Math.round(seatMaintenance + qualityUpkeep);
  }
}
