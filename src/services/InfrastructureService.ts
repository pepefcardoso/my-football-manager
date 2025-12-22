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
} from "../domain/types/InfrastructureTypes";
import type { GameEventBus } from "../lib/GameEventBus";
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
        "training",
        "medical",
        "youth",
        "admin",
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

      let projectedMaintenance = totalMaintenanceCost;
      if (team.activeConstruction) {
        const type = team.activeConstruction.facilityType as FacilityType;
        const currentMaint = InfrastructureEconomics.getMaintenanceCost(
          type,
          team.activeConstruction.startLevel
        );
        const targetMaint = InfrastructureEconomics.getMaintenanceCost(
          type,
          team.activeConstruction.targetLevel!
        );
        projectedMaintenance =
          totalMaintenanceCost - currentMaint + targetMaint;
      }

      return {
        teamId,
        budget: team.budget,
        facilities: facilities as Record<FacilityType, FacilityStatus>,
        activeConstruction:
          team.activeConstruction as ActiveConstruction | null,
        totalMaintenanceCost,
        projectedMaintenanceAfterUpgrade: projectedMaintenance,
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
            "Já existe uma obra em andamento. Aguarde a conclusão."
          );
        }

        const currentLevel = this.getCurrentLevel(team, facilityType);
        const maxLevel = InfrastructureEconomics.getMaxLevel(facilityType);

        if (currentLevel >= maxLevel) {
          throw new Error("Instalação já está no nível máximo.");
        }

        const actualAmount = facilityType === "stadium_capacity" ? amount : 1;
        const targetLevel = currentLevel + actualAmount;

        const cost = InfrastructureEconomics.getUpgradeCost(
          facilityType,
          currentLevel,
          actualAmount
        );

        if (team.budget < cost) {
          throw new Error(
            `Saldo insuficiente. Necessário: €${cost.toLocaleString()}`
          );
        }

        const duration = InfrastructureEconomics.getConstructionDuration(
          facilityType,
          currentLevel,
          actualAmount
        );

        const gameState = await this.repos.gameState.findCurrent();
        const startDate = new Date(gameState?.currentDate || new Date());
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + duration);

        const constructionData: ActiveConstruction = {
          facilityType,
          startLevel: currentLevel,
          targetLevel: targetLevel,
          cost,
          startDate: startDate.toISOString().split("T")[0],
          endDate: endDate.toISOString().split("T")[0],
          daysRemaining: duration,
        };

        await this.repos.teams.update(teamId, {
          budget: team.budget - cost,
          activeConstruction: constructionData,
        });

        await this.repos.financial.addRecord({
          teamId,
          seasonId: gameState?.currentSeasonId || 1,
          date: constructionData.startDate,
          type: "expense",
          category: FinancialCategory.INFRASTRUCTURE,
          amount: cost,
          description: `Início de obra: ${this.getFacilityName(
            facilityType
          )} (Nível ${targetLevel})`,
        });

        this.logger.info(
          `🔨 Obra iniciada: ${constructionData.facilityType} para time ${teamId}. Término: ${constructionData.endDate}`
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

        const diffTime = end.getTime() - today.getTime();
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (daysRemaining > 0) {
          return false;
        }

        this.logger.info(
          `✅ Obra finalizada para time ${teamId}: ${construction.facilityType}`
        );

        const updateData: Partial<Team> = {
          activeConstruction: null,
        };

        this.applyLevelUpdate(
          updateData,
          construction.facilityType,
          construction.targetLevel!
        );

        await this.repos.teams.update(teamId, updateData);

        // TODO: Enviar notificação/evento para o usuário (via EventBus)
        // await this.eventBus.publish(GameEventType.INFRASTRUCTURE_COMPLETED, { ... });

        return true;
      }
    );
  }

  /**
   * Chamado no dia 1 de cada mês.
   * Cobra a manutenção de todas as instalações.
   */
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
        "training",
        "medical",
        "youth",
        "admin",
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
          description: "Manutenção Mensal de Infraestrutura",
        });
      }

      return totalCost;
    });
  }

  async applySeasonDegradation(
    teamId: number
  ): Promise<ServiceResult<string[]>> {
    return this.execute("applySeasonDegradation", teamId, async (teamId) => {
      const team = await this.repos.teams.findById(teamId);
      if (!team) return [];

      const logs: string[] = [];
      const updateData: Partial<Team> = {};

      const degrade = (
        type: FacilityType,
        currentLevel: number,
        label: string
      ) => {
        if (type === "stadium_capacity") return;

        let loss = 0;
        if (currentLevel >= 90) loss = 5 + Math.floor(Math.random() * 3);
        else if (currentLevel >= 70) loss = 3 + Math.floor(Math.random() * 2);
        else if (currentLevel >= 30) loss = 1 + Math.floor(Math.random() * 2);

        if (loss > 0) {
          const newLevel = Math.max(0, currentLevel - loss);
          this.applyLevelUpdate(updateData, type, newLevel);
          logs.push(
            `${label}: desgaste de equipamentos reduziu qualidade em -${loss} (Novo: ${newLevel})`
          );
        }
      };

      degrade("stadium_quality", team.stadiumQuality, "Estádio (Qualidade)");
      degrade("training", team.trainingCenterQuality, "Centro de Treinamento");
      degrade("medical", team.medicalCenterQuality, "Centro Médico");
      degrade("youth", team.youthAcademyQuality, "Academia de Base");
      degrade(
        "admin",
        team.administrativeCenterQuality,
        "Centro Administrativo"
      );

      if (Object.keys(updateData).length > 0) {
        await this.repos.teams.update(teamId, updateData);
      }

      return logs;
    });
  }

  private getCurrentLevel(team: Team, type: FacilityType): number {
    switch (type) {
      case "stadium_capacity":
        return team.stadiumCapacity;
      case "stadium_quality":
        return team.stadiumQuality;
      case "training":
        return team.trainingCenterQuality;
      case "medical":
        return team.medicalCenterQuality;
      case "youth":
        return team.youthAcademyQuality;
      case "admin":
        return team.administrativeCenterQuality;
      default:
        return 0;
    }
  }

  private applyLevelUpdate(
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
      case "training":
        data.trainingCenterQuality = newLevel;
        break;
      case "medical":
        data.medicalCenterQuality = newLevel;
        break;
      case "youth":
        data.youthAcademyQuality = newLevel;
        break;
      case "admin":
        data.administrativeCenterQuality = newLevel;
        break;
    }
  }

  private getFacilityName(type: FacilityType): string {
    const names: Record<FacilityType, string> = {
      stadium_capacity: "Expansão do Estádio",
      stadium_quality: "Melhoria do Estádio",
      training: "Centro de Treinamento",
      medical: "Centro Médico",
      youth: "Academia de Base",
      admin: "Centro Administrativo",
    };
    return names[type];
  }
}
