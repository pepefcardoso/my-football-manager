import { FinancialCategory } from "../domain/enums";
import type { IRepositoryContainer } from "../repositories/IRepositories";
import { BaseService } from "./BaseService";
import type { ServiceResult } from "./types/ServiceResults";
import { Result } from "./types/ServiceResults";
import { FinancialHealthChecker } from "./finance/FinancialHealthChecker";
import { GameEventBus } from "./events/GameEventBus";
import type {
  ProcessExpensesInput,
  ProcessExpensesResult,
  FinancialHealthResult,
  TransferPermissionResult,
} from "../domain/types";
import { EnhancedSalaryCalculatorService } from "./finance/SalaryCalculatorService";
import { EnhancedOperationalCostsService } from "./finance/OperationalCostsService";
import { EnhancedRevenueService } from "./finance/RevenueService";
import { FinancialBalance } from "../engine/FinancialBalanceConfig";
import {
  FinancialReportFactory,
  type MonthlyFinancialSummary,
} from "./factories/ReportFactory";

export class FinanceService extends BaseService {
  private healthChecker: FinancialHealthChecker;
  private salaryCalculator: EnhancedSalaryCalculatorService;
  private operationalCosts: EnhancedOperationalCostsService;
  private revenueService: EnhancedRevenueService;

  constructor(repositories: IRepositoryContainer, eventBus: GameEventBus) {
    super(repositories, "EnhancedFinanceService");
    this.healthChecker = new FinancialHealthChecker(repositories, eventBus);
    this.salaryCalculator = new EnhancedSalaryCalculatorService(repositories);
    this.operationalCosts = new EnhancedOperationalCostsService(repositories);
    this.revenueService = new EnhancedRevenueService(repositories);
  }

  /**
   * @param dateStr Data no formato "YYYY-MM-DD"
   */
  static isPayDay(dateStr: string): boolean {
    const currentDate = new Date(dateStr);
    const nextDay = new Date(currentDate);

    nextDay.setDate(currentDate.getDate() + 1);

    return nextDay.getMonth() !== currentDate.getMonth();
  }

