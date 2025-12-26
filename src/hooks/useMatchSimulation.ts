import { useState, useEffect, useCallback } from "react";
import {
  matchSimulationService,
  type MatchSimulationState,
} from "../services/simulation/MatchSimulationService";

export function useMatchSimulation() {
  const [simulation, setSimulation] = useState<MatchSimulationState>(
    matchSimulationService.getState()
  );
  const [speed, setSpeedState] = useState(matchSimulationService.getSpeed());

  useEffect(() => {
    const unsubscribe = matchSimulationService.subscribe((newState) => {
      setSimulation(newState);
    });
    return () => unsubscribe();
  }, []);

  const startMatch = useCallback(async (matchId: number) => {
    await matchSimulationService.startMatch(matchId);
  }, []);

  const pauseMatch = useCallback(() => {
    matchSimulationService.pauseMatch();
  }, []);

  const resumeMatch = useCallback(() => {
    matchSimulationService.resumeMatch();
  }, []);

  const simulateToEnd = useCallback(async () => {
    await matchSimulationService.simulateToEnd();
  }, []);

  const reset = useCallback(() => {
    matchSimulationService.reset();
  }, []);

  const setSpeed = useCallback((newSpeed: number) => {
    matchSimulationService.setSpeed(newSpeed);
    setSpeedState(newSpeed);
  }, []);

  return {
    simulation,
    speed,
    startMatch,
    pauseMatch,
    resumeMatch,
    simulateToEnd,
    reset,
    setSpeed,
  };
}
