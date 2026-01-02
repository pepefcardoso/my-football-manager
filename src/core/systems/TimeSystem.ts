import { GameState } from "../models/gameState";
import { Match } from "../models/match";
import { processDailyEconomy } from "./EconomySystem";
import { processDailyRecovery } from "./RecoverySystem";
import { processDailyTraining } from "./TrainingSystem";
import { processScheduledMatches } from "./MatchSystem";

export interface TimeAdvanceResult {
  newDate: number;
  matchesToday: Match[];
  events: string[];
  stats: {
    expensesProcessed: number;
    playersRecovered: number;
  };
}

export function advanceOneDay(state: GameState): TimeAdvanceResult {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const previousDate = state.meta.currentDate;
  const newDate = previousDate + ONE_DAY_MS;
  state.meta.currentDate = newDate;
  state.meta.updatedAt = Date.now();

  const aggregatedEvents: string[] = [];
  const economyResult = processDailyEconomy(state);
  if (economyResult.logs.length > 0)
    aggregatedEvents.push(...economyResult.logs);

  const recoveryResult = processDailyRecovery(state);
  if (recoveryResult.logs.length > 0)
    aggregatedEvents.push(...recoveryResult.logs);

  const trainingResult = processDailyTraining(state);
  const matchResult = processScheduledMatches(state);

  console.log(
    `[TimeSystem] Dia avançado: ${new Date(newDate).toLocaleDateString()}`,
    {
      expenses: economyResult.dailyExpenses,
      recovered: recoveryResult.recoveredPlayers.length,
      matches: matchResult.matchesToday.length,
    }
  );

  return {
    newDate,
    matchesToday: matchResult.matchesToday,
    events: aggregatedEvents,
    stats: {
      expensesProcessed: economyResult.dailyExpenses,
      playersRecovered: recoveryResult.recoveredPlayers.length,
    },
  };
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("pt-BR");
}
