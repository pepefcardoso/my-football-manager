import { GameState } from "../models/gameState";
import { getStandingIndexKey } from "./CompetitionSystem";
import { logger } from "../utils/Logger";

export const rebuildIndices = (state: GameState): void => {
  logger.time("Maintenance", "Reconstrução de Índices", () => {
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

    state.competitions.standingsLookup = {};
    for (const standingId in state.competitions.standings) {
      const standing = state.competitions.standings[standingId];
      const ccs =
        state.competitions.clubCompetitionSeasons[
          standing.clubCompetitionSeasonId
        ];

      if (ccs) {
        const key = getStandingIndexKey(
          standing.competitionGroupId,
          ccs.clubId
        );
        state.competitions.standingsLookup[key] = standingId;
      }
    }
  });
};
