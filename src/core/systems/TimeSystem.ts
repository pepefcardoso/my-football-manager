import { GameState } from "../models/gameState";
import { Match } from "../models/match";
import { processDailyEconomy } from "./EconomySystem";
import { processDailyRecovery } from "./RecoverySystem";
import { processDailyTraining } from "./TrainingSystem";
import { processScheduledMatches } from "./MatchSystem";
import { updateCompetitionStandings } from "./CompetitionSystem";
import { processDailyNotifications } from "./NotificationSystem";

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

  if (matchResult.matchesToday.length > 0) {
    updateCompetitionStandings(state, matchResult.matchesToday);
  }

  processDailyNotifications(state);

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

export function getNextSimulationTarget(
  state: GameState
): { date: number; match: Match | null } | null {
  const userClubId = state.meta.userClubId;
  if (!userClubId) return null;

  const allMatches = Object.values(state.matches);
  const futureMatches = allMatches.filter(
    (m) =>
      m.status === "SCHEDULED" &&
      (m.homeClubId === userClubId || m.awayClubId === userClubId) &&
      m.datetime > state.meta.currentDate
  );

  futureMatches.sort((a, b) => a.datetime - b.datetime);

  if (futureMatches.length === 0) return null;

  const nextMatch = futureMatches[0];
  const targetDate = new Date(nextMatch.datetime).setHours(0, 0, 0, 0);

  return {
    date: targetDate,
    match: nextMatch,
  };
}
