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
      `⚠️ Índice órfão detectado para ${key}. Removendo entrada inválida.`
    );
    delete state.competitions.standingsLookup[key];
  }

  const startTime = performance.now();

  const standingEntry = Object.values(state.competitions.standings).find(
    (s) => {
      if (s.competitionGroupId !== groupId) return false;
      const ccs =
        state.competitions.clubCompetitionSeasons[s.clubCompetitionSeasonId];
      return ccs && ccs.clubId === clubId;
    }
  );

  const duration = performance.now() - startTime;

  if (standingEntry) {
    state.competitions.standingsLookup[key] = standingEntry.id;

    logger.warn(
      "CompetitionSystem",
      `🔧 Cache Miss recuperado (Reparo: ${duration.toFixed(
        2
      )}ms). Chave: ${key}`
    );
    return standingEntry;
  }

  logger.error(
    "CompetitionSystem",
    `❌ Tabela CRÍTICA não encontrada: Club ${clubId} @ Group ${groupId}`
  );
  return undefined;
};

export const updateCompetitionStandings = (
  state: GameState,
  matches: Match[]
): void => {
  if (matches.length === 0) return;

  const startTotal = performance.now();
  let updatesCount = 0;
  let cacheMisses = 0;

  for (const match of matches) {
    if (match.status !== "FINISHED" || !match.competitionGroupId) continue;

    const { competitionGroupId, homeClubId, awayClubId, homeGoals, awayGoals } =
      match;

    const homeStanding = getOrRepairStanding(
      state,
      competitionGroupId,
      homeClubId
    );
    if (
      !state.competitions.standingsLookup[
        getStandingIndexKey(competitionGroupId, homeClubId)
      ]
    )
      cacheMisses++;

    const awayStanding = getOrRepairStanding(
      state,
      competitionGroupId,
      awayClubId
    );
    if (
      !state.competitions.standingsLookup[
        getStandingIndexKey(competitionGroupId, awayClubId)
      ]
    )
      cacheMisses++;

    if (homeStanding) {
      applyMatchResultToStanding(homeStanding, homeGoals, awayGoals);
      updatesCount++;
    }

    if (awayStanding) {
      applyMatchResultToStanding(awayStanding, awayGoals, homeGoals);
      updatesCount++;
    }
  }

  const totalDuration = performance.now() - startTotal;

  if (totalDuration > 5 || cacheMisses > 0) {
    logger.info("CompetitionSystem", `📊 Atualização de Tabelas`, {
      matches: matches.length,
      updates: updatesCount,
      duration: `${totalDuration.toFixed(2)}ms`,
      performance: totalDuration > 16 ? "⚠️ LENTO" : "✅ OK",
      cacheMisses: cacheMisses > 0 ? `⚠️ ${cacheMisses} REPAROS` : "0",
    });
  }
};

export const rebuildStandingsIndex = (state: GameState): void => {
  const start = performance.now();

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

  const duration = performance.now() - start;
  logger.info(
    "CompetitionSystem",
    `♻️ Índices reconstruídos: ${count} entradas em ${duration.toFixed(2)}ms`
  );
};
