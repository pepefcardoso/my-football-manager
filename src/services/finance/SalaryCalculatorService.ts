import { BaseService } from "../BaseService";
import type { IRepositoryContainer } from "../../repositories/IRepositories";
import type { ServiceResult } from "../types/ServiceResults";
import { Result } from "../types/ServiceResults";
import type { Team } from "../../domain/models";
import {
  FinancialBalance,
  type LeagueTier,
  type PlayerPosition,
  getTotalSalaryCost,
} from "../../engine/FinancialBalanceConfig";

export interface SalaryCalculationResult {
  grossAnnualSalary: number;
  netAnnualSalary: number;
  monthlyGross: number;
  monthlyNet: number;
  employerTotalCost: number;
  signingBonus: number;
  agentFee: number;
  performanceBonusPotential: number;
  breakdown: {
    baseSalary: number;
    positionAdjustment: number;
    ageAdjustment: number;
    potentialBonus: number;
    formAdjustment: number;
    leagueMultiplier: number;
  };
}

export class EnhancedSalaryCalculatorService extends BaseService {
  constructor(repositories: IRepositoryContainer) {
    super(repositories, "EnhancedSalaryCalculatorService");
  }

  /**
   * @param playerId - The player's ID
   * @param teamId - The hiring team's ID
   * @param isFreeTransfer - Whether this is a free transfer (affects signing bonus)
   * @returns Detailed salary calculation
   */
  async calculatePlayerSalary(
    playerId: number,
    teamId: number,
    isFreeTransfer: boolean = false
  ): Promise<ServiceResult<SalaryCalculationResult>> {
    return this.execute(
      "calculatePlayerSalary",
      { playerId, teamId, isFreeTransfer },
      async ({ playerId, teamId, isFreeTransfer }) => {
        const player = await this.repos.players.findById(playerId);
        if (!player) {
          throw new Error(`Player ${playerId} not found`);
        }

        const team = await this.repos.teams.findById(teamId);
        if (!team) {
          throw new Error(`Team ${teamId} not found`);
        }

        const leagueTier = this.determineLeagueTier(team);
        const leagueEconomics = FinancialBalance.LEAGUE_ECONOMICS[leagueTier];

        const baseSalary = this.calculateBaseSalary(
          player.overall,
          leagueEconomics.AVG_PLAYER_SALARY
        );
        
        const positionMultiplier = this.getPositionMultiplier(
          player.position as PlayerPosition
        );
        const positionAdjusted = baseSalary * positionMultiplier;

        const ageMultiplier = this.getAgeMultiplier(player.age);
        const ageAdjusted = positionAdjusted * ageMultiplier;

        const potentialBonus = this.calculatePotentialBonus(
          player.age,
          player.overall,
          player.potential,
          ageAdjusted
        );

        const formMultiplier = this.getFormMultiplier(player.form);
        const formAdjusted = (ageAdjusted + potentialBonus) * formMultiplier;

        const grossAnnualSalary = Math.max(
          leagueEconomics.MIN_PLAYER_SALARY,
          Math.min(leagueEconomics.MAX_PLAYER_SALARY, Math.round(formAdjusted))
        );

        const incomeTaxRate = FinancialBalance.TAXATION.INCOME_TAX_RATE;
        const netAnnualSalary = Math.round(
          grossAnnualSalary * (1 - incomeTaxRate)
        );

        const employerTotalCost = getTotalSalaryCost(grossAnnualSalary);

        const signingBonus = this.calculateSigningBonus(
          grossAnnualSalary,
          isFreeTransfer
        );

        const agentFee = this.calculateAgentFee(
          grossAnnualSalary,
          isFreeTransfer,
          0
        );

        const performanceBonusPotential =
          this.calculatePerformanceBonusPotential(
            player.position as PlayerPosition,
            grossAnnualSalary
          );

        this.logger.info(
          `Salary calculated for ${player.firstName} ${player.lastName}: ` +
            `€${grossAnnualSalary.toLocaleString()} gross/year ` +
            `(€${netAnnualSalary.toLocaleString()} net)`
        );

        return {
          grossAnnualSalary,
          netAnnualSalary,
          monthlyGross: Math.round(grossAnnualSalary / 12),
          monthlyNet: Math.round(netAnnualSalary / 12),
          employerTotalCost,
          signingBonus,
          agentFee,
          performanceBonusPotential,
          breakdown: {
            baseSalary,
            positionAdjustment: positionAdjusted - baseSalary,
            ageAdjustment: ageAdjusted - positionAdjusted,
            potentialBonus,
            formAdjustment: formAdjusted - (ageAdjusted + potentialBonus),
            leagueMultiplier: leagueEconomics.AVG_PLAYER_SALARY / 1_000_000,
          },
        };
      }
    );
  }

  private calculateBaseSalary(overall: number, leagueAverage: number): number {
    const config = FinancialBalance.SALARY_CALCULATION.BASE_FORMULA;
    const leagueMultiplier = leagueAverage / 2_500_000;

    return Math.round(
      Math.pow(overall, config.EXPONENT) * config.MULTIPLIER * leagueMultiplier
    );
  }

  private getPositionMultiplier(position: PlayerPosition): number {
    return (
      FinancialBalance.SALARY_CALCULATION.POSITION_PREMIUMS[position] || 1.0
    );
  }

