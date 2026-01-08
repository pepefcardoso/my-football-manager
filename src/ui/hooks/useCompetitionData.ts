import { useState, useMemo } from "react";
import { useGameStore } from "../../state/useGameStore";
import { Match } from "../../core/models/match";

export type CompetitionView = "TABLE" | "RESULTS";

export interface TableRowData {
  id: string;
  clubName: string;
  clubId: string;
  clubBadgeId: string;
  isUser: boolean;
  gamesPlayed: number;
  wins: number;
  draws: number;
  defeats: number;
  goalsScored: number;
  goalsConceded: number;
  goalsBalance: number;
  points: number;
}

export const useCompetitionData = () => {
  const { meta } = useGameStore();
  const { standings, clubCompetitionSeasons, groups } = useGameStore(
    (s) => s.competitions
  );
  const { clubs } = useGameStore((s) => s.clubs);
  const { matches } = useGameStore((s) => s.matches);

  const userClubId = meta.userClubId;

  const [userSelectedRound, setUserSelectedRound] = useState<number | null>(
    null
  );
  const [onlyMyGames, setOnlyMyGames] = useState(false);

  const activeCompetitionData = useMemo(() => {
    if (!userClubId) return null;

    const userCcs = Object.values(clubCompetitionSeasons).find(
      (ccs) => ccs.clubId === userClubId
    );

    if (!userCcs) return null;

    const userStanding = Object.values(standings).find(
      (s) => s.clubCompetitionSeasonId === userCcs.id
    );

    if (!userStanding) return null;

    const groupId = userStanding.competitionGroupId;
    const group = groups[groupId];

    return {
      groupId,
      groupName: group?.name || "Liga Nacional",
      standings: Object.values(standings).filter(
        (s) => s.competitionGroupId === groupId
      ),
    };
  }, [userClubId, standings, clubCompetitionSeasons, groups]);

  const tableData: TableRowData[] = useMemo(() => {
    if (!activeCompetitionData) return [];

    return activeCompetitionData.standings
      .map((standing) => {
        const ccs = clubCompetitionSeasons[standing.clubCompetitionSeasonId];
        const club = clubs[ccs?.clubId];
        return {
          id: standing.id,
          clubName: club?.name || "Desconhecido",
          clubId: club?.id,
          clubBadgeId: club?.badgeId,
          isUser: club?.id === userClubId,
          gamesPlayed: standing.gamesPlayed,
          wins: standing.wins,
          draws: standing.draws,
          defeats: standing.defeats,
          goalsScored: standing.goalsScored,
          goalsConceded: standing.goalsConceded,
          goalsBalance: standing.goalsBalance,
          points: standing.points,
        };
      })
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.goalsBalance !== a.goalsBalance)
          return b.goalsBalance - a.goalsBalance;
        return b.goalsScored - a.goalsScored;
      });
  }, [activeCompetitionData, clubCompetitionSeasons, clubs, userClubId]);

  const matchesData = useMemo(() => {
    if (!activeCompetitionData)
      return { rounds: [] as number[], matches: [] as Match[] };

    const groupMatches = Object.values(matches).filter(
      (m) => m.competitionGroupId === activeCompetitionData.groupId
    );

    const rounds = [...new Set(groupMatches.map((m) => m.roundNumber))].sort(
      (a, b) => a - b
    );

    return { rounds, matches: groupMatches };
  }, [matches, activeCompetitionData]);

  const computedRound = useMemo(() => {
    if (!matchesData.matches.length || !matchesData.rounds.length) return 1;

    const sortedMatches = [...matchesData.matches].sort(
      (a, b) => a.datetime - b.datetime
    );
    const nextScheduled = sortedMatches.find((m) => m.status === "SCHEDULED");

    if (nextScheduled) return nextScheduled.roundNumber;

    return matchesData.rounds[matchesData.rounds.length - 1];
  }, [matchesData]);

  const currentRound = userSelectedRound ?? computedRound;

  const displayedMatches = useMemo(() => {
    let ms = matchesData.matches.filter((m) => m.roundNumber === currentRound);

    if (onlyMyGames && userClubId) {
      ms = ms.filter(
        (m) => m.homeClubId === userClubId || m.awayClubId === userClubId
      );
    }

    return ms.sort((a, b) => a.datetime - b.datetime);
  }, [matchesData, currentRound, onlyMyGames, userClubId]);

  return {
    isLoading: !activeCompetitionData,
    competitionName: activeCompetitionData?.groupName || "",
    tableData,
    displayedMatches,
    currentRound,
    totalRounds: matchesData.rounds.length,
    onlyMyGames,
    userClubId,
    actions: {
      setRound: setUserSelectedRound,
      setOnlyMyGames,
    },
  };
};
