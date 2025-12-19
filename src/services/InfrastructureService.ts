import { FinancialCategory } from "../domain/enums";
import {
  InfrastructureEconomics,
  InfrastructureCalculator,
} from "../engine/InfrastructureEconomics";
import { InfrastructureValidator } from "../domain/validators/InfrastructureValidator";
import type { IRepositoryContainer } from "../repositories/IRepositories";
import { BaseService } from "./BaseService";
import { Result } from "../domain/ServiceResults";
import type { ServiceResult } from "../domain/ServiceResults";
import type {
  InfrastructureStatus,
  UpgradeResult,
  UpgradeValidationContext,
  FacilityType,
  UpgradeType,
  FanBaseProjection,
  CapacityAnalysis,
} from "../domain/types/InfrastructureTypes";
import type { GameEventBus } from "../lib/GameEventBus";
import { GameEventType } from "../domain/GameEventTypes";

export class InfrastructureService extends BaseService {
  private eventBus: GameEventBus;

  constructor(repositories: IRepositoryContainer, eventBus: GameEventBus) {
    super(repositories, "InfrastructureService");
    this.eventBus = eventBus;
  }

  async getInfrastructureStatus(
    teamId: number
  ): Promise<ServiceResult<InfrastructureStatus>> {
    return this.execute("getInfrastructureStatus", teamId, async (teamId) => {
      const team = await this.repos.teams.findById(teamId);
      if (!team) {
        throw new Error(`Time ${teamId} não encontrado.`);
      }

      const players = await this.repos.players.findByTeamId(teamId);
      const youthPlayers = players.filter((p) => p.isYouth);

      const stadiumCapacity = team.stadiumCapacity || 10000;
      const stadiumQuality = team.stadiumQuality || 50;
      const fanSatisfaction = team.fanSatisfaction || 50;

      const averageAttendance = Math.round(
        stadiumCapacity * (0.3 + (fanSatisfaction / 100) * 0.7)
      );
      const utilizationRate = averageAttendance / stadiumCapacity;

      const capacityPressure =
        InfrastructureCalculator.calculateCapacityPressure(
          averageAttendance,
          stadiumCapacity
        );

      if (capacityPressure.isPressured) {
        const expansionCost = InfrastructureCalculator.calculateExpansionCost(
          stadiumCapacity,
          InfrastructureEconomics.STADIUM.EXPANSION.SEATS_PER_BLOCK,
          stadiumQuality
        );

        await this.eventBus.publish(GameEventType.STADIUM_CAPACITY_PRESSURED, {
          teamId,
          currentCapacity: stadiumCapacity,
          averageAttendance,
          utilizationRate,
          lostRevenue: Math.round(capacityPressure.revenueLoss * 19 * 50),
          recommendedExpansion:
            InfrastructureEconomics.STADIUM.EXPANSION.SEATS_PER_BLOCK,
          expansionCost,
        });

        this.logger.warn(
          `🚨 Stadium capacity pressured for team ${teamId}: ${(
            utilizationRate * 100
          ).toFixed(1)}% utilization`
        );
      }

      const stadiumMaintenance =
        InfrastructureCalculator.calculateAnnualMaintenance(
          "stadium",
          stadiumCapacity,
          stadiumQuality,
          { matchesPlayed: 19 }
        );

      const stadiumExpansionCost =
        InfrastructureCalculator.calculateExpansionCost(
          stadiumCapacity,
          InfrastructureEconomics.STADIUM.EXPANSION.SEATS_PER_BLOCK,
          stadiumQuality
        );

      const stadiumQualityUpgradeCost =
        InfrastructureCalculator.calculateQualityUpgradeCost(
          "stadium",
          stadiumQuality
        );

      const trainingQuality = team.trainingCenterQuality || 50;
      const trainingBenefits = InfrastructureEconomics.TRAINING_CENTER.BENEFITS;

      const trainingMaintenance =
        InfrastructureCalculator.calculateAnnualMaintenance(
          "training",
          0,
          trainingQuality
        );

      const trainingUpgradeCost =
        InfrastructureCalculator.calculateQualityUpgradeCost(
          "training",
          trainingQuality
        );

      const youthQuality = team.youthAcademyQuality || 50;
      const youthBenefits = InfrastructureEconomics.YOUTH_ACADEMY.BENEFITS;

      const youthMaintenance =
        InfrastructureCalculator.calculateAnnualMaintenance(
          "youth",
          0,
          youthQuality,
          { youthPlayerCount: youthPlayers.length }
        );

      const youthUpgradeCost =
        InfrastructureCalculator.calculateQualityUpgradeCost(
          "youth",
          youthQuality
        );

      await this.checkInfrastructureDegradation(
        teamId,
        {
          stadium: stadiumQuality,
          training: trainingQuality,
          youth: youthQuality,
        },
        {
          stadium: stadiumMaintenance,
          training: trainingMaintenance,
          youth: youthMaintenance,
        }
      );

      const totalAnnualCost =
        stadiumMaintenance + trainingMaintenance + youthMaintenance;
      const totalMonthlyCost = Math.round(totalAnnualCost / 12);

      const currentFanBase = team.fanBase || stadiumCapacity * 2.5;
      const projectedFanBase = InfrastructureCalculator.projectFanBaseGrowth(
        currentFanBase,
        stadiumCapacity,
        stadiumQuality,
        fanSatisfaction,
        10
      );

      const currentBudget = team.budget || 0;
      const recommendedReserve =
        InfrastructureEconomics.VALIDATION.MIN_BUDGET_RESERVE_AFTER_UPGRADE;
      const infrastructureBudgetCap = currentBudget * 0.4;

      return {
        stadium: {
          capacity: stadiumCapacity,
          quality: stadiumQuality,
          utilizationRate,
          averageAttendance,
          revenuePerMatch: Math.round(
            averageAttendance *
              InfrastructureEconomics.REVENUE_STREAMS.MATCHDAY_REVENUE
                .TIER_2_TICKET_PRICE
          ),
          annualMaintenanceCost: stadiumMaintenance,
          monthlyMaintenanceCost: Math.round(stadiumMaintenance / 12),
          isPressured: capacityPressure.isPressured,
          expansionRecommended: utilizationRate >= 0.85,
          nextExpansionCost: stadiumExpansionCost,
          nextQualityUpgradeCost: stadiumQualityUpgradeCost,
        },
        trainingCenter: {
          quality: trainingQuality,
          injuryReductionRate:
            trainingBenefits.INJURY_REDUCTION(trainingQuality),
          fitnessBonus: trainingBenefits.FITNESS_BONUS(trainingQuality),
          recoverySpeedMultiplier:
            trainingBenefits.RECOVERY_SPEED(trainingQuality),
          developmentBonus:
            trainingBenefits.PLAYER_DEVELOPMENT(trainingQuality),
          annualMaintenanceCost: trainingMaintenance,
          monthlyMaintenanceCost: Math.round(trainingMaintenance / 12),
          nextUpgradeCost: trainingUpgradeCost,
          upgradeRecommended: trainingQuality < 70,
        },
        youthAcademy: {
          quality: youthQuality,
          intakeQualityBonus: youthBenefits.INTAKE_QUALITY_BONUS(youthQuality),
          intakeQuantityBonus:
            youthBenefits.INTAKE_QUANTITY_BONUS(youthQuality),
          potentialBoost: youthBenefits.POTENTIAL_BOOST(youthQuality),
          developmentRate: youthBenefits.DEVELOPMENT_RATE(youthQuality),
          currentYouthPlayers: youthPlayers.length,
          annualMaintenanceCost: youthMaintenance,
          monthlyMaintenanceCost: Math.round(youthMaintenance / 12),
          nextUpgradeCost: youthUpgradeCost,
          upgradeRecommended: youthQuality < 60,
        },
        totalAnnualCost,
        totalMonthlyCost,
        fanBase: {
          current: currentFanBase,
          projected: projectedFanBase,
          growthRate: (projectedFanBase - currentFanBase) / currentFanBase,
          capacityRatio: currentFanBase / stadiumCapacity,
        },
        financialHealth: {
          canAffordUpgrades:
            currentBudget > recommendedReserve + totalMonthlyCost * 3,
          recommendedReserve,
          availableBudget: currentBudget,
          infrastructureBudgetCap,
        },
      };
    });
  }

