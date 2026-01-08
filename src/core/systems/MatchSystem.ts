import { v4 as uuidv4 } from "uuid";
import { GameState } from "../models/gameState";
import { Match, MatchEvent } from "../models/match";
import { Contract } from "../models/contract";
import { Player } from "../models/people";
import { PlayerCalculations } from "../models/player";
import {
  matchEngine,
  TeamMatchContext,
  MatchEngineResult,
} from "./MatchEngine";
import { eventBus } from "../events/EventBus";
import { rng } from "../utils/generators";
import { PlayerInjury } from "../models/stats";

export interface MatchSystemResult {
  matchesToday: Match[];
}

export const simulateSingleMatch = (
  state: GameState,
  match: Match,
  homeContext: TeamMatchContext,
  awayContext: TeamMatchContext
): MatchEngineResult => {
  const result = matchEngine.simulate(match, homeContext, awayContext);

  applyMatchResults(state, match, result);

  return result;
};

export const processScheduledMatches = (
  state: GameState
): MatchSystemResult => {
  const matchesToday: Match[] = [];
  const currentDateStart = new Date(state.meta.currentDate);
  currentDateStart.setHours(0, 0, 0, 0);
  const currentDayTime = currentDateStart.getTime();

  for (const matchId in state.matches.matches) {
    const match = state.matches.matches[matchId];

    if (!match) continue;

    const matchDate = new Date(match.datetime);
    matchDate.setHours(0, 0, 0, 0);

    if (
      matchDate.getTime() === currentDayTime &&
      match.status === "SCHEDULED"
    ) {
      const isUserMatch =
        match.homeClubId === state.meta.userClubId ||
        match.awayClubId === state.meta.userClubId;

      if (!isUserMatch) {
        const homeContext = buildTeamContext(state, match.homeClubId);
        const awayContext = buildTeamContext(state, match.awayClubId);
        simulateSingleMatch(state, match, homeContext, awayContext);

        matchesToday.push(match);
      }
    }
  }

  return { matchesToday };
};

export const buildTeamContext = (
  state: GameState,
  clubId: string,
  customLineup?: { startingXI: string[]; bench: string[] }
): TeamMatchContext => {
  const club = state.clubs.clubs[clubId];

  const activePlayerIds = Object.values(
    state.market.contracts as Record<string, Contract>
  )
    .filter(
      (c) =>
        c.clubId === clubId && c.active && c.endDate > state.meta.currentDate
    )
    .map((c) => c.playerId);

  const squad = activePlayerIds
    .map((id) => state.people.players[id])
    .filter((p) => !!p)
    .map((p) => ({
      ...p,
      _tempOverall: PlayerCalculations.calculateOverall(p),
    }));

  let startingXI: Player[] = [];
  let bench: Player[] = [];

  if (customLineup) {
    startingXI = customLineup.startingXI
      .map((id) => state.people.players[id])
      .filter(Boolean);
    bench = customLineup.bench
      .map((id) => state.people.players[id])
      .filter(Boolean);
  } else {
    squad.sort((a, b) => b._tempOverall - a._tempOverall);
    startingXI = squad.slice(0, 11);
    bench = squad.slice(11, 18);
  }

  const tactics = state.matches.teamTactics[clubId] || {
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
  state.matches.events[match.id] = result.events;
  result.playerStats.forEach((stat) => {
    state.matches.playerStats[stat.id] = stat;
  });
  processMatchInjuries(state, result.events);
  eventBus.emit(state, "MATCH_FINISHED", {
    matchId: match.id,
    homeScore: result.homeScore,
    awayScore: result.awayScore,
  });
};

const processMatchInjuries = (state: GameState, events: MatchEvent[]) => {
  const injuryEvents = events.filter((e) => e.type === "INJURY");

  injuryEvents.forEach((event) => {
    const severityRoll = rng.range(1, 100);
    let severity = "Leve";
    let daysOut = rng.range(3, 10);

    if (severityRoll > 90) {
      severity = "Grave";
      daysOut = rng.range(60, 180);
    } else if (severityRoll > 70) {
      severity = "Moderada";
      daysOut = rng.range(14, 45);
    }

    const injuryId = uuidv4();
    const returnDate = state.meta.currentDate + daysOut * 24 * 60 * 60 * 1000;

    const injury: PlayerInjury = {
      id: injuryId,
      playerId: event.playerId,
      name: "Lesão em Jogo",
      severity,
      startDate: state.meta.currentDate,
      estimatedReturnDate: returnDate,
    };

    state.people.playerInjuries[injuryId] = injury;

    if (state.people.playerStates[event.playerId]) {
      state.people.playerStates[event.playerId].fitness = 50;
      state.people.playerStates[event.playerId].matchReadiness = 0;
    }

    eventBus.emit(state, "PLAYER_INJURY_OCCURRED", {
      playerId: event.playerId,
      injuryName: "Lesão durante a partida",
      severity,
      daysOut,
    });
  });
};
