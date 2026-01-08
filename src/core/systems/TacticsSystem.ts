import { Player } from "../models/people";
import { Contract } from "../models/contract";
import { ID } from "../models/types";
import { PlayerCalculations } from "../models/player";

export interface LineupRecommendation {
  starters: ID[];
  bench: ID[];
  reserves: ID[];
}

export class TacticsSystem {
  static suggestOptimalLineup(
    clubId: ID | null,
    players: Record<ID, Player>,
    contracts: Record<ID, Contract>
  ): LineupRecommendation {
    if (!clubId) {
      return { starters: [], bench: [], reserves: [] };
    }

    const clubContracts = Object.values(contracts).filter(
      (c) => c.clubId === clubId && c.active
    );

    const availablePlayers = clubContracts
      .map((c) => players[c.playerId])
      .filter((p): p is Player => !!p);

    const rankedPlayers = availablePlayers.map((player) => ({
      id: player.id,
      overall: PlayerCalculations.calculateOverall(player),
    }));

    rankedPlayers.sort((a, b) => b.overall - a.overall);

    const starters = rankedPlayers.slice(0, 11).map((p) => p.id);
    const bench = rankedPlayers.slice(11, 18).map((p) => p.id);
    const reserves = rankedPlayers.slice(18).map((p) => p.id);

    return {
      starters,
      bench,
      reserves,
    };
  }
}