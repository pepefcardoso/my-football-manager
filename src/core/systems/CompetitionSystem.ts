import { GameState } from "../models/gameState";
import { Match } from "../models/match";
import { CompetitionStandings } from "../models/competition";
import { logger } from "../utils/Logger";

export const getStandingIndexKey = (
  groupId: string,
  clubId: string
): string => {
  return `${groupId}_${clubId}`;
};

const applyMatchResultToStanding = (
  standing: CompetitionStandings,
  goalsPro: number,
  goalsAgainst: number
) => {
  standing.gamesPlayed += 1;
  standing.goalsScored += goalsPro;
  standing.goalsConceded += goalsAgainst;
  standing.goalsBalance = standing.goalsScored - standing.goalsConceded;

  if (goalsPro > goalsAgainst) {
    standing.wins += 1;
    standing.points += 3;
  } else if (goalsPro === goalsAgainst) {
    standing.draws += 1;
    standing.points += 1;
  } else {
    standing.defeats += 1;
  }
};

const getOrRepairStanding = (
  state: GameState,
  groupId: string,
  clubId: string
): CompetitionStandings | undefined => {
  if (!state.competitions.standingsLookup) {
    state.competitions.standingsLookup = {};
  }

  const key = getStandingIndexKey(groupId, clubId);
  const cachedStandingId = state.competitions.standingsLookup[key];

  if (cachedStandingId) {
    const standing = state.competitions.standings[cachedStandingId];
    if (standing) return standing;

    delete state.competitions.standingsLookup[key];
  }

  const standingEntry = Object.values(state.competitions.standings).find(
    (s) => {
      if (s.competitionGroupId !== groupId) return false;
      const ccs =
        state.competitions.clubCompetitionSeasons[s.clubCompetitionSeasonId];
      return ccs && ccs.clubId === clubId;
    }
  );

  if (standingEntry) {
    state.competitions.standingsLookup[key] = standingEntry.id;
    return standingEntry;
  }

  return undefined;
};

export const updateCompetitionStandings = (
  state: GameState,
  matches: Match[]
): void => {
  if (matches.length === 0) return;

  let updatesCount = 0;

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];

    if (match.status !== "FINISHED" || !match.competitionGroupId) continue;

    const { competitionGroupId, homeClubId, awayClubId, homeGoals, awayGoals } =
      match;

    const homeStanding = getOrRepairStanding(
      state,
      competitionGroupId,
      homeClubId
    );
    const awayStanding = getOrRepairStanding(
      state,
      competitionGroupId,
      awayClubId
    );

    if (homeStanding) {
      applyMatchResultToStanding(homeStanding, homeGoals, awayGoals);
      updatesCount++;
    }

    if (awayStanding) {
      applyMatchResultToStanding(awayStanding, awayGoals, homeGoals);
      updatesCount++;
    }
  }

  if (updatesCount > 0) {
    logger.debug(
      "CompetitionSystem",
      `Tabelas atualizadas para ${matches.length} partidas.`
    );
  }
};

export const rebuildStandingsIndex = (state: GameState): void => {
  state.competitions.standingsLookup = {};
  let count = 0;

  Object.values(state.competitions.standings).forEach((standing) => {
    const ccs =
      state.competitions.clubCompetitionSeasons[
        standing.clubCompetitionSeasonId
      ];

    if (ccs) {
      const key = getStandingIndexKey(standing.competitionGroupId, ccs.clubId);
      state.competitions.standingsLookup[key] = standing.id;
      count++;
    }
  });

  logger.info(
    "CompetitionSystem",
    `♻️ Índices de competição reconstruídos: ${count} entradas.`
  );
};
