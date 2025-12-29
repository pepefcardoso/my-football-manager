import { useQuery } from "@tanstack/react-query";
import type { Team, GameState } from "../domain/models";
import type { ExtendedMatchInfo } from "../components/pages/club/types";

function processOverviewData(
  teamId: number,
  gameState: GameState,
  matches: any[],
  teams: Team[]
) {
  const tMap: Record<number, Team> = {};
  teams.forEach((t) => (tMap[t.id] = t));

  const sortedMatches = matches.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let nextMatch: ExtendedMatchInfo | null = null;
  const upcoming = sortedMatches.find((m) => !m.isPlayed);

  if (upcoming) {
    const isHome = upcoming.homeTeamId === teamId;
    const opponentId = isHome ? upcoming.awayTeamId : upcoming.homeTeamId;
    const opponent = opponentId ? tMap[opponentId] : null;

    nextMatch = {
      date: upcoming.date,
      opponentName: opponent?.name || "Desconhecido",
      opponentShortName: opponent?.shortName || "???",
      competitionName: "Liga Nacional", // TODO - obter nome real da competição
      location: isHome ? "HOME" : "AWAY",
      opponent: opponent,
    };
  }

  const played = sortedMatches.filter((m) => m.isPlayed).reverse();
  const recentResults: ExtendedMatchInfo[] = played.slice(0, 5).map((m) => {
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

  const formStreak = recentResults.map((r) => r.result!).reverse();

  return {
    gameState,
    nextMatch,
    recentResults,
    formStreak,
  };
}

export function useClubOverview(teamId: number) {
  return useQuery({
    queryKey: ["club-overview", teamId],
    queryFn: async () => {
      const gameState = await window.electronAPI.game.getGameState();
      if (!gameState)
        throw new Error("Não foi possível carregar o estado do jogo.");

      const [matches, teams] = await Promise.all([
        window.electronAPI.match.getMatches(teamId, gameState.currentSeasonId),
        window.electronAPI.team.getTeams(),
      ]);

      return processOverviewData(teamId, gameState, matches, teams);
    },
    staleTime: 1000 * 5,
    refetchOnWindowFocus: true,
  });
}
