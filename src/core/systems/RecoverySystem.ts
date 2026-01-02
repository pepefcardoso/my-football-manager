import { GameState } from "../models/gameState";
import { PlayerInjury } from "../models/stats";

export interface RecoveryResult {
  recoveredPlayers: string[];
  logs: string[];
}

export const processDailyRecovery = (state: GameState): RecoveryResult => {
  const recoveredPlayers: string[] = [];
  const logs: string[] = [];
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  for (const id in state.playerStates) {
    const pState = state.playerStates[id];

    if (pState.fitness < 100) {
      const recoveryAmount = 5;
      pState.fitness = Math.min(100, pState.fitness + recoveryAmount);
    }
  }

  for (const injuryId in state.playerInjuries) {
    const injury = state.playerInjuries[injuryId];

    if (state.meta.currentDate >= injury.estimatedReturnDate) {
      recoveredPlayers.push(injury.playerId);
      logs.push(`Jogador recuperado de lesão: ${injury.name}`);

      delete state.playerInjuries[injuryId];

      if (state.playerStates[injury.playerId]) {
        state.playerStates[injury.playerId].matchReadiness = 80;
      }
    }
  }

  return { recoveredPlayers, logs };
};
