import { teamRepository } from "../repositories/TeamRepository";
import { financialRepository } from "../repositories/FinancialRepository";
import { FinancialCategory } from "../domain/enums";

export const INFRASTRUCTURE_COSTS = {
  SEAT_EXPANSION_BLOCK: 1000,
  SEAT_COST_PER_UNIT: 500,
  QUALITY_UPGRADE_BLOCK: 5,
  QUALITY_COST_BASE: 200000,
  MAINTENANCE_COST_PER_SEAT: 2,
};

export class InfrastructureService {
  /**
   * Calcula o custo de manutenção mensal do estádio e CT
   */
  calculateMonthlyMaintenance(
    stadiumCapacity: number,
    stadiumQuality: number
  ): number {
    const seatMaintenance =
      stadiumCapacity * INFRASTRUCTURE_COSTS.MAINTENANCE_COST_PER_SEAT;
    const qualityUpkeep = stadiumQuality * 1000;
    return Math.round(seatMaintenance + qualityUpkeep);
  }

  /**
   * Realiza a expansão da capacidade do estádio
   */
  async expandStadium(
    teamId: number,
    seasonId: number
  ): Promise<{ success: boolean; message: string }> {
    const team = await teamRepository.findById(teamId);
    if (!team) return { success: false, message: "Clube não encontrado." };

    const cost =
      INFRASTRUCTURE_COSTS.SEAT_EXPANSION_BLOCK *
      INFRASTRUCTURE_COSTS.SEAT_COST_PER_UNIT;

    if ((team.budget || 0) < cost) {
      return { success: false, message: "Saldo insuficiente para expansão." };
    }

    const newCapacity =
      (team.stadiumCapacity || 0) + INFRASTRUCTURE_COSTS.SEAT_EXPANSION_BLOCK;
    const newBudget = (team.budget || 0) - cost;

    await teamRepository.update(teamId, {
      stadiumCapacity: newCapacity,
      budget: newBudget,
    });

    await financialRepository.addRecord({
      teamId,
      seasonId,
      date: new Date().toISOString().split("T")[0],
      type: "expense",
      category: FinancialCategory.INFRASTRUCTURE,
      amount: cost,
      description: `Expansão do Estádio (+${INFRASTRUCTURE_COSTS.SEAT_EXPANSION_BLOCK} lugares)`,
    });

    return { success: true, message: "Expansão concluída com sucesso!" };
  }

  async upgradeFacility(
    teamId: number,
    seasonId: number,
    type: "stadium" | "training" | "youth"
  ): Promise<{ success: boolean; message: string }> {
    const team = await teamRepository.findById(teamId);
    if (!team) return { success: false, message: "Clube não encontrado." };

    const currentQuality =
      type === "stadium"
        ? team.stadiumQuality
        : type === "training"
        ? team.trainingCenterQuality
        : team.youthAcademyQuality;

    if ((currentQuality || 0) >= 100) {
      return { success: false, message: "Instalação já está no nível máximo." };
    }

    const cost = Math.round(
      INFRASTRUCTURE_COSTS.QUALITY_COST_BASE * (1 + (currentQuality || 0) / 50)
    );

    if ((team.budget || 0) < cost) {
      return { success: false, message: "Saldo insuficiente para melhoria." };
    }

    const newQuality = Math.min(
      100,
      (currentQuality || 0) + INFRASTRUCTURE_COSTS.QUALITY_UPGRADE_BLOCK
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

    await teamRepository.update(teamId, updateData);

    await financialRepository.addRecord({
      teamId,
      seasonId,
      date: new Date().toISOString().split("T")[0],
      type: "expense",
      category: FinancialCategory.INFRASTRUCTURE,
      amount: cost,
      description: `Melhoria em ${facilityName} (Nível ${newQuality})`,
    });

    return { success: true, message: `Melhoria no ${facilityName} realizada!` };
  }
}

export const infrastructureService = new InfrastructureService();
