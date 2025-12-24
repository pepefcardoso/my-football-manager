import { BaseService } from "./BaseService";
import type { IRepositoryContainer } from "../repositories/IRepositories";
import type { ServiceResult } from "../domain/ServiceResults";
import { InfrastructureEconomics } from "../engine/InfrastructureEconomics";
import { FinancialCategory } from "../domain/enums";
import type {
  FacilityType,
  ActiveConstruction,
  FacilityStatus,
  InfrastructureOverview,
  TeamInfrastructure,
} from "../domain/types/InfrastructureTypes";
import type { GameEventBus } from "../lib/GameEventBus";
import { GameEventType } from "../domain/GameEventTypes";
import type { Team } from "../domain/models";

export class InfrastructureService extends BaseService {
  private eventBus: GameEventBus;

  constructor(repositories: IRepositoryContainer, eventBus: GameEventBus) {
    super(repositories, "InfrastructureService");
    this.eventBus = eventBus;
  }

  async getInfrastructureStatus(
    teamId: number
  ): Promise<ServiceResult<InfrastructureOverview>> {
    return this.execute("getInfrastructureStatus", teamId, async (teamId) => {
      const team = await this.repos.teams.findById(teamId);
      if (!team) throw new Error("Time não encontrado.");

      const facilities: Record<string, FacilityStatus> = {};

      const types: FacilityType[] = [
        "stadium_capacity",
        "stadium_quality",
        "training_center_quality",
        "medical_center_quality",
        "youth_academy_quality",
        "administrative_center_quality",
      ];

      let totalMaintenanceCost = 0;

      for (const type of types) {
        const currentLevel = this.getCurrentLevel(team, type);
        let upgradeCost = 0;

        if (type === "stadium_quality") {
          upgradeCost = InfrastructureEconomics.getStadiumQualityUpgradeCost(
            currentLevel,
            team.stadiumCapacity
          );
        } else {
          upgradeCost = InfrastructureEconomics.getUpgradeCost(
            type,
            currentLevel,
            1
          );
        }

        const maintenance = InfrastructureEconomics.getMaintenanceCost(
          type,
          currentLevel
        );
        const duration = InfrastructureEconomics.getConstructionDuration(
          type,
          currentLevel,
          1
        );
        const maxLevel = InfrastructureEconomics.getMaxLevel(type);

        totalMaintenanceCost += maintenance;

        facilities[type] = {
          type,
          name: this.getFacilityName(type),
          currentLevel,
          nextLevel: currentLevel + 1,
          upgradeCost,
          monthlyMaintenance: maintenance,
          constructionDuration: duration,
          isMaxLevel: currentLevel >= maxLevel,
          isUpgrading: team.activeConstruction?.facilityType === type,
          currentBenefit: InfrastructureEconomics.getBenefitDescription(
            type,
            currentLevel
          ),
          nextBenefit: InfrastructureEconomics.getBenefitDescription(
            type,
            currentLevel + (type === "stadium_capacity" ? 1000 : 1)
          ),
        };
      }

      return {
        teamId,
        budget: team.budget,
        facilities: facilities as Record<FacilityType, FacilityStatus>,
        activeConstruction:
          team.activeConstruction as ActiveConstruction | null,
        totalMaintenanceCost,
      };
    });
  }

