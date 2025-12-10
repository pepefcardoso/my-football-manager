import { FinancialCategory } from "../domain/enums";
import { InfrastructureCosts } from "./config/ServiceConstants";
import type { IRepositoryContainer } from "../repositories/IRepositories";
import { BaseService } from "./BaseService";
import { Result } from "./types/ServiceResults";
import type { ServiceResult } from "./types/ServiceResults";
import { FinancialOperationValidator } from "./validators/FinancialOperationValidator";

export interface InfrastructureStatus {
  stadium: {
    capacity: number;
    quality: number;
    maintenanceCost: number;
  };
  trainingCenter: {
    quality: number;
  };
  youthAcademy: {
    quality: number;
  };
  totalMonthlyCost: number;
}

export type InfrastructureType = "stadium" | "training" | "youth";

export class InfrastructureService extends BaseService {
  constructor(repositories: IRepositoryContainer) {
    super(repositories, "InfrastructureService");
  }

  calculateMonthlyMaintenance(
    stadiumCapacity: number,
    stadiumQuality: number
  ): number {
    const seatMaintenance =
      stadiumCapacity * InfrastructureCosts.MAINTENANCE_COST_PER_SEAT;
    const qualityUpkeep =
      stadiumQuality * InfrastructureCosts.MAINTENANCE_QUALITY_MULTIPLIER;

    const total = Math.round(seatMaintenance + qualityUpkeep);
    this.logger.debug(`Custo de manutenção calculado: €${total}`);

    return total;
  }

  async expandStadium(
    teamId: number,
    seasonId: number
  ): Promise<ServiceResult<void>> {
    return this.executeVoid(
      "expandStadium",
      { teamId, seasonId },
      async ({ teamId, seasonId }) => {
        const team = await this.repos.teams.findById(teamId);
        if (!team) {
          throw new Error(`Time ${teamId} não encontrado.`);
        }

        const cost =
          InfrastructureCosts.SEAT_EXPANSION_BLOCK *
          InfrastructureCosts.SEAT_COST_PER_UNIT;

        const validation = FinancialOperationValidator.validateBudget(
          team.budget || 0,
          cost
        );
        if (!validation.isValid) {
          return Result.businessRule(validation.errors!.join(", ")) as any;
        }

        const newCapacity =
          (team.stadiumCapacity || 0) +
          InfrastructureCosts.SEAT_EXPANSION_BLOCK;
        const newBudget = (team.budget || 0) - cost;

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
          amount: cost,
          description: `Expansão do Estádio (+${InfrastructureCosts.SEAT_EXPANSION_BLOCK} lugares)`,
        });

        this.logger.info(
          `✅ Estádio expandido com sucesso! Nova capacidade: ${newCapacity}`
        );
      }
    );
  }

  async upgradeFacility(
    teamId: number,
    seasonId: number,
    type: InfrastructureType
  ): Promise<ServiceResult<void>> {
    return this.executeVoid(
      "upgradeFacility",
      { teamId, seasonId, type },
      async ({ teamId, seasonId, type }) => {
        const team = await this.repos.teams.findById(teamId);
        if (!team) {
          throw new Error(`Time ${teamId} não encontrado.`);
        }

        const currentQuality =
          type === "stadium"
            ? team.stadiumQuality
            : type === "training"
            ? team.trainingCenterQuality
            : team.youthAcademyQuality;

        if ((currentQuality || 0) >= InfrastructureCosts.MAX_QUALITY) {
          return Result.businessRule(
            "Instalação já está no nível máximo."
          ) as any;
        }

        const cost = Math.round(
          InfrastructureCosts.QUALITY_COST_BASE *
            (1 + (currentQuality || 0) / 50)
        );

        const validation = FinancialOperationValidator.validateBudget(
          team.budget || 0,
          cost
        );
        if (!validation.isValid) {
          return Result.businessRule(validation.errors!.join(", ")) as any;
        }

        const newQuality = Math.min(
          InfrastructureCosts.MAX_QUALITY,
          (currentQuality || 0) + InfrastructureCosts.QUALITY_UPGRADE_BLOCK
        );
        const newBudget = (team.budget || 0) - cost;

        const updateData: any = { budget: newBudget };
        let facilityName = "";

        if (type === "stadium") {
          updateData.stadiumQuality = newQuality;
          facilityName = "Estádio";
        } else if (type === "training") {
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
          amount: cost,
          description: `Melhoria em ${facilityName} (Nível ${newQuality})`,
        });

        this.logger.info(
          `✅ Upgrade concluído em ${facilityName}. Novo nível: ${newQuality}`
        );
      }
    );
  }

  async getInfrastructureStatus(
    teamId: number
  ): Promise<ServiceResult<InfrastructureStatus>> {
    return this.execute("getInfrastructureStatus", teamId, async (teamId) => {
      const team = await this.repos.teams.findById(teamId);
      if (!team) {
        throw new Error(`Time ${teamId} não encontrado.`);
      }

      const maintenanceCost = this.calculateMonthlyMaintenance(
        team.stadiumCapacity || 10000,
        team.stadiumQuality || 50
      );

      return {
        stadium: {
          capacity: team.stadiumCapacity || 10000,
          quality: team.stadiumQuality || 50,
          maintenanceCost,
        },
        trainingCenter: {
          quality: team.trainingCenterQuality || 50,
        },
        youthAcademy: {
          quality: team.youthAcademyQuality || 50,
        },
        totalMonthlyCost: maintenanceCost,
      };
    });
  }

  async getUpgradeCost(
    teamId: number,
    type: InfrastructureType
  ): Promise<ServiceResult<number | null>> {
    return this.execute(
      "getUpgradeCost",
      { teamId, type },
      async ({ teamId, type }) => {
        const team = await this.repos.teams.findById(teamId);
        if (!team) return null;

        const currentQuality =
          type === "stadium"
            ? team.stadiumQuality
            : type === "training"
            ? team.trainingCenterQuality
            : team.youthAcademyQuality;

        if ((currentQuality || 0) >= InfrastructureCosts.MAX_QUALITY) {
          return null;
        }

        return Math.round(
          InfrastructureCosts.QUALITY_COST_BASE *
            (1 + (currentQuality || 0) / 50)
        );
      }
    );
  }

  async getExpansionCost(): Promise<ServiceResult<number>> {
    return Result.success(
      InfrastructureCosts.SEAT_EXPANSION_BLOCK *
        InfrastructureCosts.SEAT_COST_PER_UNIT
    );
  }
}