  /**
   * @param input - Processing parameters (teamId, date, seasonId)
   * @returns Result with expense breakdown and new budget
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
          throw new Error(`Team ${teamId} not found`);
        }

        this.logger.info(
          `Processing monthly expenses for ${team.shortName} (${currentDate})`
        );

        const wageBillResult =
          await this.salaryCalculator.calculateTeamWageBill(teamId);
        if (Result.isFailure(wageBillResult)) {
          throw new Error(
            `Failed to calculate wages: ${wageBillResult.error.message}`
          );
        }

        const wageBill = wageBillResult.data;
        const monthlyPlayerWages = Math.round(wageBill.totalEmployerCost / 12);

        const operationalResult =
          await this.operationalCosts.calculateOperationalCosts(teamId, 2);

        if (Result.isFailure(operationalResult)) {
          throw new Error(
            `Failed to calculate operational costs: ${operationalResult.error.message}`
          );
        }

        const operational = operationalResult.data;
        const monthlyOperational = operational.grandTotal.monthlyCost;

        const totalExpense = monthlyPlayerWages + monthlyOperational;
        const currentBudget = team.budget || 0;
        const newBudget = currentBudget - totalExpense;

        if (monthlyPlayerWages > 0) {
          await this.repos.financial.addRecord({
            teamId,
            seasonId,
            date: currentDate,
            type: "expense",
            category: FinancialCategory.SALARY,
            amount: monthlyPlayerWages,
            description: `Monthly Payroll - ${wageBill.playerCount} players (incl. taxes)`,
          });
        }

        if (operational.stadium.totalAnnual > 0) {
          await this.repos.financial.addRecord({
            teamId,
            seasonId,
            date: currentDate,
            type: "expense",
            category: FinancialCategory.STADIUM_MAINTENANCE,
            amount: Math.round(operational.stadium.totalAnnual / 12),
            description:
              "Stadium Operations (maintenance, utilities, security)",
          });
        }

        if (operational.administrative.totalAnnual > 0) {
          await this.repos.financial.addRecord({
            teamId,
            seasonId,
            date: currentDate,
            type: "expense",
            category: "administrative" as any,
            amount: Math.round(operational.administrative.totalAnnual / 12),
            description: "Administrative Costs (staff, legal, IT, insurance)",
          });
        }

        await this.repos.teams.updateBudget(teamId, newBudget);

        const budgetStatus = newBudget < 0 ? "CRITICAL ⚠️" : "healthy";
        const message =
          `Monthly expenses processed: €${totalExpense.toLocaleString()} | ` +
          `New budget: €${newBudget.toLocaleString()} (${budgetStatus})`;

        this.logger.info(message);

        return {
          totalExpense,
          newBudget,
          playerWages: monthlyPlayerWages,
          staffWages: Math.round(operational.administrative.staff / 12),
          message,
        };
      }
    );
  }

  /**
   * @param teamId - Home team ID
   * @param matchId - Match ID
   * @param attendance - Actual attendance
   * @param matchImportance - Match importance multiplier
   * @returns Revenue generated
   */
  async processMatchdayRevenue(
    teamId: number,
    matchId: number,
    attendance: number,
    matchImportance: number = 1.0
  ): Promise<ServiceResult<number>> {
    return this.execute(
      "processMatchdayRevenue",
      { teamId, matchId, attendance, matchImportance },
      async ({ teamId, matchId, matchImportance }) => {
        const revenueResult =
          await this.revenueService.calculateMatchdayRevenue(
            teamId,
            matchImportance,
            "good"
          );

        if (Result.isFailure(revenueResult)) {
          throw new Error(
            `Failed to calculate revenue: ${revenueResult.error.message}`
          );
        }

        const revenue = revenueResult.data;
        const totalRevenue = revenue.totalRevenue;

        const match = await this.repos.matches.findById(matchId);
        if (!match) {
          throw new Error(`Match ${matchId} not found`);
        }

        const seasonId = match.seasonId || 1;

        await this.repos.financial.addRecord({
          teamId,
          seasonId,
          date: match.date,
          type: "income",
          category: FinancialCategory.TICKET_SALES,
          amount: revenue.tickets.totalRevenue,
          description: `Matchday Tickets - ${revenue.tickets.attendance.toLocaleString()} fans`,
        });

        await this.repos.financial.addRecord({
          teamId,
          seasonId,
          date: match.date,
          type: "income",
          category: "matchday_commercial" as any,
          amount: revenue.commercial.totalRevenue,
          description: "Matchday Commercial (merchandise, F&B, parking)",
        });

        const team = await this.repos.teams.findById(teamId);
        if (team) {
          const newBudget = (team.budget || 0) + totalRevenue;
          await this.repos.teams.updateBudget(teamId, newBudget);
        }

        this.logger.info(
          `Matchday revenue processed: €${totalRevenue.toLocaleString()} ` +
            `(${revenue.tickets.attendance.toLocaleString()} fans)`
        );

        return totalRevenue;
      }
    );
  }

  /**
   * @param teamId - Team ID
   * @param seasonId - Current season ID
   * @returns FFP compliance status
   */
  async checkFFPCompliance(
    teamId: number,
    seasonId: number
  ): Promise<
    ServiceResult<{
      compliant: boolean;
      violations: string[];
      salaryToRevenueRatio: number;
      annualLoss: number;
      maxAllowedLoss: number;
    }>
  > {
    return this.execute(
      "checkFFPCompliance",
      { teamId, seasonId },
      async ({ teamId, seasonId }) => {
        const team = await this.repos.teams.findById(teamId);
        if (!team) {
          throw new Error(`Team ${teamId} not found`);
        }

        const revenueResult = await this.revenueService.projectAnnualRevenue(
          teamId,
          10,
          19
        );

        if (Result.isFailure(revenueResult)) {
          throw new Error(
            `Failed to project revenue: ${revenueResult.error.message}`
          );
        }

        const annualRevenue = revenueResult.data.grandTotal;

        const wageBillResult =
          await this.salaryCalculator.calculateTeamWageBill(teamId);
        if (Result.isFailure(wageBillResult)) {
          throw new Error(
            `Failed to calculate wages: ${wageBillResult.error.message}`
          );
        }

        const annualWages = wageBillResult.data.totalEmployerCost;

        const operationalResult =
          await this.operationalCosts.calculateOperationalCosts(teamId, 19);

        if (Result.isFailure(operationalResult)) {
          throw new Error(
            `Failed to calculate operational costs: ${operationalResult.error.message}`
          );
        }

        const annualOperational = operationalResult.data.grandTotal.annualCost;

        const salaryToRevenueRatio =
          annualRevenue > 0 ? annualWages / annualRevenue : 1.0;
        const annualLoss = annualWages + annualOperational - annualRevenue;

        const ffpConfig = FinancialBalance.FINANCIAL_FAIR_PLAY;
        const violations: string[] = [];

        if (salaryToRevenueRatio > ffpConfig.MAX_SALARY_TO_REVENUE_RATIO) {
          violations.push(
            `Salary to revenue ratio (${(salaryToRevenueRatio * 100).toFixed(
              1
            )}%) ` +
              `exceeds ${ffpConfig.MAX_SALARY_TO_REVENUE_RATIO * 100}% limit`
          );
        }

        if (annualLoss > ffpConfig.MAX_ANNUAL_LOSS_ALLOWED) {
          violations.push(
            `Annual loss (€${annualLoss.toLocaleString()}) exceeds ` +
              `€${ffpConfig.MAX_ANNUAL_LOSS_ALLOWED.toLocaleString()} limit`
          );
        }

        const compliant = violations.length === 0;

        if (!compliant) {
          this.logger.warn(
            `FFP violations detected for ${team.shortName}: ${violations.join(
              "; "
            )}`
          );
        }

        return {
          compliant,
          violations,
          salaryToRevenueRatio,
          annualLoss,
          maxAllowedLoss: ffpConfig.MAX_ANNUAL_LOSS_ALLOWED,
        };
      }
    );
  }

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

