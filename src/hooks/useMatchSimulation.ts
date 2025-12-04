import { useState, useCallback, useRef, useEffect } from "react";
import { MatchState, type MatchEvent } from "../engine/MatchEngine";

interface MatchSimulationState {
  matchId: number;
  state: MatchState;
  currentMinute: number;
  homeScore: number;
  awayScore: number;
  events: MatchEvent[];
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
}

export function useMatchSimulation(): UseMatchSimulationReturn {
  const [simulation, setSimulation] = useState<MatchSimulationState | null>(
    null
  );
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

        const success = await window.electronAPI.startMatch(matchId);

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

        intervalRef.current = setInterval(async () => {
          const update = await window.electronAPI.simulateMatchMinute(matchId);

          if (!update) {
            clearSimulationInterval();
            return;
          }

          setSimulation((prev) => {
            if (!prev) return null;

            const newEvents = [...prev.events, ...update.newEvents];

            if (update.currentMinute >= 90) {
              clearSimulationInterval();
              return {
                ...prev,
                state: MatchState.FINISHED,
                currentMinute: update.currentMinute,
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
        }, 500);
      } catch (error) {
        console.error("Erro ao iniciar partida:", error);
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
    [clearSimulationInterval]
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

    window.electronAPI.pauseMatch(simulation.matchId);
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

    window.electronAPI.resumeMatch(simulation.matchId);

    intervalRef.current = setInterval(async () => {
      const update = await window.electronAPI.simulateMatchMinute(
        simulation.matchId
      );

      if (!update) {
        clearSimulationInterval();
        return;
      }

      setSimulation((prev) => {
        if (!prev) return null;

        const newEvents = [...prev.events, ...update.newEvents];

        if (update.currentMinute >= 90) {
          clearSimulationInterval();
          return {
            ...prev,
            state: MatchState.FINISHED,
            currentMinute: update.currentMinute,
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
    }, 500);
  }, [simulation, clearSimulationInterval]);

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
      const result = await window.electronAPI.simulateFullMatch(
        simulation.matchId
      );

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
      console.error("Erro ao simular partida:", error);
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
  };
}
