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
import { GameEventBus } from "../lib/GameEventBus";
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
        const amount = type === "stadium_capacity" ? 1000 : 1;

        const upgradeCost = InfrastructureEconomics.getUpgradeCost(
          type,
          currentLevel,
          amount
        );
        const maintenance = InfrastructureEconomics.getMaintenanceCost(
          type,
          currentLevel
        );
        const duration = InfrastructureEconomics.getConstructionDuration(
          type,
          currentLevel,
          amount
        );
        const maxLevel = InfrastructureEconomics.getMaxLevel(type);

        totalMaintenanceCost += maintenance;

        facilities[type] = {
          type,
          name: this.getFacilityName(type),
          currentLevel,
          nextLevel: currentLevel + amount,
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
            currentLevel + amount
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
      { teamId, facilityType },
      async () => {
        const team = await this.repos.teams.findById(teamId);
        if (!team) throw new Error("Time não encontrado.");

        if (team.activeConstruction) {
          throw new Error(
            `Já existe uma obra em andamento (${this.getFacilityName(
              team.activeConstruction.facilityType as FacilityType
            )}). Aguarde a conclusão.`
          );
        }

        const currentLevel = this.getCurrentLevel(team, facilityType);
        const maxLevel = InfrastructureEconomics.getMaxLevel(facilityType);

        if (currentLevel >= maxLevel) {
          throw new Error("Esta instalação já está no nível máximo.");
        }

        const actualAmount = facilityType === "stadium_capacity" ? amount : 1;
        const targetLevel = currentLevel + actualAmount;

        const cost = InfrastructureEconomics.getUpgradeCost(
          facilityType,
          currentLevel,
          actualAmount
        );

        const duration = InfrastructureEconomics.getConstructionDuration(
          facilityType,
          currentLevel,
          actualAmount
        );

        if (team.budget < cost) {
          throw new Error(
            `Saldo insuficiente. Necessário: €${cost.toLocaleString(
              "pt-PT"
            )} | Atual: €${team.budget.toLocaleString("pt-PT")}`
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
          description: `Investimento: ${this.getFacilityName(
            facilityType
          )} (Nível ${targetLevel})`,
        });

        this.logger.info(
          `🔨 Obra iniciada: ${constructionData.facilityType} (Nível ${targetLevel}) para time ${teamId}. Custo: €${cost}`
        );
      }
    );
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

        if (today.getTime() < end.getTime()) {
          return false;
        }

        this.logger.info(
          `✅ Obra finalizada para time ${teamId}: ${construction.facilityType}`
        );

        const updateData: Partial<Team> = {
          activeConstruction: null,
        };

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
          description: `A obra no(a) ${this.getFacilityName(
            construction.facilityType
          )} foi concluída!`,
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
    return this.execute("applyMonthlyMaintenance", { teamId }, async () => {
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
        const level = this.getCurrentLevel(team, type);
        totalCost += InfrastructureEconomics.getMaintenanceCost(type, level);
      }

      if (totalCost > 0) {
        await this.repos.teams.updateBudget(teamId, team.budget - totalCost);

        await this.repos.financial.addRecord({
          teamId,
          seasonId,
          date: currentDate,
          type: "expense",
          category: FinancialCategory.STADIUM_MAINTENANCE,
          amount: totalCost,
          description: "Manutenção Mensal de Infraestrutura Completa",
        });
      }

      return totalCost;
    });
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
}
