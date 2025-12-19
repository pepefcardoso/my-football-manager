import { BaseService } from "../BaseService";
import type { IRepositoryContainer } from "../../repositories/IRepositories";
import { FinancialBalance } from "../../engine/FinancialBalanceConfig";
import { Result, type ServiceResult } from "../types/ServiceResults";
import { GameEventBus } from "../events/GameEventBus";
import { GameEventType } from "../events/GameEventTypes";
import type {
  FinancialHealthResult,
  TransferPermissionResult,
} from "../../domain/types";

export class FinancialHealthChecker extends BaseService {
  private eventBus: GameEventBus;

  constructor(repositories: IRepositoryContainer, eventBus: GameEventBus) {
    super(repositories, "FinancialHealthChecker");
    this.eventBus = eventBus;
  }

  async checkFinancialHealth(
    teamId: number
  ): Promise<ServiceResult<FinancialHealthResult>> {
    return this.execute("checkFinancialHealth", teamId, async (teamId) => {
      const team = await this.repos.teams.findById(teamId);
      if (!team) throw new Error(`Time ${teamId} não encontrado`);

      const currentBudget = team.budget ?? 0;
      const penaltiesApplied: string[] = [];
      let hasTransferBan = false;
      let severity: "none" | "warning" | "critical" = "none";

      if (currentBudget < 0) {
        const debtAmount = Math.abs(currentBudget);
        severity =
          debtAmount > FinancialBalance.FINANCE.CRITICAL_DEBT
            ? "critical"
            : "warning";

        hasTransferBan = true;
        penaltiesApplied.push(
          "Transfer Ban ativado - Contratações bloqueadas até regularização financeira"
        );

        await this.eventBus.publish(GameEventType.FINANCIAL_CRISIS, {
          teamId,
          currentBudget,
          severity,
          fanSatisfaction: team.fanSatisfaction ?? 50,
        });
      }

      return {
        isHealthy: currentBudget >= 0,
        currentBudget,
        hasTransferBan,
        penaltiesApplied,
        severity,
      };
    });
  }

  async canMakeTransfers(
    teamId: number
  ): Promise<ServiceResult<TransferPermissionResult>> {
    return this.execute("canMakeTransfers", teamId, async (teamId) => {
      const healthResult = await this.checkFinancialHealth(teamId);
      if (!Result.isSuccess(healthResult)) {
        return { allowed: false, reason: "Erro ao verificar saúde financeira" };
      }

      const health = healthResult.data;
      if (health.hasTransferBan) {
        return {
          allowed: false,
          reason: `Transfer Ban ativo. Orçamento atual: €${health.currentBudget.toLocaleString(
            "pt-PT"
          )}. Regularize as finanças.`,
        };
      }

      return { allowed: true };
    });
  }
}
