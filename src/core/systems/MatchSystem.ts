import { GameState } from "../models/gameState";
import { Match } from "../models/match";
import { Contract } from "../models/contract";
import { Player } from "../models/people";
import {
  matchEngine,
  TeamMatchContext,
  MatchEngineResult,
} from "./MatchEngine";

export interface MatchSystemResult {
  matchesToday: Match[];
}

export const processScheduledMatches = (
  state: GameState
): MatchSystemResult => {
  const matchesToday: Match[] = [];
  const currentDateStart = new Date(state.meta.currentDate);
  currentDateStart.setHours(0, 0, 0, 0);
  const currentDayTime = currentDateStart.getTime();

  for (const matchId in state.matches) {
    const match = state.matches[matchId];
    const matchDate = new Date(match.datetime);
    matchDate.setHours(0, 0, 0, 0);

    if (
      matchDate.getTime() === currentDayTime &&
      match.status === "SCHEDULED"
    ) {
      const homeContext = buildTeamContext(state, match.homeClubId);
      const awayContext = buildTeamContext(state, match.awayClubId);
      const result = matchEngine.simulate(match, homeContext, awayContext);

      applyMatchResults(state, match, result);

      matchesToday.push(match);
    }
  }

  return { matchesToday };
};

const buildTeamContext = (
  state: GameState,
  clubId: string
): TeamMatchContext => {
  const club = state.clubs[clubId];
  const activePlayerIds = Object.values(
    state.contracts as Record<string, Contract>
  )
    .filter(
      (c) =>
        c.clubId === clubId && c.active && c.endDate > state.meta.currentDate
    )
    .map((c) => c.playerId);
  const squad = activePlayerIds
    .map((id) => state.players[id])
    .filter((p) => !!p)
    .map((p) => ({
      ...p,
      _tempOverall: calculateSimpleOverall(p),
    }));

  squad.sort((a, b) => b._tempOverall - a._tempOverall);

  // TODO: No futuro, respeitar posições (GK, DEF, MID, ATT)
  const startingXI = squad.slice(0, 11);
  const bench = squad.slice(11, 18);
  const tactics = state.teamTactics[clubId] || {
    id: "default",
    clubId: clubId,
    formationId: "4-4-2",
    mentality: "BALANCED",
    passingStyle: "MIXED",
    pressingIntensity: "NORMAL",
    tempo: "NORMAL",
  };

  return {
    clubId,
    clubName: club.name,
    tactics,
    startingXI,
    bench,
  };
};

const applyMatchResults = (
  state: GameState,
  match: Match,
  result: MatchEngineResult
) => {
  match.homeGoals = result.homeScore;
  match.awayGoals = result.awayScore;
  match.status = "FINISHED";
  state.matchEvents[match.id] = result.events;
  result.playerStats.forEach((stat) => {
    state.playerMatchStats[stat.id] = stat;

    // TODO: Atualizar stats acumulados da temporada (SeasonStats) aqui
    // updateSeasonStats(state, stat);
  });
};

const calculateSimpleOverall = (p: Player): number => {
  return (p.finishing + p.passing + p.defending + p.speed + p.technique) / 5;
};
