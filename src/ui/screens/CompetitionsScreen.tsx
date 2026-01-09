import React, { useState } from "react";
import { ClubDetailModal } from "../components/ClubDetailModal";
import { CompetitionView, useCompetitionData } from "../hooks/useCompetitionData";
import { CompetitionHeader } from "../components/competitions/CompetitionHeader";
import { CompetitionTable } from "../components/competitions/CompetitionTable";
import { MatchResultsList } from "../components/competitions/MatchResultsList";
import { useGameStore } from "../../state/useGameStore";

export const CompetitionsScreen: React.FC = () => {
  const { clubs } = useGameStore(s => s.clubs);
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
        {activeView === "TABLE" ? (
          <CompetitionTable
            data={tableData}
            onClubClick={setSelectedClubId}
          />
        ) : (
          <MatchResultsList
            matches={displayedMatches}
            currentRound={currentRound}
            totalRounds={totalRounds}
            onlyMyGames={onlyMyGames}
            userClubId={userClubId}
            onPrevRound={() => actions.setRound(Math.max(1, currentRound - 1))}
            onNextRound={() => actions.setRound(Math.min(totalRounds, currentRound + 1))}
            onToggleFilter={() => actions.setOnlyMyGames((prev) => !prev)}
            onClubClick={setSelectedClubId}
            clubs={clubs}
          />
        )}
      </div>

      <ClubDetailModal
        clubId={selectedClubId}
        isOpen={!!selectedClubId}
        onClose={() => setSelectedClubId(null)}
      />
    </div>
  );
};