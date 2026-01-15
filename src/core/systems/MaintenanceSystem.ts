import { GameState } from "../models/gameState";
import { rebuildStandingsIndex } from "./CompetitionSystem";
import { indexMatchSchedule } from "./MatchSystem";
import { logger } from "../utils/Logger";

export const rebuildIndices = (state: GameState): void => {
  return logger.time("Maintenance", "Reconstrução de Índices e Caches", () => {
    state.market.playerContractIndex = {};
    state.market.clubSquadIndex = {};
    state.matches.scheduledMatches = {};

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

    let scheduledCount = 0;
    const allMatchIds = Object.keys(state.matches.matches);

    for (const matchId of allMatchIds) {
      const match = state.matches.matches[matchId];
      if (match.status === "SCHEDULED") {
        indexMatchSchedule(state, match);
        scheduledCount++;
      }
    }

    rebuildStandingsIndex(state);

    logger.info(
      "Maintenance",
      `📊 Índices reconstruídos. Jogos agendados indexados: ${scheduledCount}`
    );
  });
};
