import type { IFinanceApi, DashboardData } from "./IFinanceApi";
import { ApiError } from "../../../lib/errors";
import type { FinancialRecord } from "../../../domain/models";

export class ElectronFinanceApi implements IFinanceApi {
  async getDashboard(teamId: number, seasonId: number): Promise<DashboardData> {
    try {
      const data = await window.electronAPI.finance.getDashboard(
        teamId,
        seasonId
      );
      if (!data) throw new Error("Dados do dashboard não encontrados.");
      return data;
    } catch (error) {
      throw new ApiError(
        "FETCH_DASHBOARD_ERROR",
        "Falha ao carregar dashboard financeiro",
        error
      );
    }
  }

  async getTransactions(
    teamId: number,
    seasonId: number
  ): Promise<FinancialRecord[]> {
    try {
      return await window.electronAPI.finance.getFinancialRecords(
        teamId,
        seasonId
      );
    } catch (error) {
      throw new ApiError(
        "FETCH_TRANSACTIONS_ERROR",
        "Falha ao carregar transações",
        error
      );
    }
  }

  async getOperationalCosts(
    teamId: number,
    matchesPlayed: number
  ): Promise<any> {
    try {
      return await window.electronAPI.finance.getOperationalCosts(
        teamId,
        matchesPlayed
      );
    } catch (error) {
      throw new ApiError(
        "FETCH_OP_COSTS_ERROR",
        "Falha ao carregar custos operacionais",
        error
      );
    }
  }

  async projectRevenue(
    teamId: number,
    leaguePosition: number,
    homeMatches: number
  ): Promise<any> {
    try {
      return await window.electronAPI.finance.projectAnnualRevenue(
        teamId,
        leaguePosition,
        homeMatches
      );
    } catch (error) {
      throw new ApiError(
        "FETCH_REVENUE_ERROR",
        "Falha ao projetar receitas",
        error
      );
    }
  }
}
