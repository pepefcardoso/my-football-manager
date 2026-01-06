import { GameState } from "../models/gameState";
import { generateNotification } from "./NotificationSystem";

export interface RecoveryResult {
  recoveredPlayers: string[];
  logs: string[];
}

export const processDailyRecovery = (state: GameState): RecoveryResult => {
  const recoveredPlayers: string[] = [];
  const logs: string[] = [];

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
      
      const logMsg = `Jogador recuperado de lesão: ${injury.name}`;
      logs.push(logMsg);

      const contract = Object.values(state.contracts).find(
        c => c.playerId === injury.playerId && c.active && c.clubId === state.meta.userClubId
      );

      if (contract) {
        generateNotification(
            state,
            "INFO",
            "Retorno de Lesão",
            `${injury.name} recuperou-se totalmente e voltou aos treinos.`,
            { type: "PLAYER", id: injury.playerId }
        );
      }

      delete state.playerInjuries[injuryId];

      if (state.playerStates[injury.playerId]) {
        state.playerStates[injury.playerId].matchReadiness = 80;
      }
    }
  }

  return { recoveredPlayers, logs };
};