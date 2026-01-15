import { createSelector } from "reselect";
import { GameState } from "../core/models/gameState";
import { ID } from "../core/models/types";
import {
  MatchStatsCalculator,
  LiveMatchStats,
} from "../core/systems/MatchEngine/MatchStatsCalculator";
import { MatchEvent } from "../core/models/match";

const selectClubsDomain = (state: GameState) => state.clubs;
const selectMetaDomain = (state: GameState) => state.meta;
const selectContracts = (state: GameState) => state.market.contracts;
const selectMarketIndices = (state: GameState) => state.market;
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
  [selectMarketIndices, selectClubIdArg],
  (market, clubId) => {
    if (!clubId) return [];
    return market.clubSquadIndex[clubId] || [];
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
  [selectContracts, selectMarketIndices, selectPlayerIdArg],
  (contracts, market, playerId) => {
    const contractId = market.playerContractIndex[playerId];
    if (!contractId) return undefined;

    const contract = contracts[contractId];

    return contract && contract.active ? contract : undefined;
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

const EMPTY_LIVE_STATS: LiveMatchStats = {
  score: { home: 0, away: 0 },
  stats: {
    homeCards: 0,
    awayCards: 0,
    homeShots: 0,
    awayShots: 0,
    homeYellows: 0,
    awayYellows: 0,
    homeReds: 0,
    awayReds: 0,
    homePossession: 50,
    awayPossession: 50,
  },
};

export const selectMatchEventsUntilMinute = (
  state: GameState,
  matchId: ID,
  minute: number
): MatchEvent[] => {
  const matchEvents = state.matches.events[matchId] || [];

  return matchEvents
    .filter((e) => e.minute <= minute)
    .sort((a, b) => b.minute - a.minute);
};

export const selectLiveMatchStats = (
  state: GameState,
  matchId: ID,
  minute: number
): LiveMatchStats => {
  const match = state.matches.matches[matchId];
  if (!match) return EMPTY_LIVE_STATS;

  const allEvents = state.matches.events[matchId] || [];
  const eventsUntilNow = allEvents.filter((e) => e.minute <= minute);

  return MatchStatsCalculator.calculate(
    eventsUntilNow,
    match.homeClubId,
    match.awayClubId
  );
};

export const selectMatchContext = createSelector(
  [
    (state: GameState) => state.matches.matches,
    (state: GameState) => state.clubs.clubs,
    (_: GameState, matchId: string | null) => matchId,
  ],
  (matches, clubs, matchId) => {
    if (!matchId || !matches[matchId]) return null;
    const match = matches[matchId];

    return {
      match,
      homeClub: clubs[match.homeClubId],
      awayClub: clubs[match.awayClubId],
    };
  }
);

export const selectMatchLineups = createSelector(
  [
    (state: GameState) => state.matches.playerStats,
    (_: GameState, matchId: string | null) => matchId,
    (state: GameState, matchId: string | null) => {
      if (!matchId || !state.matches.matches[matchId]) return null;
      return {
        homeId: state.matches.matches[matchId].homeClubId,
        awayId: state.matches.matches[matchId].awayClubId,
      };
    },
  ],
  (playerStats, matchId, clubIds) => {
    if (!matchId || !clubIds) return { homeStarters: [], awayStarters: [] };

    const matchStats = Object.values(playerStats).filter(
      (s) => s.matchId === matchId && s.isStarter
    );

    return {
      homeStarters: matchStats.filter((s) => s.clubId === clubIds.homeId),
      awayStarters: matchStats.filter((s) => s.clubId === clubIds.awayId),
    };
  }
);

export const selectAllPlayers = (state: GameState) => state.people.players;
