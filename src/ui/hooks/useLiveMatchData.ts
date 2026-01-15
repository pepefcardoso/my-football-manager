import { useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import { useStoreWithEqualityFn } from "zustand/traditional";
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

const statsEqualityFn = (a: LiveMatchStats, b: LiveMatchStats): boolean => {
  if (a === b) return true;

  if (a.score.home !== b.score.home || a.score.away !== b.score.away) {
    return false;
  }

  const aStats = a.stats;
  const bStats = b.stats;

  for (const key in aStats) {
    if (
      aStats[key as keyof typeof aStats] !== bStats[key as keyof typeof bStats]
    ) {
      return false;
    }
  }

  return true;
};

export interface LiveMatchDataResult {
  liveStats: LiveMatchStats;
  visibleEvents: MatchEvent[];
}

export const useLiveMatchData = (
  matchId: string | null,
  currentMinute: number
): LiveMatchDataResult => {
  const liveStats = useStoreWithEqualityFn(
    useGameStore,
    useCallback(
      (state) => {
        if (!matchId) return EMPTY_STATS;
        return selectLiveMatchStats(state, matchId, currentMinute);
      },
      [matchId, currentMinute]
    ),
    statsEqualityFn
  );

  const visibleEvents = useGameStore(
    useShallow(
      useCallback(
        (state) => {
          if (!matchId) return [];
          return selectMatchEventsUntilMinute(state, matchId, currentMinute);
        },
        [matchId, currentMinute]
      )
    )
  );

  return {
    liveStats,
    visibleEvents,
  };
};
