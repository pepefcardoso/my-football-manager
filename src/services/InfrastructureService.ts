import { FinancialCategory } from "../domain/enums";
import { InfrastructureCosts } from "./config/ServiceConstants";
import { Logger } from "../lib/Logger";
import type { IRepositoryContainer } from "../repositories/IRepositories";
import { repositoryContainer } from "../repositories/RepositoryContainer";

export class InfrastructureService {
  private logger: Logger;
  private repos: IRepositoryContainer;

  constructor(repositories: IRepositoryContainer) {
    this.repos = repositories;
    this.logger = new Logger("InfrastructureService");
  }

  /**
   * Calcula o custo de manutenção mensal do estádio e CT
   */
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

  /**
   * Realiza a expansão da capacidade do estádio
   */
  async expandStadium(
    teamId: number,
    seasonId: number
  ): Promise<{ success: boolean; message: string }> {
    this.logger.info(`Iniciando expansão de estádio para o time ${teamId}...`);

    try {
      const team = await this.repos.teams.findById(teamId);
      if (!team) {
        this.logger.warn(`Time ${teamId} não encontrado.`);
        return { success: false, message: "Clube não encontrado." };
      }

      const cost =
        InfrastructureCosts.SEAT_EXPANSION_BLOCK *
        InfrastructureCosts.SEAT_COST_PER_UNIT;

      if ((team.budget || 0) < cost) {
        this.logger.warn(
          `Orçamento insuficiente para expansão. Necessário: €${cost}, Atual: €${team.budget}`
        );
        return { success: false, message: "Saldo insuficiente para expansão." };
      }

      const newCapacity =
        (team.stadiumCapacity || 0) + InfrastructureCosts.SEAT_EXPANSION_BLOCK;
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
      return { success: true, message: "Expansão concluída com sucesso!" };
    } catch (error) {
      this.logger.error("Erro ao expandir estádio:", error);
      return { success: false, message: "Erro interno ao processar expansão." };
    }
  }

  async upgradeFacility(
    teamId: number,
    seasonId: number,
    type: "stadium" | "training" | "youth"
  ): Promise<{ success: boolean; message: string }> {
    this.logger.info(
      `Iniciando melhoria de infraestrutura (${type}) para o time ${teamId}...`
    );

    try {
      const team = await this.repos.teams.findById(teamId);
      if (!team) {
        this.logger.warn(`Time ${teamId} não encontrado.`);
        return { success: false, message: "Clube não encontrado." };
      }

      const currentQuality =
        type === "stadium"
          ? team.stadiumQuality
          : type === "training"
          ? team.trainingCenterQuality
          : team.youthAcademyQuality;

      if ((currentQuality || 0) >= InfrastructureCosts.MAX_QUALITY) {
        this.logger.info("Instalação já está no nível máximo.");
        return {
          success: false,
          message: "Instalação já está no nível máximo.",
        };
      }

      const cost = Math.round(
        InfrastructureCosts.QUALITY_COST_BASE * (1 + (currentQuality || 0) / 50)
      );

      if ((team.budget || 0) < cost) {
        this.logger.warn(
          `Orçamento insuficiente para upgrade. Necessário: €${cost}`
        );
        return { success: false, message: "Saldo insuficiente para melhoria." };
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
      return {
        success: true,
        message: `Melhoria no ${facilityName} realizada!`,
      };
    } catch (error) {
      this.logger.error(`Erro ao realizar upgrade de ${type}:`, error);
      return { success: false, message: "Erro interno ao processar melhoria." };
    }
  }
}

export function createInfrastructureService(
  repos: IRepositoryContainer
): InfrastructureService {
  return new InfrastructureService(repos);
}

export const infrastructureService = new InfrastructureService(
  repositoryContainer
);
