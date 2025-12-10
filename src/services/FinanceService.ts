import { FinancialCategory } from "../domain/enums";
import type { IRepositoryContainer } from "../repositories/IRepositories";
import { MatchRevenueConfig, PenaltyWeights } from "./config/ServiceConstants";
import { BaseService } from "./BaseService";
import type { ServiceResult } from "./types/ServiceResults";
import { FinancialHealthChecker } from "./finance/FinancialHealthChecker";
import { WageCalculator } from "./finance/WageCalculator";

export interface ProcessExpensesInput {
  teamId: number;
  currentDate: string;
  seasonId: number;
}

export interface ProcessExpensesResult {
  totalExpense: number;
  newBudget: number;
  playerWages: number;
  staffWages: number;
  message: string;
}

export interface FinancialHealthResult {
  isHealthy: boolean;
  currentBudget: number;
  hasTransferBan: boolean;
  penaltiesApplied: string[];
  severity: "none" | "warning" | "critical";
}

export interface TransferPermissionResult {
  allowed: boolean;
  reason?: string;
}

export class FinanceService extends BaseService {
  private healthChecker: FinancialHealthChecker;
  private wageCalculator: WageCalculator;

  constructor(repositories: IRepositoryContainer) {
    super(repositories, "FinanceService");
    this.healthChecker = new FinancialHealthChecker(repositories);
    this.wageCalculator = new WageCalculator(repositories);
  }

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

  static isPayDay(currentDate: string): boolean {
    const date = new Date(currentDate);
    return date.getDate() === 1;
  }

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

  async checkFinancialHealth(
    teamId: number
  ): Promise<ServiceResult<FinancialHealthResult>> {
    return this.healthChecker.checkFinancialHealth(teamId);
  }

  async canMakeTransfers(
    teamId: number
  ): Promise<ServiceResult<TransferPermissionResult>> {
    return this.healthChecker.canMakeTransfers(teamId);
  }

  async getFinancialRecords(teamId: number, seasonId: number) {
    return this.repos.financial.findByTeamAndSeason(teamId, seasonId);
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