  /**
   * @param teamId - Team ID
   * @param seasonId - Season ID
   * @returns Complete financial overview
   */
  async getFinancialDashboard(
    teamId: number,
    seasonId: number
  ): Promise<
    ServiceResult<{
      currentBudget: number;
      monthlyIncome: number;
      monthlyExpenses: number;
      monthlyCashflow: number;
      salaryBill: {
        annual: number;
        monthly: number;
        playerCount: number;
      };
      operationalCosts: {
        annual: number;
        monthly: number;
      };
      projectedAnnualRevenue: number;
      ffpCompliance: boolean;
      financialHealth: string;
    }>
  > {
    return this.execute(
      "getFinancialDashboard",
      { teamId, seasonId },
      async ({ teamId, seasonId }) => {
        const team = await this.repos.teams.findById(teamId);
        if (!team) {
          throw new Error(`Team ${teamId} not found`);
        }

        const [wageBillResult, operationalResult, revenueResult, ffpResult] =
          await Promise.all([
            this.salaryCalculator.calculateTeamWageBill(teamId),
            this.operationalCosts.calculateOperationalCosts(teamId, 2),
            this.revenueService.projectAnnualRevenue(teamId, 10, 19),
            this.checkFFPCompliance(teamId, seasonId),
          ]);

        const wageBill = Result.isSuccess(wageBillResult)
          ? wageBillResult.data
          : { totalEmployerCost: 0, playerCount: 0 };

        const operational = Result.isSuccess(operationalResult)
          ? operationalResult.data
          : { grandTotal: { annualCost: 0, monthlyCost: 0 } };

        const revenue = Result.isSuccess(revenueResult)
          ? revenueResult.data.grandTotal
          : 0;

        const ffp = Result.isSuccess(ffpResult)
          ? ffpResult.data.compliant
          : false;

        const monthlyIncome = Math.round(revenue / 12);
        const monthlyExpenses =
          Math.round(wageBill.totalEmployerCost / 12) +
          operational.grandTotal.monthlyCost;

        const financialHealth =
          team.budget >= 0 && ffp
            ? "Healthy"
            : team.budget < 0 && team.budget > -5_000_000
            ? "Warning"
            : "Critical";

        return {
          currentBudget: team.budget || 0,
          monthlyIncome,
          monthlyExpenses,
          monthlyCashflow: monthlyIncome - monthlyExpenses,
          salaryBill: {
            annual: wageBill.totalEmployerCost,
            monthly: Math.round(wageBill.totalEmployerCost / 12),
            playerCount: wageBill.playerCount,
          },
          operationalCosts: {
            annual: operational.grandTotal.annualCost,
            monthly: operational.grandTotal.monthlyCost,
          },
          projectedAnnualRevenue: revenue,
          ffpCompliance: ffp,
          financialHealth,
        };
      }
    );
  }
}