  private async checkInfrastructureDegradation(
    teamId: number,
    qualities: { stadium: number; training: number; youth: number },
    maintenanceCosts: { stadium: number; training: number; youth: number }
  ): Promise<void> {
    const minQuality = 30;

    if (qualities.stadium < minQuality) {
      await this.eventBus.publish(GameEventType.INFRASTRUCTURE_DEGRADED, {
        teamId,
        facilityType: "stadium",
        currentQuality: qualities.stadium,
        minimumQuality: minQuality,
        maintenanceCost: maintenanceCosts.stadium,
      });

      this.logger.warn(
        `⚠️ Stadium quality degraded for team ${teamId}: ${qualities.stadium}/100`
      );
    }

    if (qualities.training < minQuality) {
      await this.eventBus.publish(GameEventType.INFRASTRUCTURE_DEGRADED, {
        teamId,
        facilityType: "training",
        currentQuality: qualities.training,
        minimumQuality: minQuality,
        maintenanceCost: maintenanceCosts.training,
      });

      this.logger.warn(
        `⚠️ Training center quality degraded for team ${teamId}: ${qualities.training}/100`
      );
    }

    if (qualities.youth < minQuality) {
      await this.eventBus.publish(GameEventType.INFRASTRUCTURE_DEGRADED, {
        teamId,
        facilityType: "youth",
        currentQuality: qualities.youth,
        minimumQuality: minQuality,
        maintenanceCost: maintenanceCosts.youth,
      });

      this.logger.warn(
        `⚠️ Youth academy quality degraded for team ${teamId}: ${qualities.youth}/100`
      );
    }
  }

