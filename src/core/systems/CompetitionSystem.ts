import { GameState } from "../models/gameState";
import { Match } from "../models/match";
import { CompetitionStandings } from "../models/competition";

const findStanding = (
  state: GameState,
  groupId: string,
  clubId: string
): CompetitionStandings | undefined => {
  return Object.values(state.standings).find((s) => {
    if (s.competitionGroupId !== groupId) return false;

    const ccsEntry = state.clubCompetitionSeasons[s.clubCompetitionSeasonId];

    return ccsEntry && ccsEntry.clubId === clubId;
  });
};

export const updateCompetitionStandings = (
  state: GameState,
  matches: Match[]
): void => {
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
