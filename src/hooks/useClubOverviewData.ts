import { useState, useCallback, useEffect } from "react";
import type { Team, GameState } from "../domain/models";
import { Logger } from "../lib/Logger";
import type { ExtendedMatchInfo } from "../components/pages/club/types";

const logger = new Logger("useClubOverviewData");

export function useClubOverviewData(teamId: number, currentDate: string) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [nextMatch, setNextMatch] = useState<ExtendedMatchInfo | null>(null);
  const [recentResults, setRecentResults] = useState<ExtendedMatchInfo[]>([]);
  const [formStreak, setFormStreak] = useState<("W" | "D" | "L")[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const updateMatchData = useCallback(
    async (
      currentTeamId: number,
      seasonId: number,
      teamsMap: Record<number, Team>
    ) => {
      try {
        const matches = await window.electronAPI.match.getMatches(
          currentTeamId,
          seasonId
        );
        const sortedMatches = matches.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        const upcoming = sortedMatches.find((m) => !m.isPlayed);
        if (upcoming) {
          const isHome = upcoming.homeTeamId === currentTeamId;
          const opponentId = isHome ? upcoming.awayTeamId : upcoming.homeTeamId;
          const opponent = opponentId ? teamsMap[opponentId] : null;

          setNextMatch({
            date: upcoming.date,
            opponentName: opponent?.name || "Desconhecido",
            opponentShortName: opponent?.shortName || "???",
            competitionName: "Liga Nacional", // TODO: obter nome real da competição
            location: isHome ? "HOME" : "AWAY",
            opponent: opponent,
          });
        } else {
          setNextMatch(null);
        }

        const played = sortedMatches.filter((m) => m.isPlayed).reverse();
        const recent: ExtendedMatchInfo[] = played.slice(0, 5).map((m) => {
          const isHome = m.homeTeamId === currentTeamId;
          const opponentId = isHome ? m.awayTeamId : m.homeTeamId;
          const opponent = opponentId ? teamsMap[opponentId] : null;

          let result: "W" | "D" | "L" = "D";
          const myScore = isHome ? m.homeScore : m.awayScore;
          const oppScore = isHome ? m.awayScore : m.homeScore;

          if (myScore !== null && oppScore !== null) {
            if (myScore > oppScore) result = "W";
            else if (myScore < oppScore) result = "L";
          }

          return {
            date: new Date(m.date).toLocaleDateString("pt-PT", {
              day: "2-digit",
              month: "2-digit",
            }),
            opponentName: opponent?.name || "???",
            opponentShortName: opponent?.shortName || "???",
            competitionName: "Liga",
            location: isHome ? "HOME" : "AWAY",
            score: `${m.homeScore} - ${m.awayScore}`,
            result,
            opponent: opponent,
          };
        });

        setRecentResults(recent);
        setFormStreak(recent.map((r) => r.result!).reverse());
      } catch (error) {
        logger.error("Erro ao processar dados de partidas:", error);
      }
    },
    []
  );

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [state, allTeams] = await Promise.all([
          window.electronAPI.game.getGameState(),
          window.electronAPI.team.getTeams(),
        ]);

        setGameState(state);

        const tMap: Record<number, Team> = {};
        allTeams.forEach((t) => (tMap[t.id] = t));

        if (state?.currentSeasonId) {
          await updateMatchData(teamId, state.currentSeasonId, tMap);
        }
      } catch (error) {
        logger.error("Erro ao carregar visão geral:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [teamId, currentDate, updateMatchData]);

  const updateTrainingFocus = async (focus: string) => {
    await window.electronAPI.game.updateTrainingFocus(focus);
    const newState = await window.electronAPI.game.getGameState();
    setGameState(newState);
  };

  return {
    gameState,
    nextMatch,
    recentResults,
    formStreak,
    isLoading,
    updateTrainingFocus,
    refresh: () => setGameState((prev) => ({ ...prev! })),
  };
}
