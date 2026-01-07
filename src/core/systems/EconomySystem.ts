import { GameState } from "../models/gameState";

export interface EconomyResult {
  dailyExpenses: number;
  logs: string[];
}

export const processDailyEconomy = (state: GameState): EconomyResult => {
  const logs: string[] = [];
  let totalDailyExpenses = 0;

  const MAINTENANCE_COST_PER_LEVEL = 100;
  const userClubId = state.meta.userClubId;

  for (const clubId in state.clubInfras) {
    const infra = state.clubInfras[clubId];
    const totalLevels =
      infra.trainingCenterLevel +
      infra.youthAcademyLevel +
      infra.medicalCenterLevel +
      infra.dataAnalysisCenterLevel +
      infra.administrationLevel;

    const dailyCost = totalLevels * MAINTENANCE_COST_PER_LEVEL;

    if (state.clubFinances[clubId]) {
      state.clubFinances[clubId].balanceCurrent -= dailyCost;
      totalDailyExpenses += dailyCost;

      if (clubId === userClubId && dailyCost > 0) {
        const formattedCost = dailyCost.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
          maximumFractionDigits: 0,
        });
        logs.push(`💸 Custos de manutenção diária: -${formattedCost}`);
      }
    }
  }

  return {
    dailyExpenses: totalDailyExpenses,
    logs,
  };
};
