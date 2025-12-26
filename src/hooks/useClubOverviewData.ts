import { useState, useCallback, useEffect } from "react";
import type { Team, GameState } from "../domain/models";
import { Logger } from "../lib/Logger";
import type { ExtendedMatchInfo } from "../components/pages/club/types";

const logger = new Logger("useClubOverviewData");

interface ClubOverviewViewData {
  gameState: GameState | null;
  nextMatch: ExtendedMatchInfo | null;
  recentResults: ExtendedMatchInfo[];
  formStreak: ("W" | "D" | "L")[];
  isLoading: boolean;
  refresh: () => void;
}

export function useClubOverviewData(
  teamId: number,
  currentDate: string
): ClubOverviewViewData {
  const [data, setData] = useState<{
    gameState: GameState | null;
    nextMatch: ExtendedMatchInfo | null;
    recentResults: ExtendedMatchInfo[];
    formStreak: ("W" | "D" | "L")[];
  }>({
    gameState: null,
    nextMatch: null,
    recentResults: [],
    formStreak: [],
  });

  const [isLoading, setIsLoading] = useState(true);
  const [trigger, setTrigger] = useState(0);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [state, allTeams] = await Promise.all([
        window.electronAPI.game.getGameState(),
        window.electronAPI.team.getTeams(),
      ]);

      const tMap: Record<number, Team> = {};
      allTeams.forEach((t) => (tMap[t.id] = t));

      let nextMatch: ExtendedMatchInfo | null = null;
      let recentResults: ExtendedMatchInfo[] = [];
      let formStreak: ("W" | "D" | "L")[] = [];

      if (state?.currentSeasonId) {
        const matches = await window.electronAPI.match.getMatches(
          teamId,
          state.currentSeasonId
        );

        const sortedMatches = matches.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        const upcoming = sortedMatches.find((m) => !m.isPlayed);
        if (upcoming) {
          const isHome = upcoming.homeTeamId === teamId;
          const opponentId = isHome ? upcoming.awayTeamId : upcoming.homeTeamId;
          const opponent = opponentId ? tMap[opponentId] : null;

          nextMatch = {
            date: upcoming.date,
            opponentName: opponent?.name || "Desconhecido",
            opponentShortName: opponent?.shortName || "???",
            competitionName: "Liga Nacional",
            location: isHome ? "HOME" : "AWAY",
            opponent: opponent,
          };
        }

        const played = sortedMatches.filter((m) => m.isPlayed).reverse();
        recentResults = played.slice(0, 5).map((m) => {
          const isHome = m.homeTeamId === teamId;
          const opponentId = isHome ? m.awayTeamId : m.homeTeamId;
          const opponent = opponentId ? tMap[opponentId] : null;

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

        formStreak = recentResults.map((r) => r.result!).reverse();
      }

      setData({
        gameState: state,
        nextMatch,
        recentResults,
        formStreak,
      });
    } catch (error) {
      logger.error("Erro ao carregar dados do overview:", error);
    } finally {
      setIsLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchData();
  }, [fetchData, currentDate, trigger]);

  return {
    ...data,
    isLoading,
    refresh: () => setTrigger((prev) => prev + 1),
  };
}
