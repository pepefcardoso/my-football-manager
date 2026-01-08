import React from "react";
import { ChevronLeft, ChevronRight, Filter, Calendar } from "lucide-react";
import { ClubBadge } from "../ClubBadge";
import { Match } from "../../../core/models/match";
import { useGameStore } from "../../../state/useGameStore";
import { formatDate } from "../../../core/utils/formatters";

interface MatchResultsListProps {
  matches: Match[];
  currentRound: number;
  totalRounds: number;
  onlyMyGames: boolean;
  userClubId: string | null;
  onPrevRound: () => void;
  onNextRound: () => void;
  onToggleFilter: () => void;
  onClubClick: (clubId: string) => void;
}

export const MatchResultsList: React.FC<MatchResultsListProps> = ({
  matches,
  currentRound,
  totalRounds,
  onlyMyGames,
  userClubId,
  onPrevRound,
  onNextRound,
  onToggleFilter,
  onClubClick,
}) => {
  const { clubs } = useGameStore(s => s.clubs);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-background-tertiary bg-background/50">
        <div className="flex items-center space-x-4">
          <button
            onClick={onPrevRound}
            disabled={currentRound <= 1}
            className="p-2 hover:bg-background-tertiary rounded disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="text-center min-w-[120px]">
            <span className="text-xs text-text-muted uppercase tracking-wider block">
              Rodada
            </span>
            <span className="text-xl font-bold text-text-primary">
              {currentRound}
            </span>
          </div>
          <button
            onClick={onNextRound}
            disabled={currentRound >= totalRounds}
            className="p-2 hover:bg-background-tertiary rounded disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <button
          onClick={onToggleFilter}
          className={`flex items-center px-3 py-1.5 rounded text-sm transition-colors border ${
            onlyMyGames
              ? "bg-primary/10 border-primary text-primary"
              : "bg-transparent border-background-tertiary text-text-secondary hover:border-text-muted"
          }`}
        >
          <Filter size={14} className="mr-2" />
          Apenas meus jogos
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {matches.length === 0 ? (
            <div className="col-span-full text-center py-10 text-text-muted italic">
              Nenhuma partida encontrada nesta rodada.
            </div>
          ) : (
            matches.map((match) => {
              const homeClub = clubs[match.homeClubId];
              const awayClub = clubs[match.awayClubId];
              
              if (!homeClub || !awayClub) return null;

              const isUserGame =
                match.homeClubId === userClubId || match.awayClubId === userClubId;
              const isPlayed = match.status === "FINISHED";

              return (
                <div
                  key={match.id}
                  className={`
                    relative p-4 rounded border transition-all duration-200
                    ${
                      isUserGame
                        ? "bg-primary/5 border-primary/30 shadow-[0_0_10px_rgba(59,130,246,0.05)]"
                        : "bg-background border-background-tertiary hover:border-text-muted/30"
                    }
                  `}
                >
                  <div className="text-xs text-text-muted mb-3 flex items-center justify-center">
                    <Calendar size={12} className="mr-1" />
                    {formatDate(match.datetime)}
                    {match.status === "IN_PROGRESS" && (
                      <span className="ml-2 text-status-success animate-pulse font-bold">
                        • AO VIVO
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div
                      className="flex-1 flex items-center justify-end space-x-3 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => onClubClick(homeClub.id)}
                    >
                      <span
                        className={`font-bold ${
                          isPlayed && match.homeGoals > match.awayGoals
                            ? "text-text-primary"
                            : "text-text-secondary"
                        }`}
                      >
                        {homeClub.name}
                      </span>
                      <div className="w-8 h-8 rounded-full border border-background-tertiary p-0.5 bg-white">
                        <ClubBadge
                          badgeId={homeClub.badgeId}
                          clubName={homeClub.name}
                          className="w-full h-full"
                        />
                      </div>
                    </div>

                    <div className="mx-4 min-w-[80px] text-center">
                      {isPlayed ? (
                        <div className="text-2xl font-mono font-bold text-text-primary bg-background-tertiary/30 px-3 py-1 rounded">
                          {match.homeGoals} - {match.awayGoals}
                        </div>
                      ) : (
                        <div className="text-sm font-medium text-text-muted bg-background-tertiary/10 px-2 py-1 rounded">
                          vs
                        </div>
                      )}
                    </div>

                    <div
                      className="flex-1 flex items-center justify-start space-x-3 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => onClubClick(awayClub.id)}
                    >
                      <div className="w-8 h-8 rounded-full border border-background-tertiary p-0.5 bg-white">
                        <ClubBadge
                          badgeId={awayClub.badgeId}
                          clubName={awayClub.name}
                          className="w-full h-full"
                        />
                      </div>
                      <span
                        className={`font-bold ${
                          isPlayed && match.awayGoals > match.homeGoals
                            ? "text-text-primary"
                            : "text-text-secondary"
                        }`}
                      >
                        {awayClub.name}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};