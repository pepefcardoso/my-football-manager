import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
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
  const liveStatsJson = useGameStore((state) => {
    if (!matchId) return JSON.stringify(EMPTY_STATS);
    const stats = selectLiveMatchStats(state, matchId, currentMinute);
    return JSON.stringify(stats);
  });

  const liveStats = useMemo<LiveMatchStats>(
    () => JSON.parse(liveStatsJson),
    [liveStatsJson]
  );

  const visibleEvents = useGameStore(
    useShallow((state) => {
      if (!matchId) return [];
      return selectMatchEventsUntilMinute(state, matchId, currentMinute);
    })
  );

  return {
    liveStats,
    visibleEvents,
  };
};
