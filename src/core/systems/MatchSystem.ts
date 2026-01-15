import { v4 as uuidv4 } from "uuid";
import { GameState } from "../models/gameState";
import { Match, MatchEvent } from "../models/match";
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
import { logger } from "../utils/Logger";

export interface MatchSystemResult {
  matchesToday: Match[];
}

export const getDayKey = (timestamp: number): string => {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime().toString();
};

export const indexMatchSchedule = (state: GameState, match: Match): void => {
  if (match.status !== "SCHEDULED") return;

  const key = getDayKey(match.datetime);

  if (!state.matches.scheduledMatches) {
    state.matches.scheduledMatches = {};
  }

  if (!state.matches.scheduledMatches[key]) {
    state.matches.scheduledMatches[key] = [];
  }

  if (!state.matches.scheduledMatches[key].includes(match.id)) {
    state.matches.scheduledMatches[key].push(match.id);
  }
};

export const simulateSingleMatch = async (
  state: GameState,
  match: Match,
  homeContext: TeamMatchContext,
  awayContext: TeamMatchContext
): Promise<MatchEngineResult> => {
  const result = await matchEngine.simulate(match, homeContext, awayContext);

  applyMatchResults(state, match, result);

  return result;
};

export const processScheduledMatches = async (
  state: GameState
): Promise<{ matchesToday: Match[] }> => {
  const matchesToday: Match[] = [];
  const currentDayKey = getDayKey(state.meta.currentDate);

  const scheduledIds = state.matches.scheduledMatches?.[currentDayKey] || [];

  if (scheduledIds.length === 0) {
    return { matchesToday };
  }

  logger.debug(
    "MatchSystem",
    `📅 Encontrados ${scheduledIds.length} jogos agendados para hoje via índice.`
  );

  for (const matchId of scheduledIds) {
    const match = state.matches.matches[matchId];

    if (!match || match.status !== "SCHEDULED") continue;

    if (getDayKey(match.datetime) !== currentDayKey) continue;

    const isUserMatch =
      match.homeClubId === state.meta.userClubId ||
      match.awayClubId === state.meta.userClubId;

    if (!isUserMatch) {
      const homeContext = buildTeamContext(state, match.homeClubId);
      const awayContext = buildTeamContext(state, match.awayClubId);

      await simulateSingleMatch(state, match, homeContext, awayContext);
      matchesToday.push(match);
    } else {
      matchesToday.push(match);
    }
  }

  const remainingScheduled = scheduledIds.filter(
    (id) => state.matches.matches[id]?.status === "SCHEDULED"
  );

  if (remainingScheduled.length === 0) {
    delete state.matches.scheduledMatches[currentDayKey];
  } else {
    state.matches.scheduledMatches[currentDayKey] = remainingScheduled;
  }

  return { matchesToday };
};

export const buildTeamContext = (
  state: GameState,
  clubId: string,
  customLineup?: { startingXI: string[]; bench: string[] }
): TeamMatchContext => {
  const club = state.clubs.clubs[clubId];

  const activePlayerIds = state.market.clubSquadIndex[clubId] || [];

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
