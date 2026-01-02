import { GameState } from "../models/gameState";
import { Match } from "../models/match";

export interface MatchSystemResult {
  matchesToday: Match[];
}

export const processScheduledMatches = (
  state: GameState
): MatchSystemResult => {
  const matchesToday: Match[] = [];
  const currentDateStart = new Date(state.meta.currentDate);
  currentDateStart.setHours(0, 0, 0, 0);
  const currentDayTime = currentDateStart.getTime();

  for (const matchId in state.matches) {
    const match = state.matches[matchId];
    const matchDate = new Date(match.datetime);
    matchDate.setHours(0, 0, 0, 0);

    if (
      matchDate.getTime() === currentDayTime &&
      match.status === "SCHEDULED"
    ) {
      matchesToday.push(match);
    }
  }

  return { matchesToday };
};