  async expandStadium(
    teamId: number,
    seasonId: number
  ): Promise<ServiceResult<UpgradeResult>> {
    return this.execute(
      "expandStadium",
      { teamId, seasonId },
      async ({ teamId, seasonId }) => {
        const team = await this.repos.teams.findById(teamId);
        if (!team) {
          throw new Error(`Time ${teamId} não encontrado.`);
        }

        const currentCapacity = team.stadiumCapacity || 10000;
        const currentQuality = team.stadiumQuality || 50;
        const currentBudget = team.budget || 0;

        const expansionCost = InfrastructureCalculator.calculateExpansionCost(
          currentCapacity,
          InfrastructureEconomics.STADIUM.EXPANSION.SEATS_PER_BLOCK,
          currentQuality
        );

        const validationContext: UpgradeValidationContext = {
          teamId,
          facilityType: "stadium",
          upgradeType: "expand_stadium",
          currentBudget,
          currentValue: currentCapacity,
          upgradeCost: expansionCost,
          seasonId,
        };

        const validation =
          InfrastructureValidator.validateUpgrade(validationContext);

        if (!validation.isValid) {
          return Result.businessRule(validation.errors.join(" | ")) as any;
        }

        const newCapacity =
          currentCapacity +
          InfrastructureEconomics.STADIUM.EXPANSION.SEATS_PER_BLOCK;
        const newBudget = currentBudget - expansionCost;

        await this.repos.teams.update(teamId, {
          stadiumCapacity: newCapacity,
          budget: newBudget,
        });

        await this.repos.financial.addRecord({
          teamId,
          seasonId,
          date: new Date().toISOString().split("T")[0],
          type: "expense",
          category: FinancialCategory.INFRASTRUCTURE,
          amount: expansionCost,
          description: `Expansão do Estádio (+${InfrastructureEconomics.STADIUM.EXPANSION.SEATS_PER_BLOCK} lugares)`,
        });

        const newFanBase = Math.round(
          (team.fanBase || currentCapacity * 2.5) * 1.05
        );
        await this.repos.teams.update(teamId, {
          fanBase: newFanBase,
        });

        this.logger.info(
          `✅ Estádio expandido: ${currentCapacity} → ${newCapacity} lugares ` +
            `(Custo: €${expansionCost.toLocaleString()})`
        );

        const result: UpgradeResult = {
          success: true,
          facilityType: "stadium",
          upgradeType: "expand_stadium",
          costPaid: expansionCost,
          newValue: newCapacity,
          previousValue: currentCapacity,
          remainingBudget: newBudget,
          message: `Estádio expandido com sucesso! Nova capacidade: ${newCapacity.toLocaleString()} lugares`,
          warnings:
            validation.warnings.length > 0 ? validation.warnings : undefined,
        };

        return result;
      }
    );
  }