  async startUpgrade(
    teamId: number,
    facilityType: FacilityType,
    amount: number = 1
  ): Promise<ServiceResult<void>> {
    return this.executeVoid(
      "startUpgrade",
      { teamId, facilityType, amount },
      async () => {
        const team = await this.repos.teams.findById(teamId);
        if (!team) throw new Error("Time não encontrado.");

        if (team.activeConstruction) {
          throw new Error("Já existe uma obra em andamento.");
        }

        const currentLevel = this.getCurrentLevel(team, facilityType);
        const maxLevel = InfrastructureEconomics.getMaxLevel(facilityType);

        if (currentLevel >= maxLevel) {
          throw new Error("Nível máximo já atingido.");
        }

        let cost = 0;
        let actualAmount = 1;

        if (facilityType === "stadium_capacity") {
          actualAmount = amount;
          cost = InfrastructureEconomics.getUpgradeCost(
            facilityType,
            currentLevel,
            actualAmount
          );
        } else if (facilityType === "stadium_quality") {
          cost = InfrastructureEconomics.getStadiumQualityUpgradeCost(
            currentLevel,
            team.stadiumCapacity
          );
        } else {
          cost = InfrastructureEconomics.getUpgradeCost(
            facilityType,
            currentLevel,
            1
          );
        }

        const targetLevel = currentLevel + actualAmount;
        const duration = InfrastructureEconomics.getConstructionDuration(
          facilityType,
          currentLevel,
          actualAmount
        );

        if (team.budget < cost) {
          throw new Error(
            `Saldo insuficiente. Necessário: €${cost.toLocaleString("pt-PT")}`
          );
        }

        const gameState = await this.repos.gameState.findCurrent();
        const currentDateStr =
          gameState?.currentDate || new Date().toISOString().split("T")[0];

        const startDate = new Date(currentDateStr);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + duration);
        const endDateStr = endDate.toISOString().split("T")[0];

        const constructionData: ActiveConstruction = {
          facilityType,
          startLevel: currentLevel,
          targetLevel: targetLevel,
          cost,
          startDate: currentDateStr,
          endDate: endDateStr,
          daysRemaining: duration,
        };

        await this.repos.teams.update(teamId, {
          budget: team.budget - cost,
          activeConstruction: constructionData,
        });

        await this.repos.financial.addRecord({
          teamId,
          seasonId: gameState?.currentSeasonId || 1,
          date: currentDateStr,
          type: "expense",
          category: FinancialCategory.INFRASTRUCTURE,
          amount: cost,
          description: `Investimento: ${this.getFacilityName(facilityType)}`,
        });

        this.logger.info(
          `🔨 Obra iniciada: ${constructionData.facilityType} (- €${cost})`
        );
      }
    );
  }

  private getCurrentLevel(team: Team, type: FacilityType): number {
    const t = team as unknown as TeamInfrastructure;
    switch (type) {
      case "stadium_capacity":
        return t.stadiumCapacity;
      case "stadium_quality":
        return t.stadiumQuality;
      case "training_center_quality":
        return t.trainingCenterQuality;
      case "medical_center_quality":
        return t.medicalCenterQuality;
      case "youth_academy_quality":
        return t.youthAcademyQuality;
      case "administrative_center_quality":
        return t.administrativeCenterQuality;
      default:
        return 0;
    }
  }

  private mapFacilityToColumnUpdate(
    data: Partial<Team>,
    type: FacilityType,
    newLevel: number
  ) {
    switch (type) {
      case "stadium_capacity":
        data.stadiumCapacity = newLevel;
        break;
      case "stadium_quality":
        data.stadiumQuality = newLevel;
        break;
      case "training_center_quality":
        data.trainingCenterQuality = newLevel;
        break;
      case "medical_center_quality":
        data.medicalCenterQuality = newLevel;
        break;
      case "youth_academy_quality":
        data.youthAcademyQuality = newLevel;
        break;
      case "administrative_center_quality":
        data.administrativeCenterQuality = newLevel;
        break;
    }
  }

  private getFacilityName(type: FacilityType): string {
    const names: Record<FacilityType, string> = {
      stadium_capacity: "Expansão do Estádio",
      stadium_quality: "Melhoria do Estádio",
      training_center_quality: "Centro de Treinamento",
      medical_center_quality: "Centro Médico",
      youth_academy_quality: "Academia de Base",
      administrative_center_quality: "Centro Administrativo",
    };
    return names[type] || type;
  }

  async processDailyConstruction(
    teamId: number,
    currentDateStr: string
  ): Promise<ServiceResult<boolean>> {
    return this.execute(
      "processDailyConstruction",
      { teamId, date: currentDateStr },
      async () => {
        const team = await this.repos.teams.findById(teamId);
        if (!team || !team.activeConstruction) return false;

        const construction = team.activeConstruction as ActiveConstruction;
        const today = new Date(currentDateStr);
        const end = new Date(construction.endDate);

        if (today.getTime() < end.getTime()) return false;

        const updateData: Partial<Team> = { activeConstruction: null };
        this.mapFacilityToColumnUpdate(
          updateData,
          construction.facilityType,
          construction.targetLevel
        );

        await this.repos.teams.update(teamId, updateData);

        await this.eventBus.publish(GameEventType.INFRASTRUCTURE_COMPLETED, {
          teamId,
          facilityType: construction.facilityType,
          newLevel: construction.targetLevel,
          description: `Obra concluída: ${this.getFacilityName(
            construction.facilityType
          )}`,
          completionDate: currentDateStr,
        });

        return true;
      }
    );
  }

  async applyMonthlyMaintenance(
    teamId: number,
    currentDate: string,
    seasonId: number
  ): Promise<ServiceResult<number>> {
    return this.execute(
      "applyMonthlyMaintenance",
      { teamId, currentDate, seasonId },
      async ({ teamId, currentDate, seasonId }) => {
        const team = await this.repos.teams.findById(teamId);
        if (!team) return 0;

        const types: FacilityType[] = [
          "stadium_capacity",
          "stadium_quality",
          "training_center_quality",
          "medical_center_quality",
          "youth_academy_quality",
          "administrative_center_quality",
        ];

        let totalCost = 0;
        for (const type of types) {
          totalCost += InfrastructureEconomics.getMaintenanceCost(
            type,
            this.getCurrentLevel(team, type)
          );
        }

        if (totalCost > 0) {
          await this.repos.teams.updateBudget(teamId, team.budget - totalCost);

          await this.repos.financial.addRecord({
            teamId,
            seasonId,
            date: currentDate,
            type: "expense",
            category: FinancialCategory.INFRASTRUCTURE,
            amount: totalCost,
            description: "Manutenção Mensal de Infraestrutura",
          });
        }
        return totalCost;
      }
    );
  }

  async downgradeFacility(
    teamId: number,
    facilityType: FacilityType,
    amount: number = 1
  ): Promise<ServiceResult<void>> {
    return this.executeVoid(
      "downgradeFacility",
      { teamId, facilityType, amount },
      async ({ teamId, facilityType, amount }) => {
        const team = await this.repos.teams.findById(teamId);
        if (!team) throw new Error("Time não encontrado.");

        if (facilityType === "stadium_capacity")
          throw new Error("Não é possível reduzir a capacidade do estádio.");

        if (
          team.activeConstruction &&
          team.activeConstruction.facilityType === facilityType
        ) {
          throw new Error("Não é possível fazer downgrade durante uma obra.");
        }

        const currentLevel = this.getCurrentLevel(team, facilityType);
        const newLevel = currentLevel - amount;

        if (!InfrastructureEconomics.validateDowngrade(currentLevel, amount))
          throw new Error("Nível inválido.");

        const updateData: Partial<Team> = {};
        this.mapFacilityToColumnUpdate(updateData, facilityType, newLevel);
        await this.repos.teams.update(teamId, updateData);

        this.logger.info(
          `📉 Downgrade: ${facilityType} reduzido para ${newLevel}.`
        );
      }
    );
  }
}
