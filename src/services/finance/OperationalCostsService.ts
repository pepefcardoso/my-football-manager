import { BaseService } from "../BaseService";
import type { IRepositoryContainer } from "../../repositories/IRepositories";
import type { ServiceResult } from "../../domain/ServiceResults";
import { Result } from "../../domain/ServiceResults";
import type { Team, Player } from "../../domain/models";
import { FinancialBalance } from "../../engine/FinancialBalanceConfig";

export interface OperationalCostsBreakdown {
  stadium: {
    baseMaintenance: number;
    utilities: number;
    security: number;
    cleaning: number;
    totalAnnual: number;
    perMatchDay: number;
  };
  training: {
    facilities: number;
    equipment: number;
    groundskeeping: number;
    totalAnnual: number;
  };
  youth: {
    baseCost: number;
    perPlayerCost: number;
    coachingStaff: number;
    facilities: number;
    totalAnnual: number;
  };
  administrative: {
    staff: number;
    legal: number;
    it: number;
    insurance: number;
    totalAnnual: number;
  };
  medical: {
    staff: number;
    physiotherapy: number;
    equipment: number;
    perPlayer: number;
    totalAnnual: number;
  };
  grandTotal: {
    annualCost: number;
    monthlyCost: number;
    dailyCost: number;
  };
}

export class OperationalCostsService extends BaseService {
  constructor(repositories: IRepositoryContainer) {
    super(repositories, "OperationalCostsService");
  }

  async calculateOperationalCosts(
    teamId: number,
    matchesPlayed: number = 0
  ): Promise<ServiceResult<OperationalCostsBreakdown>> {
    return this.execute(
      "calculateOperationalCosts",
      { teamId, matchesPlayed },
      async ({ teamId, matchesPlayed }) => {
        const team = await this.repos.teams.findById(teamId);
        if (!team) {
          throw new Error(`Team ${teamId} not found`);
        }

        const players = await this.repos.players.findByTeamId(teamId);
        const youthPlayers = players.filter((p) => p.isYouth);

        const stadium = this.calculateStadiumCosts(team, matchesPlayed);

        const training = this.calculateTrainingCosts(team);

        const youth = this.calculateYouthAcademyCosts(
          team,
          youthPlayers.length
        );

        const administrative = this.calculateAdministrativeCosts(players);

        const medical = this.calculateMedicalCosts(players.length);

        const totalAnnual =
          stadium.totalAnnual +
          training.totalAnnual +
          youth.totalAnnual +
          administrative.totalAnnual +
          medical.totalAnnual;

        this.logger.info(
          `Operational costs calculated for ${team.shortName}: ` +
            `€${totalAnnual.toLocaleString()}/year ` +
            `(€${Math.round(totalAnnual / 12).toLocaleString()}/month)`
        );

        return {
          stadium,
          training,
          youth,
          administrative,
          medical,
          grandTotal: {
            annualCost: totalAnnual,
            monthlyCost: Math.round(totalAnnual / 12),
            dailyCost: Math.round(totalAnnual / 365),
          },
        };
      }
    );
  }

  private calculateStadiumCosts(
    team: Team,
    matchesPlayed: number
  ): OperationalCostsBreakdown["stadium"] {
    const capacity = team.stadiumCapacity || 10000;
    const quality = team.stadiumQuality || 50;
    const config = FinancialBalance.OPERATIONAL_COSTS.STADIUM_MAINTENANCE;

    const baseMaintenance = capacity * config.BASE_COST_PER_SEAT;

    const qualityAdjustment =
      quality > 50
        ? baseMaintenance * ((quality - 50) * config.QUALITY_MULTIPLIER)
        : 0;

    const totalBaseMaintenance = Math.round(
      baseMaintenance + qualityAdjustment
    );

    const utilitiesFixed = config.UTILITIES_FIXED_ANNUAL;
    const utilitiesVariable = capacity * config.UTILITIES_VARIABLE_PER_SEAT;
    const totalUtilities = Math.round(utilitiesFixed + utilitiesVariable);

    const securityBase = config.SECURITY_BASE;
    const securityVariable =
      Math.floor(capacity / 10000) * config.SECURITY_PER_10K_CAPACITY;
    const totalSecurity = Math.round(securityBase + securityVariable);

    const cleaningPerMatch = capacity * config.CLEANING_COST_PER_MATCH;
    const totalCleaning = Math.round(cleaningPerMatch * matchesPlayed);

    return {
      baseMaintenance: totalBaseMaintenance,
      utilities: totalUtilities,
      security: totalSecurity,
      cleaning: totalCleaning,
      totalAnnual:
        totalBaseMaintenance + totalUtilities + totalSecurity + totalCleaning,
      perMatchDay: Math.round(cleaningPerMatch),
    };
  }

  private calculateTrainingCosts(
    team: Team
  ): OperationalCostsBreakdown["training"] {
    const quality = team.trainingCenterQuality || 50;
    const config = FinancialBalance.OPERATIONAL_COSTS.TRAINING_FACILITIES;

    const baseMaintenance = config.BASE_MAINTENANCE_ANNUAL;
    const qualityCost = quality * config.QUALITY_COST_MULTIPLIER;
    const facilities = Math.round(baseMaintenance + qualityCost);

    return {
      facilities,
      equipment: config.EQUIPMENT_REPLACEMENT_ANNUAL,
      groundskeeping: config.GROUNDSKEEPING_ANNUAL,
      totalAnnual:
        facilities +
        config.EQUIPMENT_REPLACEMENT_ANNUAL +
        config.GROUNDSKEEPING_ANNUAL,
    };
  }

