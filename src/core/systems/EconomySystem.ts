import { GameState } from "../models/gameState";

export interface EconomyResult {
  dailyExpenses: number;
  logs: string[];
}

export const processDailyEconomy = (state: GameState): EconomyResult => {
  const logs: string[] = [];
  let totalDailyExpenses = 0;

  const MAINTENANCE_COST_PER_LEVEL = 100;

  for (const clubId in state.clubInfras) {
    const infra = state.clubInfras[clubId];
    const totalLevels =
      infra.trainingCenterLevel +
      infra.youthAcademyLevel +
      infra.medicalCenterLevel;

    const dailyCost = totalLevels * MAINTENANCE_COST_PER_LEVEL;

    if (state.clubFinances[clubId]) {
      state.clubFinances[clubId].balanceCurrent -= dailyCost;
      totalDailyExpenses += dailyCost;
    }
  }

  return {
    dailyExpenses: totalDailyExpenses,
    logs,
  };
};