  async upgradeFacilityQuality(
    teamId: number,
    seasonId: number,
    facilityType: FacilityType
  ): Promise<ServiceResult<UpgradeResult>> {
    return this.execute(
      "upgradeFacilityQuality",
      { teamId, seasonId, facilityType },
      async ({ teamId, seasonId, facilityType }) => {
        const team = await this.repos.teams.findById(teamId);
        if (!team) {
          throw new Error(`Time ${teamId} não encontrado.`);
        }

        const currentQuality =
          facilityType === "stadium"
            ? team.stadiumQuality || 50
            : facilityType === "training"
            ? team.trainingCenterQuality || 50
            : team.youthAcademyQuality || 50;

        const currentBudget = team.budget || 0;

        const upgradeCost =
          InfrastructureCalculator.calculateQualityUpgradeCost(
            facilityType,
            currentQuality
          );

        const upgradeType: UpgradeType =
          facilityType === "stadium"
            ? "upgrade_stadium_quality"
            : facilityType === "training"
            ? "upgrade_training_quality"
            : "upgrade_youth_quality";

        const validationContext: UpgradeValidationContext = {
          teamId,
          facilityType,
          upgradeType,
          currentBudget,
          currentValue: currentQuality,
          upgradeCost,
          seasonId,
        };

        const validation =
          InfrastructureValidator.validateUpgrade(validationContext);

        if (!validation.isValid) {
          return Result.businessRule(validation.errors.join(" | ")) as any;
        }

        const increment =
          facilityType === "stadium"
            ? InfrastructureEconomics.STADIUM.QUALITY.LEVEL_INCREMENT
            : facilityType === "training"
            ? InfrastructureEconomics.TRAINING_CENTER.UPGRADE.LEVEL_INCREMENT
            : InfrastructureEconomics.YOUTH_ACADEMY.UPGRADE.LEVEL_INCREMENT;

        const newQuality = Math.min(100, currentQuality + increment);
        const newBudget = currentBudget - upgradeCost;

        const updateData: any = { budget: newBudget };
        let facilityName = "";

        if (facilityType === "stadium") {
          updateData.stadiumQuality = newQuality;
          facilityName = "Estádio";
        } else if (facilityType === "training") {
          updateData.trainingCenterQuality = newQuality;
          facilityName = "Centro de Treinamento";
        } else {
          updateData.youthAcademyQuality = newQuality;
          facilityName = "Academia de Base";
        }

        await this.repos.teams.update(teamId, updateData);

        await this.repos.financial.addRecord({
          teamId,
          seasonId,
          date: new Date().toISOString().split("T")[0],
          type: "expense",
          category: FinancialCategory.INFRASTRUCTURE,
          amount: upgradeCost,
          description: `Upgrade de Qualidade - ${facilityName} (Nível ${newQuality})`,
        });

        this.logger.info(
          `✅ ${facilityName} melhorado: ${currentQuality} → ${newQuality} qualidade ` +
            `(Custo: €${upgradeCost.toLocaleString()})`
        );

        const result: UpgradeResult = {
          success: true,
          facilityType,
          upgradeType,
          costPaid: upgradeCost,
          newValue: newQuality,
          previousValue: currentQuality,
          remainingBudget: newBudget,
          message: `${facilityName} melhorado com sucesso! Nova qualidade: ${newQuality}`,
          warnings:
            validation.warnings.length > 0 ? validation.warnings : undefined,
        };

        return result;
      }
    );
  }

  async getUpgradeCost(
    teamId: number,
    facilityType: FacilityType,
    upgradeType: "expand" | "quality"
  ): Promise<ServiceResult<number>> {
    return this.execute(
      "getUpgradeCost",
      { teamId, facilityType, upgradeType },
      async ({ teamId, facilityType, upgradeType }) => {
        const team = await this.repos.teams.findById(teamId);
        if (!team) {
          return 0;
        }

        if (upgradeType === "expand" && facilityType === "stadium") {
          const currentCapacity = team.stadiumCapacity || 10000;
          const currentQuality = team.stadiumQuality || 50;
          return InfrastructureCalculator.calculateExpansionCost(
            currentCapacity,
            InfrastructureEconomics.STADIUM.EXPANSION.SEATS_PER_BLOCK,
            currentQuality
          );
        } else {
          const currentQuality =
            facilityType === "stadium"
              ? team.stadiumQuality || 50
              : facilityType === "training"
              ? team.trainingCenterQuality || 50
              : team.youthAcademyQuality || 50;

          return InfrastructureCalculator.calculateQualityUpgradeCost(
            facilityType,
            currentQuality
          );
        }
      }
    );
  }

