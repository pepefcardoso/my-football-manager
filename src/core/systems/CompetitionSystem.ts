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

    logger.warn(
      "CompetitionSystem",
      `⚠️ Índice corrompido para ${key}. Removendo entrada órfã.`
    );
    delete state.competitions.standingsLookup[key];
  }

  logger.warn(
    "CompetitionSystem",
    `⚠️ Cache Miss para ${key}. Reparando índice (operação lenta)...`
  );

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

  logger.error(
    "CompetitionSystem",
    `❌ Tabela não encontrada para Club ${clubId} no Grupo ${groupId}`
  );
  return undefined;
};

export const updateCompetitionStandings = (
  state: GameState,
  matches: Match[]
): void => {
  let updatesCount = 0;

  for (const match of matches) {
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
      `Tabelas atualizadas: ${updatesCount} registros processados.`
    );
  }
};

export const rebuildStandingsIndex = (state: GameState): void => {
  logger.time("CompetitionSystem", "Reconstrução Total de Índices", () => {
    state.competitions.standingsLookup = {};

    Object.values(state.competitions.standings).forEach((standing) => {
      const ccs =
        state.competitions.clubCompetitionSeasons[
          standing.clubCompetitionSeasonId
        ];
      if (ccs) {
        const key = getStandingIndexKey(
          standing.competitionGroupId,
          ccs.clubId
        );
        state.competitions.standingsLookup[key] = standing.id;
      }
    });
  });
};
