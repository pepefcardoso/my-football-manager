import { FinancialCategory } from "../domain/enums";
import type { IRepositoryContainer } from "../repositories/IRepositories";
import {
  FinancialThresholds,
  PenaltyWeights,
  MatchRevenueConfig,
} from "./config/ServiceConstants";
import { playerContracts } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { db } from "../lib/db";
import { BaseService } from "./BaseService";
import type { ServiceResult } from "./types/ServiceResults";
import { Result } from "./types/ServiceResults";

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
  constructor(repositories: IRepositoryContainer) {
    super(repositories, "FinanceService");
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

        const activeContracts = await db
          .select()
          .from(playerContracts)
          .where(
            and(
              eq(playerContracts.teamId, teamId),
              eq(playerContracts.status, "active")
            )
          );

        const playerWages = Math.round(
          activeContracts.reduce(
            (sum, contract) => sum + (contract.wage || 0),
            0
          ) / 12
        );

        const allStaff = await this.repos.staff.findByTeamId(teamId);
        const staffWages = Math.round(
          allStaff.reduce((sum, s) => sum + (s.salary || 0), 0) / 12
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
        const totalExpense = playerWages + staffWages + infraMaintenance;
        const newBudget = currentBudget - totalExpense;

        await this.repos.teams.updateBudget(teamId, newBudget);

        if (playerWages > 0) {
          await this.repos.financial.addRecord({
            teamId,
            seasonId,
            date: currentDate,
            type: "expense",
            category: FinancialCategory.SALARY,
            amount: playerWages,
            description: `Folha Salarial Mensal - ${activeContracts.length} jogadores`,
          });
        }

        if (staffWages > 0) {
          await this.repos.financial.addRecord({
            teamId,
            seasonId,
            date: currentDate,
            type: "expense",
            category: FinancialCategory.STAFF_SALARY,
            amount: staffWages,
            description: `Folha Salarial Mensal - ${allStaff.length} profissionais`,
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
          playerWages,
          staffWages,
          message,
        };
      }
    );
  }

  private calculateMonthlyMaintenance(
    stadiumCapacity: number,
    stadiumQuality: number
  ): number {
    const seatMaintenance = stadiumCapacity * 2;
    const qualityUpkeep = stadiumQuality * 1000;
    return Math.round(seatMaintenance + qualityUpkeep);
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

  async getFinancialRecords(teamId: number, seasonId: number) {
    return this.repos.financial.findByTeamAndSeason(teamId, seasonId);
  }
}
