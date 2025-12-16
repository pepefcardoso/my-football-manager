import { describe, it, expect, beforeEach, vi } from "vitest";
import { FinanceService } from "../../src/services/FinanceService";
import { createRepositoryContainer } from "../../src/repositories/RepositoryContainer";
import { GameEventBus } from "../../src/services/events/GameEventBus";
import { Result } from "../../src/services/types/ServiceResults";
import { FinancialCategory } from "../../src/domain/enums";

vi.mock("../../src/lib/db", () => {
  return {
    db: {},
  };
});

const mockRepos = createRepositoryContainer();
const mockEventBus = new GameEventBus();

const financeService = new FinanceService(mockRepos, mockEventBus);

describe("FinanceService - Validação de Fluxos Financeiros", () => {
  const TEAM_ID = 1;
  const SEASON_ID = 1;
  const CURRENT_DATE = "2025-06-01";

  beforeEach(() => {
    vi.clearAllMocks();

    mockRepos.teams.findById = vi.fn().mockResolvedValue({
      id: TEAM_ID,
      name: "Test FC",
      budget: 5_000_000,
      stadiumCapacity: 30000,
      stadiumQuality: 60,
    });

    mockRepos.teams.updateBudget = vi.fn().mockResolvedValue(undefined);
    mockRepos.financial.addRecord = vi.fn().mockResolvedValue(undefined);
    mockRepos.seasons.findActiveSeason = vi.fn().mockResolvedValue({
      id: SEASON_ID,
      year: 2025,
    });
  });

  describe("processMonthlyExpenses - Integridade do Orçamento", () => {
    it("deve processar despesas mensais sem gerar valores NaN no orçamento", async () => {
      mockRepos.players.findByTeamId = vi.fn().mockResolvedValue([
        {
          id: 1,
          teamId: TEAM_ID,
          firstName: "Player",
          lastName: "One",
          overall: 75,
        },
      ]);

      mockRepos.staff.findByTeamId = vi.fn().mockResolvedValue([
        {
          id: 1,
          teamId: TEAM_ID,
          firstName: "Coach",
          lastName: "Smith",
          role: "head_coach",
          salary: 120_000,
        },
      ]);

      vi.spyOn(
        financeService["wageCalculator"] as any,
        "calculateMonthlyWages"
      ).mockResolvedValue({
        playerWages: 200_000,
        staffWages: 10_000,
        total: 210_000,
        playerCount: 1,
        staffCount: 1,
      });

      const result = await financeService.processMonthlyExpenses({
        teamId: TEAM_ID,
        currentDate: CURRENT_DATE,
        seasonId: SEASON_ID,
      });

      expect(Result.isSuccess(result)).toBe(true);

      const data = Result.unwrap(result);

      expect(data.totalExpense).toBeDefined();
      expect(data.newBudget).toBeDefined();

      expect(Number.isFinite(data.totalExpense)).toBe(true);
      expect(Number.isFinite(data.newBudget)).toBe(true);

      expect(Number.isNaN(data.totalExpense)).toBe(false);
      expect(Number.isNaN(data.newBudget)).toBe(false);

      expect(data.totalExpense).toBeGreaterThan(0);
    });

    it("deve calcular corretamente o novo orçamento após despesas", async () => {
      const INITIAL_BUDGET = 5_000_000;
      const EXPECTED_WAGES = 300_000;
      const EXPECTED_MAINTENANCE = 64_000;
      const EXPECTED_TOTAL = EXPECTED_WAGES + EXPECTED_MAINTENANCE;
      const EXPECTED_NEW_BUDGET = INITIAL_BUDGET - EXPECTED_TOTAL;

      mockRepos.teams.findById = vi.fn().mockResolvedValue({
        id: TEAM_ID,
        budget: INITIAL_BUDGET,
        stadiumCapacity: 30000,
        stadiumQuality: 60,
      });

      vi.spyOn(
        financeService as any,
        "calculateMonthlyMaintenance"
      ).mockReturnValue(EXPECTED_MAINTENANCE);

      vi.spyOn(
        financeService["wageCalculator"] as any,
        "calculateMonthlyWages"
      ).mockResolvedValue({
        playerWages: 250_000,
        staffWages: 50_000,
        total: EXPECTED_WAGES,
        playerCount: 25,
        staffCount: 5,
      });

      const result = await financeService.processMonthlyExpenses({
        teamId: TEAM_ID,
        currentDate: CURRENT_DATE,
        seasonId: SEASON_ID,
      });

      expect(Result.isSuccess(result)).toBe(true);

      const data = Result.unwrap(result);

      expect(data.totalExpense).toBe(EXPECTED_TOTAL);
      expect(data.newBudget).toBe(EXPECTED_NEW_BUDGET);

      expect(mockRepos.teams.updateBudget).toHaveBeenCalledWith(
        TEAM_ID,
        EXPECTED_NEW_BUDGET
      );
    });

    it("deve registrar transações financeiras corretamente", async () => {
      vi.spyOn(
        financeService["wageCalculator"] as any,
        "calculateMonthlyWages"
      ).mockResolvedValue({
        playerWages: 200_000,
        staffWages: 50_000,
        total: 250_000,
        playerCount: 20,
        staffCount: 5,
      });

      const result = await financeService.processMonthlyExpenses({
        teamId: TEAM_ID,
        currentDate: CURRENT_DATE,
        seasonId: SEASON_ID,
      });

      expect(Result.isSuccess(result)).toBe(true);

      expect(mockRepos.financial.addRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          teamId: TEAM_ID,
          seasonId: SEASON_ID,
          type: "expense",
          category: FinancialCategory.SALARY,
          amount: 200_000,
        })
      );

      expect(mockRepos.financial.addRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          teamId: TEAM_ID,
          type: "expense",
          category: FinancialCategory.STAFF_SALARY,
          amount: 50_000,
        })
      );

      expect(mockRepos.financial.addRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "expense",
          category: FinancialCategory.STADIUM_MAINTENANCE,
        })
      );
    });

    it("deve permitir que o orçamento fique negativo (não deve bloquear)", async () => {
      const SMALL_BUDGET = 100_000;
      const LARGE_EXPENSE = 500_000;

      mockRepos.teams.findById = vi.fn().mockResolvedValue({
        id: TEAM_ID,
        budget: SMALL_BUDGET,
        stadiumCapacity: 30000,
        stadiumQuality: 60,
      });

      vi.spyOn(
        financeService["wageCalculator"] as any,
        "calculateMonthlyWages"
      ).mockResolvedValue({
        playerWages: LARGE_EXPENSE,
        staffWages: 0,
        total: LARGE_EXPENSE,
        playerCount: 30,
        staffCount: 0,
      });

      const result = await financeService.processMonthlyExpenses({
        teamId: TEAM_ID,
        currentDate: CURRENT_DATE,
        seasonId: SEASON_ID,
      });

      expect(Result.isSuccess(result)).toBe(true);

      const data = Result.unwrap(result);

      expect(data.newBudget).toBeLessThan(0);

      expect(mockRepos.teams.updateBudget).toHaveBeenCalledWith(
        TEAM_ID,
        expect.any(Number)
      );

      const [[, newBudget]] = (mockRepos.teams.updateBudget as any).mock.calls;
      expect(newBudget).toBeLessThan(0);
    });

    it("deve falhar se o time não for encontrado", async () => {
      mockRepos.teams.findById = vi.fn().mockResolvedValue(undefined);

      const result = await financeService.processMonthlyExpenses({
        teamId: 999,
        currentDate: CURRENT_DATE,
        seasonId: SEASON_ID,
      });

      expect(Result.isFailure(result)).toBe(true);
    });
  });

  describe("checkFinancialHealth - Transfer Ban e Penalidades", () => {
    it("deve marcar o clube como saudável se o orçamento for positivo", async () => {
      mockRepos.teams.findById = vi.fn().mockResolvedValue({
        id: TEAM_ID,
        budget: 1_000_000,
        fanSatisfaction: 70,
      });

      const result = await financeService.checkFinancialHealth(TEAM_ID);

      expect(Result.isSuccess(result)).toBe(true);

      const health = Result.unwrap(result);

      expect(health.isHealthy).toBe(true);
      expect(health.hasTransferBan).toBe(false);
      expect(health.severity).toBe("none");
      expect(health.penaltiesApplied).toHaveLength(0);
    });

    it("deve aplicar Transfer Ban se o orçamento for negativo", async () => {
      mockRepos.teams.findById = vi.fn().mockResolvedValue({
        id: TEAM_ID,
        budget: -500_000,
        fanSatisfaction: 50,
      });

      const result = await financeService.checkFinancialHealth(TEAM_ID);

      expect(Result.isSuccess(result)).toBe(true);

      const health = Result.unwrap(result);

      expect(health.isHealthy).toBe(false);
      expect(health.hasTransferBan).toBe(true);
      expect(health.severity).toBe("warning");
      expect(
        health.penaltiesApplied.some((msg) => msg.includes("Transfer Ban"))
      ).toBe(true);
    });

    it("deve classificar como 'critical' se a dívida for muito alta", async () => {
      mockRepos.teams.findById = vi.fn().mockResolvedValue({
        id: TEAM_ID,
        budget: -6_000_000,
        fanSatisfaction: 30,
      });

      const result = await financeService.checkFinancialHealth(TEAM_ID);

      expect(Result.isSuccess(result)).toBe(true);

      const health = Result.unwrap(result);

      expect(health.severity).toBe("critical");
      expect(health.hasTransferBan).toBe(true);
    });

    it("deve emitir evento FINANCIAL_CRISIS quando há crise financeira", async () => {
      const publishSpy = vi.spyOn(mockEventBus, "publish");

      mockRepos.teams.findById = vi.fn().mockResolvedValue({
        id: TEAM_ID,
        budget: -2_000_000,
        fanSatisfaction: 40,
      });

      await financeService.checkFinancialHealth(TEAM_ID);

      expect(publishSpy).toHaveBeenCalledWith(
        "FINANCIAL_CRISIS",
        expect.objectContaining({
          teamId: TEAM_ID,
          currentBudget: -2_000_000,
          severity: expect.any(String),
        })
      );
    });

    it("deve retornar informações corretas sobre o orçamento atual", async () => {
      const CURRENT_BUDGET = -1_500_000;

      mockRepos.teams.findById = vi.fn().mockResolvedValue({
        id: TEAM_ID,
        budget: CURRENT_BUDGET,
        fanSatisfaction: 45,
      });

      const result = await financeService.checkFinancialHealth(TEAM_ID);

      expect(Result.isSuccess(result)).toBe(true);

      const health = Result.unwrap(result);

      expect(health.currentBudget).toBe(CURRENT_BUDGET);
    });
  });

  describe("canMakeTransfers - Verificação de Permissões", () => {
    it("deve permitir transferências se o orçamento for positivo", async () => {
      mockRepos.teams.findById = vi.fn().mockResolvedValue({
        id: TEAM_ID,
        budget: 3_000_000,
      });

      const result = await financeService.canMakeTransfers(TEAM_ID);

      expect(Result.isSuccess(result)).toBe(true);

      const permission = Result.unwrap(result);

      expect(permission.allowed).toBe(true);
      expect(permission.reason).toBeUndefined();
    });

    it("deve bloquear transferências se houver Transfer Ban", async () => {
      mockRepos.teams.findById = vi.fn().mockResolvedValue({
        id: TEAM_ID,
        budget: -1_000_000,
      });

      const result = await financeService.canMakeTransfers(TEAM_ID);

      expect(Result.isSuccess(result)).toBe(true);

      const permission = Result.unwrap(result);

      expect(permission.allowed).toBe(false);
      expect(permission.reason).toContain("Transfer Ban");
      expect(permission.reason).toContain("Regularize as finanças");
    });

    it("deve incluir o valor da dívida na mensagem de bloqueio", async () => {
      const DEBT_AMOUNT = -2_500_000;

      mockRepos.teams.findById = vi.fn().mockResolvedValue({
        id: TEAM_ID,
        budget: DEBT_AMOUNT,
      });

      const result = await financeService.canMakeTransfers(TEAM_ID);

      const permission = Result.unwrap(result);

      expect(permission.reason).toContain(DEBT_AMOUNT.toLocaleString("pt-PT"));
    });
  });

  describe("Integração - Fluxo Completo de Crise Financeira", () => {
    it("deve processar despesas → orçamento negativo → Transfer Ban → bloqueio de compras", async () => {
      const INITIAL_BUDGET = 500_000;
      const MONTHLY_EXPENSE = 800_000;

      mockRepos.teams.findById = vi.fn().mockResolvedValue({
        id: TEAM_ID,
        budget: INITIAL_BUDGET,
        stadiumCapacity: 30000,
        stadiumQuality: 60,
      });

      vi.spyOn(
        financeService["wageCalculator"] as any,
        "calculateMonthlyWages"
      ).mockResolvedValue({
        playerWages: MONTHLY_EXPENSE,
        staffWages: 0,
        total: MONTHLY_EXPENSE,
        playerCount: 30,
        staffCount: 0,
      });

      const expenseResult = await financeService.processMonthlyExpenses({
        teamId: TEAM_ID,
        currentDate: CURRENT_DATE,
        seasonId: SEASON_ID,
      });

      expect(Result.isSuccess(expenseResult)).toBe(true);

      const expenseData = Result.unwrap(expenseResult);
      expect(expenseData.newBudget).toBeLessThan(0);

      mockRepos.teams.findById = vi.fn().mockResolvedValue({
        id: TEAM_ID,
        budget: expenseData.newBudget,
      });

      const healthResult = await financeService.checkFinancialHealth(TEAM_ID);
      const health = Result.unwrap(healthResult);

      expect(health.hasTransferBan).toBe(true);

      const transferResult = await financeService.canMakeTransfers(TEAM_ID);
      const permission = Result.unwrap(transferResult);

      expect(permission.allowed).toBe(false);
    });
  });

  describe("Edge Cases e Validações", () => {
    it("deve lidar corretamente com orçamento zero", async () => {
      mockRepos.teams.findById = vi.fn().mockResolvedValue({
        id: TEAM_ID,
        budget: 0,
        stadiumCapacity: 20000,
        stadiumQuality: 50,
      });

      vi.spyOn(
        financeService["wageCalculator"] as any,
        "calculateMonthlyWages"
      ).mockResolvedValue({
        playerWages: 0,
        staffWages: 0,
        total: 0,
        playerCount: 0,
        staffCount: 0,
      });

      const result = await financeService.processMonthlyExpenses({
        teamId: TEAM_ID,
        currentDate: CURRENT_DATE,
        seasonId: SEASON_ID,
      });

      expect(Result.isSuccess(result)).toBe(true);

      const data = Result.unwrap(result);

      expect(Number.isFinite(data.newBudget)).toBe(true);
      expect(data.newBudget).toBeLessThanOrEqual(0);
    });

    it("deve lidar com valores muito grandes sem overflow", async () => {
      const HUGE_BUDGET = 999_999_999_999;

      mockRepos.teams.findById = vi.fn().mockResolvedValue({
        id: TEAM_ID,
        budget: HUGE_BUDGET,
        stadiumCapacity: 100000,
        stadiumQuality: 100,
      });

      vi.spyOn(
        financeService["wageCalculator"] as any,
        "calculateMonthlyWages"
      ).mockResolvedValue({
        playerWages: 100_000_000,
        staffWages: 10_000_000,
        total: 110_000_000,
        playerCount: 50,
        staffCount: 20,
      });

      const result = await financeService.processMonthlyExpenses({
        teamId: TEAM_ID,
        currentDate: CURRENT_DATE,
        seasonId: SEASON_ID,
      });

      expect(Result.isSuccess(result)).toBe(true);

      const data = Result.unwrap(result);

      expect(Number.isSafeInteger(data.newBudget)).toBe(true);
      expect(data.newBudget).toBeGreaterThan(0);
    });

    it("deve arredondar valores corretamente para evitar decimais", async () => {
      vi.spyOn(
        financeService["wageCalculator"] as any,
        "calculateMonthlyWages"
      ).mockResolvedValue({
        playerWages: 123_456.789,
        staffWages: 67_890.123,
        total: 191_346.912,
        playerCount: 25,
        staffCount: 10,
      });

      const result = await financeService.processMonthlyExpenses({
        teamId: TEAM_ID,
        currentDate: CURRENT_DATE,
        seasonId: SEASON_ID,
      });

      expect(Result.isSuccess(result)).toBe(true);

      const data = Result.unwrap(result);

      expect(Number.isInteger(data.totalExpense)).toBe(true);
      expect(Number.isInteger(data.newBudget)).toBe(true);
    });
  });
});
