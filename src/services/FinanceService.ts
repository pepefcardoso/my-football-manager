import { FinancialCategory } from "../domain/enums";
import type { IRepositoryContainer } from "../repositories/IRepositories";
import { BaseService } from "./BaseService";
import type { ServiceResult } from "../domain/ServiceResults";
import { Result } from "../domain/ServiceResults";
import type {
  ProcessExpensesInput,
  ProcessExpensesResult,
} from "../domain/types";
import type { OperationalCostsService } from "./finance/OperationalCostsService";
import type { RevenueService } from "./finance/RevenueService";
import type { ContractService } from "./ContractService";
import type { InfrastructureService } from "./InfrastructureService";
import {
  FinancialReportFactory,
  type MonthlyFinancialSummary,
} from "../domain/factories/ReportFactory";

interface InfrastructureFinancialData {
  totalMonthlyCost: number;
  totalAnnualCost: number;
  stadium: { quality: number; totalAnnual: number };
  trainingCenter: { quality: number };
  youthAcademy: { quality: number };
  administrative: { totalAnnual: number };
}

export class FinanceService extends BaseService {
  private operationalCosts: OperationalCostsService;
  private revenueService: RevenueService;
  private contractService: ContractService;
  private infrastructureService: InfrastructureService;

  constructor(
    repositories: IRepositoryContainer,
    operationalCosts: OperationalCostsService,
    revenueService: RevenueService,
    contractService: ContractService,
    infrastructureService: InfrastructureService
  ) {
    super(repositories, "FinanceService");
    this.operationalCosts = operationalCosts;
    this.revenueService = revenueService;
    this.contractService = contractService;
    this.infrastructureService = infrastructureService;
  }

  static isPayDay(dateStr: string): boolean {
    const currentDate = new Date(dateStr);
    const nextDay = new Date(currentDate);
    nextDay.setDate(currentDate.getDate() + 1);
    return nextDay.getMonth() !== currentDate.getMonth();
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
          throw new Error(`Team ${teamId} not found`);
        }

        this.logger.info(
          `Processing monthly expenses for ${team.shortName} (${currentDate})`
        );

        const wageBillResult =
          await this.contractService.calculateMonthlyWageBill(teamId);

        if (Result.isFailure(wageBillResult)) {
          throw new Error(
            `Failed to calculate wages: ${wageBillResult.error.message}`
          );
        }

        const wageBill = wageBillResult.data;
        const monthlyPlayerWages = wageBill.playerWages;
        const monthlyStaffWages = wageBill.staffWages;

        const operationalResult =
          await this.operationalCosts.calculateOperationalCosts(teamId, 2);

        if (Result.isFailure(operationalResult)) {
          throw new Error(
            `Failed to calculate operational costs: ${operationalResult.error.message}`
          );
        }

        const operational = operationalResult.data;
        const monthlyOperational = operational.grandTotal.monthlyCost;

        const infrastructureResult =
          await this.infrastructureService.getInfrastructureStatus(teamId);

        let monthlyInfrastructureMaintenance = 0;
        let infrastructureData: InfrastructureFinancialData | null = null;

        if (Result.isSuccess(infrastructureResult)) {
          infrastructureData =
            infrastructureResult.data as unknown as InfrastructureFinancialData;
          monthlyInfrastructureMaintenance =
            infrastructureData.totalMonthlyCost;

          this.logger.info(
            `Infrastructure maintenance: €${monthlyInfrastructureMaintenance.toLocaleString()}/month`
          );

          if (monthlyInfrastructureMaintenance > 0) {
            await this.repos.financial.addRecord({
              teamId,
              seasonId,
              date: currentDate,
              type: "expense",
              category: FinancialCategory.INFRASTRUCTURE,
              amount: monthlyInfrastructureMaintenance,
              description: `Monthly Infrastructure Maintenance (Stadium: ${infrastructureData.stadium.quality}, Training: ${infrastructureData.trainingCenter.quality}, Youth: ${infrastructureData.youthAcademy.quality})`,
            });
          }
        }

        const totalExpense =
          monthlyPlayerWages +
          monthlyStaffWages +
          monthlyOperational +
          monthlyInfrastructureMaintenance;

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

        if (monthlyStaffWages > 0) {
          await this.repos.financial.addRecord({
            teamId,
            seasonId,
            date: currentDate,
            type: "expense",
            category: FinancialCategory.STAFF_SALARY,
            amount: monthlyStaffWages,
            description: `Monthly Payroll - ${wageBill.staffCount} staff members`,
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
            category: FinancialCategory.INFRASTRUCTURE,
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
          staffWages: monthlyStaffWages,
          message,
        };
      }
    );
  }

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

  async getFinancialDashboard(
    teamId: number,
    seasonId: number
  ): Promise<ServiceResult<any>> {
    return this.execute(
      "getFinancialDashboard",
      { teamId, seasonId },
      async ({ teamId }) => {
        const team = await this.repos.teams.findById(teamId);
        if (!team) {
          throw new Error(`Team ${teamId} not found`);
        }

        const [
          wageBillResult,
          operationalResult,
          revenueResult,
          infrastructureResult,
        ] = await Promise.all([
          this.contractService.calculateMonthlyWageBill(teamId),
          this.operationalCosts.calculateOperationalCosts(teamId, 2),
          this.revenueService.projectAnnualRevenue(teamId, 10, 19),
          this.infrastructureService.getInfrastructureStatus(teamId),
        ]);

        const wageBill = Result.isSuccess(wageBillResult)
          ? wageBillResult.data
          : {
              total: 0,
              playerCount: 0,
              playerWages: 0,
              staffWages: 0,
              staffCount: 0,
            };

        const operational = Result.isSuccess(operationalResult)
          ? operationalResult.data
          : { grandTotal: { annualCost: 0, monthlyCost: 0 } };

        const revenue = Result.isSuccess(revenueResult)
          ? revenueResult.data.grandTotal
          : 0;

        const infrastructure = Result.isSuccess(infrastructureResult)
          ? (infrastructureResult.data as unknown as InfrastructureFinancialData)
          : { totalMonthlyCost: 0, totalAnnualCost: 0 };

        const monthlyIncome = Math.round(revenue / 12);
        const monthlyExpenses =
          wageBill.total +
          operational.grandTotal.monthlyCost +
          infrastructure.totalMonthlyCost;

        const financialHealth =
          team.budget >= 0
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
            annual: wageBill.total * 12,
            monthly: wageBill.total,
            playerCount: wageBill.playerCount,
          },
          operationalCosts: {
            annual: operational.grandTotal.annualCost,
            monthly: operational.grandTotal.monthlyCost,
          },
          infrastructureCosts: {
            annual: infrastructure.totalAnnualCost,
            monthly: infrastructure.totalMonthlyCost,
          },
          projectedAnnualRevenue: revenue,
          financialHealth,
        };
      }
    );
  }
}
