import { BaseService } from "../BaseService";
import type { IRepositoryContainer } from "../../repositories/IRepositories";
import { FinancialBalance } from "../../engine/FinancialBalanceConfig";
import type { FinancialHealthResult } from "../../domain/types";

export class FinancialPenaltyService extends BaseService {
  constructor(repositories: IRepositoryContainer) {
    super(repositories, "FinancialPenaltyService");
  }

  async applyPenalties(
    teamId: number,
    severity: FinancialHealthResult["severity"],
    currentSatisfaction: number
  ): Promise<string[]> {
    const penaltiesApplied: string[] = [];
    const PENALTIES = FinancialBalance.PENALTY_WEIGHTS;

    const moralPenalty =
      severity === "critical"
        ? PENALTIES.MORAL_CRITICAL
        : PENALTIES.MORAL_WARNING;

    await this.applyMoralPenalty(teamId, moralPenalty);
    penaltiesApplied.push(
      `Moral dos jogadores reduzida em ${Math.abs(moralPenalty)} pontos.`
    );

    const fanPenalty =
      severity === "critical"
        ? PENALTIES.SATISFACTION_PENALTY_CRITICAL
        : PENALTIES.SATISFACTION_PENALTY_WARNING;

    await this.applyFanSatisfactionPenalty(
      teamId,
      currentSatisfaction,
      fanPenalty
    );
    penaltiesApplied.push(
      `Satisfação da torcida reduzida em ${Math.abs(fanPenalty)} pontos.`
    );

    if (severity === "critical") {
      const pointsDeducted = await this.applyPointsDeduction(teamId);
      if (pointsDeducted) {
        penaltiesApplied.push(
          `Punição na Liga: Perda de ${PENALTIES.POINTS_DEDUCTION} pontos.`
        );
      }
    }

    return penaltiesApplied;
  }

  private async applyMoralPenalty(teamId: number, penalty: number) {
    const players = await this.repos.players.findByTeamId(teamId);
    const playerUpdates = players.map((p) => ({
      id: p.id,
      energy: p.energy,
      fitness: p.fitness,
      moral: Math.max(0, p.moral + penalty),
    }));

    if (playerUpdates.length > 0) {
      await this.repos.players.updateDailyStatsBatch(playerUpdates);
    }
  }

  private async applyFanSatisfactionPenalty(
    teamId: number,
    currentSatisfaction: number,
    penalty: number
  ) {
    const newSatisfaction = Math.max(0, currentSatisfaction + penalty);
    await this.repos.teams.update(teamId, {
      fanSatisfaction: newSatisfaction,
    });
  }

  private async applyPointsDeduction(teamId: number): Promise<boolean> {
    const activeSeason = await this.repos.seasons.findActiveSeason();
    if (!activeSeason) return false;

    const competitions = await this.repos.competitions.findAll();
    const mainComp = competitions.find((c) => c.tier === 1) || competitions[0];

    if (!mainComp) return false;

    const standings = await this.repos.competitions.getStandings(
      mainComp.id,
      activeSeason.id
    );
    const teamStanding = standings.find((s) => s.teamId === teamId);

    if (teamStanding && (teamStanding.points ?? 0) > 0) {
      await this.repos.competitions.updateStanding(
        mainComp.id,
        activeSeason.id,
        teamId,
        {
          points: Math.max(
            0,
            (teamStanding.points ?? 0) -
              FinancialBalance.PENALTY_WEIGHTS.POINTS_DEDUCTION
          ),
        }
      );
      return true;
    }

    return false;
  }
}
