import React, { useState, useCallback, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { ClubDetailModal } from "../components/ClubDetailModal";
import { CompetitionView, useCompetitionData } from "../hooks/useCompetitionData";
import { CompetitionHeader } from "../components/competitions/CompetitionHeader";
import { CompetitionTable } from "../components/competitions/CompetitionTable";
import { MatchResultsList } from "../components/competitions/MatchResultsList";
import { useGameStore } from "../../state/useGameStore";

const MemoizedCompetitionTable = React.memo(CompetitionTable);
const MemoizedMatchResultsList = React.memo(MatchResultsList);

export const CompetitionsScreen: React.FC = () => {
  const clubs = useGameStore(useShallow(s => s.clubs.clubs));

  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<CompetitionView>("TABLE");

  const {
    isLoading,
    competitionName,
    tableData,
    displayedMatches,
    currentRound,
    totalRounds,
    onlyMyGames,
    userClubId,
    actions,
  } = useCompetitionData();

  const handleClubClick = useCallback((id: string) => {
    setSelectedClubId(id);
  }, []);

  const handlePrevRound = useCallback(() => {
    actions.setRound(Math.max(1, currentRound - 1));
  }, [actions, currentRound]);

  const handleNextRound = useCallback(() => {
    actions.setRound(Math.min(totalRounds, currentRound + 1));
  }, [actions, totalRounds, currentRound]);

  const handleToggleFilter = useCallback(() => {
    actions.setOnlyMyGames((prev) => !prev);
  }, [actions]);

  const tableView = useMemo(() => (
    <MemoizedCompetitionTable
      data={tableData}
      onClubClick={handleClubClick}
    />
  ), [tableData, handleClubClick]);

  const resultsView = useMemo(() => (
    <MemoizedMatchResultsList
      matches={displayedMatches}
      currentRound={currentRound}
      totalRounds={totalRounds}
      onlyMyGames={onlyMyGames}
      userClubId={userClubId}
      onPrevRound={handlePrevRound}
      onNextRound={handleNextRound}
      onToggleFilter={handleToggleFilter}
      onClubClick={handleClubClick}
      clubs={clubs}
    />
  ), [
    displayedMatches,
    currentRound,
    totalRounds,
    onlyMyGames,
    userClubId,
    clubs,
    handlePrevRound,
    handleNextRound,
    handleToggleFilter,
    handleClubClick
  ]);

  if (isLoading) {
    return (
      <div className="p-8 text-text-muted text-center animate-pulse">
        Carregando dados da competição...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 h-full flex flex-col">
      <CompetitionHeader
        name={competitionName}
        activeView={activeView}
        onViewChange={setActiveView}
      />

      <div className="flex-1 min-h-0 bg-background-secondary rounded-lg border border-background-tertiary shadow-sm overflow-hidden flex flex-col">
        {activeView === "TABLE" ? tableView : resultsView}
      </div>

      <ClubDetailModal
        clubId={selectedClubId}
        isOpen={!!selectedClubId}
        onClose={() => setSelectedClubId(null)}
      />
    </div>
  );
};