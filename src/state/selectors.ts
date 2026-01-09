import { createSelector } from "reselect";
import { GameState } from "../core/models/gameState";
import { ID } from "../core/models/types";

const selectClubsDomain = (state: GameState) => state.clubs;
const selectMetaDomain = (state: GameState) => state.meta;
const selectContracts = (state: GameState) => state.market.contracts;
const selectMatchesMap = (state: GameState) => state.matches.matches;
const selectPlayers = (state: GameState) => state.people.players;
const selectPlayerStates = (state: GameState) => state.people.playerStates;
const selectCurrentDateRaw = (state: GameState) => state.meta.currentDate;
const selectClubIdArg = (_: GameState, clubId: ID | null) => clubId;
const selectPlayerIdArg = (_: GameState, playerId: ID) => playerId;

export const selectUserClubId = createSelector(
  [selectMetaDomain],
  (meta) => meta.userClubId
);

export const selectCurrentDateMemo = createSelector(
  [selectMetaDomain],
  (meta) => meta.currentDate
);

const _selectClubById = createSelector(
  [selectClubsDomain, selectClubIdArg],
  (clubsDomain, clubId) => (clubId ? clubsDomain.clubs[clubId] : undefined)
);

const _selectClubFinances = createSelector(
  [selectClubsDomain, selectClubIdArg],
  (clubsDomain, clubId) => (clubId ? clubsDomain.finances[clubId] : undefined)
);

const _selectClubInfra = createSelector(
  [selectClubsDomain, selectClubIdArg],
  (clubsDomain, clubId) => (clubId ? clubsDomain.infras[clubId] : undefined)
);

const _selectClubPlayerIds = createSelector(
  [selectContracts, selectClubIdArg],
  (contracts, clubId) => {
    if (!clubId) return [];

    return Object.values(contracts)
      .filter((c) => c.clubId === clubId && c.active)
      .map((c) => c.playerId);
  }
);

const _selectNextMatchForClub = createSelector(
  [selectMatchesMap, selectCurrentDateRaw, selectClubIdArg],
  (matchesMap, currentDate, clubId) => {
    if (!clubId) return null;

    const allMatches = Object.values(matchesMap);

    const upcomingMatches = allMatches.filter(
      (m) =>
        m.status === "SCHEDULED" &&
        (m.homeClubId === clubId || m.awayClubId === clubId) &&
        m.datetime >= currentDate
    );

    if (upcomingMatches.length === 0) return null;

    upcomingMatches.sort((a, b) => a.datetime - b.datetime);

    return upcomingMatches[0];
  }
);

const _selectContractByPlayerId = createSelector(
  [selectContracts, selectPlayerIdArg],
  (contracts, playerId) => {
    return Object.values(contracts).find(
      (c) => c.playerId === playerId && c.active
    );
  }
);

export const selectCurrentDate = selectCurrentDateMemo;

export const selectClubById = (clubId: ID | null) => (state: GameState) =>
  _selectClubById(state, clubId);

export const selectClubFinances = (clubId: ID | null) => (state: GameState) =>
  _selectClubFinances(state, clubId);

export const selectClubInfra = (clubId: ID | null) => (state: GameState) =>
  _selectClubInfra(state, clubId);

export const selectClubPlayerIds = (clubId: ID | null) => (state: GameState) =>
  _selectClubPlayerIds(state, clubId);

export const selectNextMatchForClub =
  (clubId: ID | null) => (state: GameState) =>
    _selectNextMatchForClub(state, clubId);

export const selectPlayerById = (playerId: ID) => (state: GameState) =>
  selectPlayers(state)[playerId];

export const selectPlayerStateById = (playerId: ID) => (state: GameState) =>
  selectPlayerStates(state)[playerId];

export const selectContractByPlayerId = (playerId: ID) => (state: GameState) =>
  _selectContractByPlayerId(state, playerId);

export interface NextMatchViewData {
  matchId: string;
  opponentId: string;
  opponentName: string;
  opponentBadgeId: string;
  datetime: number;
  isHome: boolean;
  locationLabel: "(C)" | "(F)";
  competitionGroupId: string;
}

export const selectDashboardNextMatchInfo = createSelector(
  [selectUserClubId, selectMatchesMap, selectClubsDomain, selectCurrentDateRaw],
  (
    userClubId,
    matchesMap,
    clubsDomain,
    currentDate
  ): NextMatchViewData | null => {
    if (!userClubId) return null;

    const allMatches = Object.values(matchesMap);
    const upcomingMatches = allMatches.filter(
      (m) =>
        m.status === "SCHEDULED" &&
        (m.homeClubId === userClubId || m.awayClubId === userClubId) &&
        m.datetime >= currentDate
    );

    if (upcomingMatches.length === 0) return null;

    upcomingMatches.sort((a, b) => a.datetime - b.datetime);
    const nextMatch = upcomingMatches[0];

    const isHome = nextMatch.homeClubId === userClubId;
    const opponentId = isHome ? nextMatch.awayClubId : nextMatch.homeClubId;
    const opponentClub = clubsDomain.clubs[opponentId];

    return {
      matchId: nextMatch.id,
      opponentId,
      opponentName: opponentClub ? opponentClub.name : "Desconhecido",
      opponentBadgeId: opponentClub ? opponentClub.badgeId : "generic",
      datetime: nextMatch.datetime,
      isHome,
      locationLabel: isHome ? "(C)" : "(F)",
      competitionGroupId: nextMatch.competitionGroupId,
    };
  }
);