  private calculateYouthAcademyCosts(
    team: Team,
    youthPlayerCount: number
  ): OperationalCostsBreakdown["youth"] {
    const quality = team.youthAcademyQuality || 50;
    const config = FinancialBalance.OPERATIONAL_COSTS.YOUTH_ACADEMY;

    const baseCost = config.BASE_COST_ANNUAL;
    const perPlayerCost = youthPlayerCount * config.COST_PER_YOUTH_PLAYER;
    const coachingStaff = Math.round(
      baseCost * (quality / 50) * config.COACHING_STAFF_MULTIPLIER
    );

    return {
      baseCost,
      perPlayerCost,
      coachingStaff,
      facilities: config.FACILITIES_MAINTENANCE,
      totalAnnual:
        baseCost +
        perPlayerCost +
        coachingStaff +
        config.FACILITIES_MAINTENANCE,
    };
  }

  private calculateAdministrativeCosts(
    players: Player[]
  ): OperationalCostsBreakdown["administrative"] {
    const config = FinancialBalance.OPERATIONAL_COSTS.ADMINISTRATIVE;

    const totalPayroll = players.reduce((sum, p) => {
      const estimatedSalary = Math.pow(p.overall, 2.5) * 1000;
      return sum + estimatedSalary;
    }, 0);

    const insurance = Math.round(totalPayroll * config.INSURANCE_PERCENTAGE);

    return {
      staff: config.BASE_STAFF_COST,
      legal: config.LEGAL_COMPLIANCE,
      it: config.IT_SYSTEMS,
      insurance,
      totalAnnual:
        config.BASE_STAFF_COST +
        config.LEGAL_COMPLIANCE +
        config.IT_SYSTEMS +
        insurance,
    };
  }

  private calculateMedicalCosts(
    playerCount: number
  ): OperationalCostsBreakdown["medical"] {
    const config = FinancialBalance.OPERATIONAL_COSTS.MEDICAL;

    const perPlayer = playerCount * config.COST_PER_PLAYER_ANNUAL;

    return {
      staff: config.BASE_MEDICAL_STAFF,
      physiotherapy: config.PHYSIOTHERAPY_ANNUAL,
      equipment: config.EQUIPMENT_SUPPLIES,
      perPlayer,
      totalAnnual:
        config.BASE_MEDICAL_STAFF +
        config.PHYSIOTHERAPY_ANNUAL +
        config.EQUIPMENT_SUPPLIES +
        perPlayer,
    };
  }

  calculateInjuryTreatmentCost(
    severity: "minor" | "moderate" | "severe"
  ): number {
    const config = FinancialBalance.OPERATIONAL_COSTS.MEDICAL;
    const baseCost = config.COST_PER_PLAYER_ANNUAL / 10;

    const multiplier =
      severity === "minor" ? 1 : severity === "moderate" ? 2 : 4;

    return Math.round(
      baseCost * multiplier * config.INJURY_TREATMENT_MULTIPLIER
    );
  }

  async calculateMonthlyOperationalCosts(
    teamId: number
  ): Promise<ServiceResult<number>> {
    return this.execute(
      "calculateMonthlyOperationalCosts",
      teamId,
      async (teamId) => {
        const fullBreakdown = await this.calculateOperationalCosts(teamId, 0);

        if (Result.isFailure(fullBreakdown)) {
          throw new Error(fullBreakdown.error.message);
        }

        return fullBreakdown.data.grandTotal.monthlyCost;
      }
    );
  }

  async canAffordOperationalCosts(
    teamId: number,
    months: number = 3
  ): Promise<
    ServiceResult<{
      canAfford: boolean;
      monthlyRequired: number;
      currentBudget: number;
      shortfall: number;
    }>
  > {
    return this.execute(
      "canAffordOperationalCosts",
      { teamId, months },
      async ({ teamId, months }) => {
        const team = await this.repos.teams.findById(teamId);
        if (!team) {
          throw new Error(`Team ${teamId} not found`);
        }

        const monthlyCostResult = await this.calculateMonthlyOperationalCosts(
          teamId
        );

        if (Result.isFailure(monthlyCostResult)) {
          throw new Error(monthlyCostResult.error.message);
        }

        const monthlyRequired = monthlyCostResult.data;
        const totalRequired = monthlyRequired * months;
        const currentBudget = team.budget || 0;
        const canAfford = currentBudget >= totalRequired;
        const shortfall = canAfford ? 0 : totalRequired - currentBudget;

        if (!canAfford) {
          this.logger.warn(
            `${team.shortName} cannot afford ${months} months of operations. ` +
              `Shortfall: €${shortfall.toLocaleString()}`
          );
        }

        return {
          canAfford,
          monthlyRequired,
          currentBudget,
          shortfall,
        };
      }
    );
  }
}
