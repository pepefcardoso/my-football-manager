import { GameState } from "../core/models/gameState";
import { ID } from "../core/models/types";

export const selectUserClubId = (state: GameState) => state.meta.userClubId;
export const selectCurrentDate = (state: GameState) => state.meta.currentDate;
export const selectClubById = (clubId: ID | null) => (state: GameState) =>
  clubId ? state.clubs.clubs[clubId] : undefined;
export const selectClubFinances = (clubId: ID | null) => (state: GameState) =>
  clubId ? state.clubs.finances[clubId] : undefined;
export const selectClubInfra = (clubId: ID | null) => (state: GameState) =>
  clubId ? state.clubs.infras[clubId] : undefined;

export const selectNextMatchForClub =
  (clubId: ID | null) => (state: GameState) => {
    if (!clubId) return null;

    // TODO: Isso roda a cada render se não usarmos useShallow ou memoização adequada.
    // Em uma app Data-Oriented, filtrar arrays grandes (O(n)) no seletor é aceitável
    // SE usarmos useShallow na ponta.
    const allMatches = Object.values(state.matches.matches);
    const upcomingMatches = allMatches.filter(
      (m) =>
        m.status === "SCHEDULED" &&
        (m.homeClubId === clubId || m.awayClubId === clubId) &&
        m.datetime >= state.meta.currentDate
    );

    upcomingMatches.sort((a, b) => a.datetime - b.datetime);
    return upcomingMatches[0] || null;
  };

export const selectClubPlayerIds =
  (clubId: ID | null) => (state: GameState) => {
    if (!clubId) return [];

    return Object.values(state.market.contracts)
      .filter((c) => c.clubId === clubId && c.active)
      .map((c) => c.playerId);
  };

export const selectPlayerById = (playerId: ID) => (state: GameState) =>
  state.people.players[playerId];

export const selectPlayerStateById = (playerId: ID) => (state: GameState) =>
  state.people.playerStates[playerId];

export const selectContractByPlayerId =
  (playerId: ID) => (state: GameState) => {
    // TODO: Busca cara (O(n)), idealmente teríamos um índice reverso, mas seguimos a estrutura atual
    return Object.values(state.market.contracts).find(
      (c) => c.playerId === playerId && c.active
    );
  };
