import { BaseService } from "../BaseService";
import type { IRepositoryContainer } from "../../repositories/IRepositories";
import { FinancialThresholds } from "../config/ServiceConstants";
import { FinancialPenaltyService } from "./FinancialPenaltyService";
import type {
  FinancialHealthResult,
  TransferPermissionResult,
} from "../FinanceService";
import { Result, type ServiceResult } from "../types/ServiceResults";

export class FinancialHealthChecker extends BaseService {
  private penaltyService: FinancialPenaltyService;

  constructor(repositories: IRepositoryContainer) {
    super(repositories, "FinancialHealthChecker");
    this.penaltyService = new FinancialPenaltyService(repositories);
  }

  async checkFinancialHealth(
    teamId: number
  ): Promise<ServiceResult<FinancialHealthResult>> {
    return this.execute("checkFinancialHealth", teamId, async (teamId) => {
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
        } else {
          severity = "warning";
        }

        hasTransferBan = true;
        penaltiesApplied.push(
          "Transfer Ban ativado - Contratações bloqueadas até regularização financeira"
        );

        const applied = await this.penaltyService.applyPenalties(
          teamId,
          severity,
          team.fanSatisfaction ?? 50
        );
        penaltiesApplied.push(...applied);
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
        return {
          allowed: false,
          reason: "Erro ao verificar saúde financeira",
        };
      }

      const health = healthResult.data;

      if (health.hasTransferBan) {
        return {
          allowed: false,
          reason: `Transfer Ban ativo. Orçamento atual: €${health.currentBudget.toLocaleString(
            "pt-PT"
          )}. Regularize as finanças do clube para desbloquear contratações.`,
        };
      }

      return { allowed: true };
    });
  }
}
