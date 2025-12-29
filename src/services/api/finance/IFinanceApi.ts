import type { FinancialRecord } from "../../../domain/models";

export interface DashboardData {
  currentBudget: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyCashflow: number;
  financialHealth: string;
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
}

export interface IFinanceApi {
  getDashboard(teamId: number, seasonId: number): Promise<DashboardData>;
  getTransactions(teamId: number, seasonId: number): Promise<FinancialRecord[]>;
  getOperationalCosts(teamId: number, matchesPlayed: number): Promise<any>;
  projectRevenue(
    teamId: number,
    leaguePosition: number,
    homeMatches: number
  ): Promise<any>;
}
