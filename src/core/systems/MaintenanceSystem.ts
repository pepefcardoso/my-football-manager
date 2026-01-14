import { GameState } from "../models/gameState";
import { rebuildStandingsIndex } from "./CompetitionSystem";
import { logger } from "../utils/Logger";

export const rebuildIndices = (state: GameState): void => {
  return logger.time("Maintenance", "Reconstrução de Índices e Caches", () => {
    state.market.playerContractIndex = {};
    state.market.clubSquadIndex = {};

    for (const contractId in state.market.contracts) {
      const contract = state.market.contracts[contractId];
      if (contract.active) {
        state.market.playerContractIndex[contract.playerId] = contractId;

        if (!state.market.clubSquadIndex[contract.clubId]) {
          state.market.clubSquadIndex[contract.clubId] = [];
        }
        state.market.clubSquadIndex[contract.clubId].push(contract.playerId);
      }
    }

    rebuildStandingsIndex(state);
  });
};
