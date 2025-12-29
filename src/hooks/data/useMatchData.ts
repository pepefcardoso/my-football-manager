import { useState, useEffect, useCallback, useMemo } from "react";
import type { Match, Team, Competition } from "../../domain/models";
import { Logger } from "../../lib/Logger";

const logger = new Logger("useMatchData");

export function useMatchData(teamId: number, initialTeams: Team[]) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>(initialTeams);
  const [loading, setLoading] = useState(true);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const state = await window.electronAPI.game.getGameState();
      if (state && state.currentSeasonId) {
        const [matchesData, competitionsData, teamsData] = await Promise.all([
          window.electronAPI.match.getMatches(teamId, state.currentSeasonId),
          window.electronAPI.competition.getCompetitions(),
          window.electronAPI.team.getTeams(),
        ]);

        setMatches(matchesData);
        setCompetitions(competitionsData);
        setAllTeams(teamsData);
      }
    } catch (error) {
      logger.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const sortedMatches = useMemo(() => {
    return [...matches].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [matches]);

  return {
    matches: sortedMatches,
    competitions,
    allTeams,
    loading,
    refreshData,
  };
}
