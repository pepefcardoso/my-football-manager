import { useState, useEffect, useMemo, useCallback } from "react";
import { MatchEvent } from "../../core/models/match";
import {
  MatchStatsCalculator,
  LiveMatchStats,
} from "../../core/systems/MatchEngine/MatchStatsCalculator";
import { logger } from "../../core/utils/Logger";

interface UseSafeMatchReplayProps {
  matchId: string;
  homeClubId: string;
  awayClubId: string;
  events: MatchEvent[];
  initialSpeed?: number;
}

interface UseSafeMatchReplayResult {
  currentMinute: number;
  isPlaying: boolean;
  speed: number;
  liveData: LiveMatchStats | null;
  error: string | null;
  actions: {
    togglePlay: () => void;
    setSpeed: (speed: number) => void;
    skipToFinish: () => void;
    retry: () => void;
  };
}

const FALLBACK_STATS: LiveMatchStats = {
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

export const useSafeMatchReplay = ({
  matchId,
  homeClubId,
  awayClubId,
  events,
  initialSpeed = 1,
}: UseSafeMatchReplayProps): UseSafeMatchReplayResult => {
  const [currentMinute, setCurrentMinute] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(initialSpeed);
  const [error, setError] = useState<string | null>(null);

  const visibleEvents = useMemo(() => {
    return events
      .filter((e) => e.minute <= currentMinute)
      .sort((a, b) => b.minute - a.minute);
  }, [events, currentMinute]);

  const calculationResult = useMemo(() => {
    if (error) {
      return { success: false, data: FALLBACK_STATS, error: null };
    }

    try {
      const data = MatchStatsCalculator.calculate(
        visibleEvents,
        homeClubId,
        awayClubId
      );
      return { success: true, data, error: null };
    } catch (e) {
      const errorMessage =
        e instanceof Error
          ? e.message
          : "Erro desconhecido no cálculo de estatísticas";

      return { success: false, data: FALLBACK_STATS, error: errorMessage };
    }
  }, [visibleEvents, homeClubId, awayClubId, error]);

  if (!calculationResult.success && calculationResult.error && !error) {
    setError(calculationResult.error);
    setIsPlaying(false);
  }

  useEffect(() => {
    if (error) {
      logger.error(
        "MatchLive",
        `🔥 Falha crítica no motor de replay (Minuto ${currentMinute})`,
        { matchId, error }
      );
    }
  }, [error, currentMinute, matchId]);

  useEffect(() => {
    if (error) return;
    if (!isPlaying) return;

    const tickRate = 1000 / speed;

    const interval = setInterval(() => {
      setCurrentMinute((prev) => {
        const next = prev + 1;
        if (next >= 94) {
          setIsPlaying(false);
          return 94;
        }
        return next;
      });
    }, tickRate);

    return () => clearInterval(interval);
  }, [isPlaying, speed, error]);

  const togglePlay = useCallback(() => {
    if (!error && currentMinute < 94) setIsPlaying((prev) => !prev);
  }, [error, currentMinute]);

  const changeSpeed = useCallback((newSpeed: number) => {
    setSpeed(newSpeed);
  }, []);

  const skipToFinish = useCallback(() => {
    setIsPlaying(false);
    setCurrentMinute(94);
  }, []);

  const retry = useCallback(() => {
    setError(null);
    setCurrentMinute((prev) => prev + 1);
    setIsPlaying(true);
  }, []);

  return {
    currentMinute,
    isPlaying,
    speed,
    liveData: calculationResult.data,
    error,
    actions: {
      togglePlay,
      setSpeed: changeSpeed,
      skipToFinish,
      retry,
    },
  };
};