  private getAgeMultiplier(age: number): number {
    const adjustments = FinancialBalance.SALARY_CALCULATION.AGE_ADJUSTMENTS;

    if (age < 21) return adjustments.YOUTH_DISCOUNT;
    if (age >= 24 && age <= 29) return adjustments.PRIME_MULTIPLIER;
    if (age >= 30 && age <= 32) return adjustments.VETERAN_DISCOUNT;
    if (age >= 33) return adjustments.DECLINING_DISCOUNT;

    return (
      adjustments.YOUTH_DISCOUNT +
      ((adjustments.PRIME_MULTIPLIER - adjustments.YOUTH_DISCOUNT) *
        (age - 21)) /
        3
    );
  }

  private calculatePotentialBonus(
    age: number,
    overall: number,
    potential: number,
    currentSalary: number
  ): number {
    if (age >= 24) return 0;

    const potentialGap = potential - overall;
    const threshold =
      FinancialBalance.SALARY_CALCULATION.POTENTIAL_BONUS
        .HIGH_POTENTIAL_THRESHOLD;

    if (potentialGap >= threshold) {
      const multiplier =
        FinancialBalance.SALARY_CALCULATION.POTENTIAL_BONUS.BONUS_MULTIPLIER;
      return Math.round(currentSalary * (multiplier - 1.0));
    }

    return 0;
  }

  private getFormMultiplier(form: number): number {
    const impact = FinancialBalance.SALARY_CALCULATION.FORM_IMPACT;

    if (form > 80) return impact.EXCELLENT_FORM;
    if (form < 40) return impact.POOR_FORM;

    return 1.0;
  }

  private calculateSigningBonus(
    annualSalary: number,
    isFreeTransfer: boolean
  ): number {
    const config = FinancialBalance.CONTRACT_ECONOMICS.SIGNING_BONUS;
    const multiplier = isFreeTransfer
      ? config.FREE_TRANSFER_MULTIPLIER
      : config.NORMAL_TRANSFER_MULTIPLIER;

    return Math.max(config.MINIMUM, Math.round(annualSalary * multiplier));
  }

  private calculateAgentFee(
    annualSalary: number,
    isFreeTransfer: boolean,
    transferFee: number
  ): number {
    const config = FinancialBalance.CONTRACT_ECONOMICS.AGENT_FEES;

    if (isFreeTransfer) {
      return Math.max(
        config.MINIMUM,
        Math.round(annualSalary * config.FREE_TRANSFER_RATE)
      );
    }

    return Math.max(
      config.MINIMUM,
      Math.round(transferFee * config.STANDARD_RATE)
    );
  }

  private calculatePerformanceBonusPotential(
    position: PlayerPosition,
    annualSalary: number
  ): number {
    const bonuses = FinancialBalance.CONTRACT_ECONOMICS.PERFORMANCE_BONUSES;

    let potential = 0;

    if (position === "FW") {
      potential += bonuses.GOALS_BONUS_FW * 15;
      potential += bonuses.APPEARANCE_BONUS * 35;
    } else if (position === "MF") {
      potential += bonuses.GOALS_BONUS_MF * 8;
      potential += bonuses.APPEARANCE_BONUS * 38;
    } else if (position === "DF" || position === "GK") {
      potential += bonuses.CLEAN_SHEET_BONUS * 18;
      potential += bonuses.APPEARANCE_BONUS * 38;
    }

    potential += bonuses.WIN_BONUS * 20;

    return Math.round(potential);
  }

  private determineLeagueTier(team: Team): LeagueTier {
    const reputation = team.reputation || 0;

    if (reputation >= 7000) return "TIER_1";
    if (reputation >= 4000) return "TIER_2";
    return "TIER_3";
  }

  async calculateTeamWageBill(teamId: number): Promise<
    ServiceResult<{
      totalGrossAnnual: number;
      totalNetAnnual: number;
      totalEmployerCost: number;
      averageSalary: number;
      highestEarner: number;
      playerCount: number;
    }>
  > {
    return this.execute("calculateTeamWageBill", teamId, async (teamId) => {
      const players = await this.repos.players.findByTeamId(teamId);

      if (players.length === 0) {
        return {
          totalGrossAnnual: 0,
          totalNetAnnual: 0,
          totalEmployerCost: 0,
          averageSalary: 0,
          highestEarner: 0,
          playerCount: 0,
        };
      }

      let totalGross = 0;
      let totalNet = 0;
      let totalCost = 0;
      let highest = 0;

      for (const player of players) {
        const salaryResult = await this.calculatePlayerSalary(
          player.id,
          teamId,
          false
        );

        if (Result.isSuccess(salaryResult)) {
          const salary = salaryResult.data;
          totalGross += salary.grossAnnualSalary;
          totalNet += salary.netAnnualSalary;
          totalCost += salary.employerTotalCost;
          highest = Math.max(highest, salary.grossAnnualSalary);
        }
      }

      return {
        totalGrossAnnual: totalGross,
        totalNetAnnual: totalNet,
        totalEmployerCost: totalCost,
        averageSalary: Math.round(totalGross / players.length),
        highestEarner: highest,
        playerCount: players.length,
      };
    });
  }
}
