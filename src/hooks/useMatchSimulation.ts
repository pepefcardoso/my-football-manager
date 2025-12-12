import { useState, useCallback, useRef, useEffect } from "react";
import { MatchState } from "../domain/enums";
import { Logger } from "../lib/Logger";
import type { MatchEventData } from "../domain/types";

interface MatchSimulationState {
  matchId: number;
  state: MatchState;
  currentMinute: number;
  homeScore: number;
  awayScore: number;
  events: MatchEventData[];
  isLoading: boolean;
  error: string | null;
}

interface UseMatchSimulationReturn {
  simulation: MatchSimulationState | null;
  startMatch: (matchId: number) => Promise<void>;
  pauseMatch: () => void;
  resumeMatch: () => void;
  simulateToEnd: () => Promise<void>;
  reset: () => void;
  setSpeed: (speed: number) => void;
  speed: number;
}

const logger = new Logger("useMatchSimulation");

export function useMatchSimulation(): UseMatchSimulationReturn {
  const [simulation, setSimulation] = useState<MatchSimulationState | null>(
    null
  );
  const [speed, setSpeedState] = useState<number>(1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const clearSimulationInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearSimulationInterval();
    };
  }, [clearSimulationInterval]);

  const runSimulationStep = useCallback(
    async (matchId: number) => {
      let update = await window.electronAPI.match.simulateMatchMinute(matchId);

      if (update && "data" in update && "success" in update) {
        update = (update as any).data;
      }

      if (!update) {
        clearSimulationInterval();
        return;
      }

      setSimulation((prev) => {
        if (!prev) return null;

        const newEventsList = update.newEvents || [];
        const newEvents = [...prev.events, ...newEventsList];

        if (update.currentMinute >= 90) {
          clearSimulationInterval();
          return {
            ...prev,
            state: MatchState.FINISHED,
            currentMinute: 90,
            homeScore: update.score.home,
            awayScore: update.score.away,
            events: newEvents,
          };
        }

        return {
          ...prev,
          currentMinute: update.currentMinute,
          homeScore: update.score.home,
          awayScore: update.score.away,
          events: newEvents,
        };
      });
    },
    [clearSimulationInterval]
  );

  const startInterval = useCallback(
    (matchId: number, currentSpeed: number) => {
      if (intervalRef.current) clearInterval(intervalRef.current);

      let delay = 500;
      if (currentSpeed >= 4) delay = 50;
      else if (currentSpeed >= 2) delay = 200;

      intervalRef.current = setInterval(
        () => runSimulationStep(matchId),
        delay
      );
    },
    [runSimulationStep]
  );

  const setSpeed = useCallback(
    (newSpeed: number) => {
      setSpeedState(newSpeed);
      if (simulation && simulation.state === MatchState.PLAYING) {
        startInterval(simulation.matchId, newSpeed);
      }
    },
    [simulation, startInterval]
  );

  const startMatch = useCallback(
    async (matchId: number) => {
      try {
        setSimulation(() => ({
          matchId,
          state: MatchState.NOT_STARTED,
          currentMinute: 0,
          homeScore: 0,
          awayScore: 0,
          events: [],
          isLoading: true,
          error: null,
        }));

        const success = await window.electronAPI.match.startMatch(matchId);

        if (!success) {
          setSimulation((prev) =>
            prev
              ? {
                  ...prev,
                  isLoading: false,
                  error: "Falha ao iniciar partida",
                }
              : null
          );
          return;
        }

        setSimulation((prev) =>
          prev
            ? {
                ...prev,
                state: MatchState.PLAYING,
                isLoading: false,
              }
            : null
        );

        startInterval(matchId, speed);
      } catch (error) {
        logger.error("Erro ao iniciar partida:", error);
        setSimulation((prev) =>
          prev
            ? {
                ...prev,
                isLoading: false,
                error: "Erro ao iniciar partida",
              }
            : null
        );
      }
    },
    [startInterval, speed]
  );

  const pauseMatch = useCallback(() => {
    if (!simulation) return;

    clearSimulationInterval();

    setSimulation((prev) =>
      prev
        ? {
            ...prev,
            state: MatchState.PAUSED,
          }
        : null
    );

    window.electronAPI.match.pauseMatch(simulation.matchId);
  }, [simulation, clearSimulationInterval]);

  const resumeMatch = useCallback(() => {
    if (!simulation || simulation.state !== MatchState.PAUSED) return;

    setSimulation((prev) =>
      prev
        ? {
            ...prev,
            state: MatchState.PLAYING,
          }
        : null
    );

    window.electronAPI.match.resumeMatch(simulation.matchId);
    startInterval(simulation.matchId, speed);
  }, [simulation, startInterval, speed]);

  const simulateToEnd = useCallback(async () => {
    if (!simulation) return;

    clearSimulationInterval();

    setSimulation((prev) =>
      prev
        ? {
            ...prev,
            isLoading: true,
          }
        : null
    );

    try {
      let result = await window.electronAPI.match.simulateFullMatch(
        simulation.matchId
      );

      if (result && "data" in result && "success" in result) {
        result = (result as any).data;
      }

      if (result) {
        setSimulation((prev) =>
          prev
            ? {
                ...prev,
                state: MatchState.FINISHED,
                currentMinute: 90,
                homeScore: result.homeScore,
                awayScore: result.awayScore,
                events: result.events,
                isLoading: false,
              }
            : null
        );
      }
    } catch (error) {
      logger.error("Erro ao simular partida:", error);
      setSimulation((prev) =>
        prev
          ? {
              ...prev,
              isLoading: false,
              error: "Erro ao simular partida",
            }
          : null
      );
    }
  }, [simulation, clearSimulationInterval]);

  const reset = useCallback(() => {
    clearSimulationInterval();
    setSimulation(null);
  }, [clearSimulationInterval]);

  return {
    simulation,
    startMatch,
    pauseMatch,
    resumeMatch,
    simulateToEnd,
    reset,
    setSpeed,
    speed,
  };
}