  async analyzeCapacity(
    teamId: number
  ): Promise<ServiceResult<CapacityAnalysis>> {
    return this.execute("analyzeCapacity", teamId, async (teamId) => {
      const team = await this.repos.teams.findById(teamId);
      if (!team) {
        throw new Error(`Time ${teamId} não encontrado.`);
      }

      const currentCapacity = team.stadiumCapacity || 10000;
      const fanSatisfaction = team.fanSatisfaction || 50;

      const averageAttendance = Math.round(
        currentCapacity * (0.3 + (fanSatisfaction / 100) * 0.7)
      );

      const utilizationRate = averageAttendance / currentCapacity;
      const capacityPressure =
        InfrastructureCalculator.calculateCapacityPressure(
          averageAttendance,
          currentCapacity
        );

      const expansionCost = InfrastructureCalculator.calculateExpansionCost(
        currentCapacity,
        InfrastructureEconomics.STADIUM.EXPANSION.SEATS_PER_BLOCK,
        team.stadiumQuality || 50
      );

      const config = InfrastructureEconomics.ROI.STADIUM_EXPANSION;
      const additionalSeats =
        InfrastructureEconomics.STADIUM.EXPANSION.SEATS_PER_BLOCK;
      const annualRevenueIncrease =
        additionalSeats * config.ANNUAL_REVENUE_PER_SEAT;
      const paybackMonths = Math.round(
        (expansionCost / annualRevenueIncrease) * 12
      );

      const currentDate = new Date();
      currentDate.setMonth(currentDate.getMonth() + paybackMonths);
      const breakEvenDate = currentDate.toISOString().split("T")[0];

      const lostRevenue = capacityPressure.isPressured
        ? (utilizationRate - 0.9) * currentCapacity * 50 * 19
        : 0;

      return {
        currentCapacity,
        averageAttendance,
        utilizationRate,
        isPressured: capacityPressure.isPressured,
        lostRevenue: Math.round(lostRevenue),
        satisfactionImpact: capacityPressure.satisfactionImpact,
        recommendedExpansion: capacityPressure.isPressured
          ? additionalSeats
          : 0,
        expansionCost,
        projectedROI: {
          annualRevenueIncrease,
          paybackMonths,
          breakEvenDate,
        },
      };
    });
  }

  async projectFanBase(
    teamId: number,
    leaguePosition: number
  ): Promise<ServiceResult<FanBaseProjection>> {
    return this.execute(
      "projectFanBase",
      { teamId, leaguePosition },
      async ({ teamId, leaguePosition }) => {
        const team = await this.repos.teams.findById(teamId);
        if (!team) {
          throw new Error(`Time ${teamId} não encontrado.`);
        }

        const currentFanBase =
          team.fanBase || (team.stadiumCapacity || 10000) * 2.5;
        const stadiumCapacity = team.stadiumCapacity || 10000;
        const stadiumQuality = team.stadiumQuality || 50;
        const fanSatisfaction = team.fanSatisfaction || 50;

        const projectedFanBase = InfrastructureCalculator.projectFanBaseGrowth(
          currentFanBase,
          stadiumCapacity,
          stadiumQuality,
          fanSatisfaction,
          leaguePosition
        );

        const growthRate = (projectedFanBase - currentFanBase) / currentFanBase;

        const config = InfrastructureEconomics.FAN_BASE.GROWTH_RATE;
        const organicGrowth = config.BASE_ANNUAL;

        let successBonus = 0;
        if (leaguePosition === 1) {
          successBonus = config.SUCCESS_MULTIPLIER.TITLE_WIN;
        } else if (leaguePosition <= 3) {
          successBonus = config.SUCCESS_MULTIPLIER.TOP_3_FINISH;
        } else if (leaguePosition <= 10) {
          successBonus = config.SUCCESS_MULTIPLIER.MID_TABLE;
        }

        const satisfactionImpact = config.SATISFACTION_FACTOR(fanSatisfaction);
        const stadiumQualityBonus =
          config.STADIUM_QUALITY_FACTOR(stadiumQuality);

        const recommendations: string[] = [];

        if (projectedFanBase / stadiumCapacity > 5) {
          recommendations.push(
            "Base de torcedores crescendo fortemente. Considere expansão do estádio."
          );
        }

        if (satisfactionImpact < 0) {
          recommendations.push(
            "Baixa satisfação da torcida limitando crescimento. Melhore resultados e experiência no estádio."
          );
        }

        if (stadiumQuality < 60) {
          recommendations.push(
            "Qualidade do estádio abaixo da média. Upgrade pode atrair mais torcedores."
          );
        }

        return {
          currentFanBase,
          projectedFanBase,
          growthRate,
          factors: {
            organicGrowth,
            successBonus,
            satisfactionImpact,
            stadiumQualityBonus,
          },
          recommendations,
        };
      }
    );
  }
}
