import React from "react";
import { ChevronLeft, ChevronRight, Filter, Calendar } from "lucide-react";
import { ClubBadge } from "../ClubBadge";
import { Club } from "../../../core/models/club";
import { Match } from "../../../core/models/match";
import { formatDate } from "../../../core/utils/formatters";
import { clsx } from "clsx";

interface MatchResultsListProps {
  matches: Match[];
  clubs: Record<string, Club>;
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
  clubs,
  currentRound,
  totalRounds,
  onlyMyGames,
  userClubId,
  onPrevRound,
  onNextRound,
  onToggleFilter,
  onClubClick,
}) => {
  return (
    <div className="flex flex-col h-full bg-background-secondary">
      <div className="flex items-center justify-between p-4 border-b border-background-tertiary">
        <div className="flex items-center space-x-4">
          <button
            onClick={onPrevRound}
            disabled={currentRound <= 1}
            className="p-2 hover:bg-background-tertiary text-text-primary rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Rodada Anterior"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="text-center min-w-[120px]">
            <span className="text-xs text-text-muted uppercase tracking-wider block font-semibold">
              Rodada
            </span>
            <span className="text-xl font-bold text-text-primary font-mono">
              {currentRound} <span className="text-text-muted text-sm font-normal">/ {totalRounds}</span>
            </span>
          </div>

          <button
            onClick={onNextRound}
            disabled={currentRound >= totalRounds}
            className="p-2 hover:bg-background-tertiary text-text-primary rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Próxima Rodada"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <button
          onClick={onToggleFilter}
          className={clsx(
            "flex items-center px-3 py-1.5 rounded text-sm transition-colors font-medium border",
            onlyMyGames
              ? "bg-primary/10 border-primary text-primary"
              : "bg-transparent border-background-tertiary text-text-secondary hover:text-text-primary hover:border-text-secondary"
          )}
        >
          <Filter size={14} className="mr-2" />
          Meus Jogos
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-background">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {matches.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-text-muted opacity-70">
              <Calendar size={48} className="mb-3" />
              <span className="text-sm font-medium">Nenhuma partida encontrada nesta rodada.</span>
            </div>
          ) : (
            matches.map((match) => {
              const homeClub = clubs[match.homeClubId];
              const awayClub = clubs[match.awayClubId];

              if (!homeClub || !awayClub) return null;

              const isUserGame =
                match.homeClubId === userClubId || match.awayClubId === userClubId;
              const isPlayed = match.status === "FINISHED";
              const isLive = match.status === "IN_PROGRESS";

              return (
                <div
                  key={match.id}
                  className={clsx(
                    "relative p-4 rounded-lg border transition-all duration-200 group",
                    isUserGame
                      ? "bg-background-secondary border-background-tertiary border-l-4 border-l-primary"
                      : "bg-background-secondary border-background-tertiary hover:border-text-muted"
                  )}
                >
                  <div className="flex items-center justify-center mb-4 relative">
                    <span className="text-xs text-text-muted font-mono flex items-center bg-background px-2 py-0.5 rounded border border-background-tertiary">
                      <Calendar size={10} className="mr-1.5" />
                      {formatDate(match.datetime)}
                    </span>

                    {isLive && (
                      <span className="absolute right-0 flex items-center text-[10px] font-bold text-status-success uppercase tracking-wider animate-pulse">
                        <div className="w-1.5 h-1.5 bg-status-success rounded-full mr-1.5" />
                        Ao Vivo
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div
                      className="flex-1 flex items-center justify-end space-x-3 cursor-pointer group/club"
                      onClick={() => onClubClick(homeClub.id)}
                    >
                      <span
                        className={clsx(
                          "font-bold text-sm text-right transition-colors",
                          isPlayed && match.homeGoals > match.awayGoals
                            ? "text-text-primary"
                            : "text-text-secondary group-hover/club:text-primary"
                        )}
                      >
                        {homeClub.name}
                      </span>
                      <div className="w-10 h-10 flex-shrink-0">
                        <ClubBadge
                          badgeId={homeClub.badgeId}
                          clubName={homeClub.name}
                          className="w-full h-full drop-shadow-sm"
                        />
                      </div>
                    </div>

                    <div className="mx-4 min-w-[80px] text-center">
                      {isPlayed || isLive ? (
                        <div className="flex flex-col items-center">
                          <div className="text-2xl font-mono font-bold text-text-primary bg-background-tertiary px-3 py-1 rounded tracking-widest border border-white/5">
                            {match.homeGoals} - {match.awayGoals}
                          </div>
                          {match.homePenalties !== null && (
                            <span className="text-[10px] text-text-muted mt-1">
                              ({match.homePenalties}-{match.awayPenalties} pen)
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm font-bold text-text-muted bg-background-tertiary/50 px-3 py-1.5 rounded border border-background-tertiary/50">
                          VS
                        </div>
                      )}
                    </div>

                    <div
                      className="flex-1 flex items-center justify-start space-x-3 cursor-pointer group/club"
                      onClick={() => onClubClick(awayClub.id)}
                    >
                      <div className="w-10 h-10 flex-shrink-0">
                        <ClubBadge
                          badgeId={awayClub.badgeId}
                          clubName={awayClub.name}
                          className="w-full h-full drop-shadow-sm"
                        />
                      </div>
                      <span
                        className={clsx(
                          "font-bold text-sm text-left transition-colors",
                          isPlayed && match.awayGoals > match.homeGoals
                            ? "text-text-primary"
                            : "text-text-secondary group-hover/club:text-primary"
                        )}
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