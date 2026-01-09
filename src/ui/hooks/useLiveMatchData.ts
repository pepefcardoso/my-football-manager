import { useCallback } from "react";
import { useGameStore } from "../../state/useGameStore";
import {
  selectLiveMatchStats,
  selectMatchEventsUntilMinute,
} from "../../state/selectors";
import { MatchEvent } from "../../core/models/match";
import { LiveMatchStats } from "../../core/systems/MatchEngine/MatchStatsCalculator";

const EMPTY_STATS: LiveMatchStats = {
  score: { home: 0, away: 0 },
  stats: {
    homeCards: 0,
    awayCards: 0,
    homeShots: 0,
    awayShots: 0,
    homeYellows: 0,
    awayYellows: 0,
    homeReds: 0,
    awayReds: 0,
    homePossession: 50,
    awayPossession: 50,
  },
};

export interface LiveMatchDataResult {
  liveStats: LiveMatchStats;
  visibleEvents: MatchEvent[];
}

export const useLiveMatchData = (
  matchId: string | null,
  currentMinute: number
): LiveMatchDataResult => {
  const liveStats = useGameStore(
    useCallback(
      (state) => {
        if (!matchId) return EMPTY_STATS;
        return selectLiveMatchStats(state, matchId, currentMinute);
      },
      [matchId, currentMinute]
    )
  );

  const visibleEvents = useGameStore(
    useCallback(
      (state) => {
        if (!matchId) return [];
        return selectMatchEventsUntilMinute(state, matchId, currentMinute);
      },
      [matchId, currentMinute]
    )
  );

  return {
    liveStats,
    visibleEvents,
  };
};
