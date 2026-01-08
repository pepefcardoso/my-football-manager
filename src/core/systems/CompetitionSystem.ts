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

const findStanding = (
  state: GameState,
  groupId: string,
  clubId: string
): CompetitionStandings | undefined => {
  const key = getStandingIndexKey(groupId, clubId);
  const standingId = state.competitions.standingsLookup[key];

  if (!standingId) return undefined;

  return state.competitions.standings[standingId];
};

export const updateCompetitionStandings = (
  state: GameState,
  matches: Match[]
): void => {
  // TODO: Em produção, o índice deve ser garantido no load/initialSetup.
  if (!state.competitions.standingsLookup) {
    logger.warn(
      "CompetitionSystem",
      "Índice de standings ausente. Reconstruindo on-the-fly..."
    );
    rebuildStandingsIndex(state);
  }

  matches.forEach((match) => {
    if (match.status !== "FINISHED") return;
    if (!match.competitionGroupId) return;

    const homeStanding = findStanding(
      state,
      match.competitionGroupId,
      match.homeClubId
    );
    const awayStanding = findStanding(
      state,
      match.competitionGroupId,
      match.awayClubId
    );

    if (homeStanding)
      updateTeamStats(homeStanding, match.homeGoals, match.awayGoals);

    if (awayStanding)
      updateTeamStats(awayStanding, match.awayGoals, match.homeGoals);
  });
};

const updateTeamStats = (
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

export const rebuildStandingsIndex = (state: GameState): void => {
  state.competitions.standingsLookup = {};

  Object.values(state.competitions.standings).forEach((standing) => {
    const ccs =
      state.competitions.clubCompetitionSeasons[
        standing.clubCompetitionSeasonId
      ];
    if (ccs) {
      const key = getStandingIndexKey(standing.competitionGroupId, ccs.clubId);
      state.competitions.standingsLookup[key] = standing.id;
    }
  });
};
