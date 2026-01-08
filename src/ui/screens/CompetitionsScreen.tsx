import React, { useMemo, useState } from "react";
import { useGameStore } from "../../state/useGameStore";
import { Trophy, Calendar, Filter, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { ClubDetailModal } from "../components/ClubDetailModal";
import { ClubBadge } from "../components/ClubBadge";
import { formatDate } from "../../core/utils/formatters";

type CompetitionView = "TABLE" | "RESULTS";

export const CompetitionsScreen: React.FC = () => {
    const {
        meta
    } = useGameStore();
    const {
        standings,
        clubCompetitionSeasons,
        groups,
    } = useGameStore(s => s.competitions);
    const {
        clubs
    } = useGameStore(s => s.clubs);
    const {
        matches
    } = useGameStore(s => s.matches);

    const userClubId = meta.userClubId;
    const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
    const [activeView, setActiveView] = useState<CompetitionView>("TABLE");
    const [viewRound, setViewRound] = useState<number>(1);
    const [onlyMyGames, setOnlyMyGames] = useState(false);

    const activeCompetitionData = useMemo(() => {
        if (!userClubId) return null;

        const userCcs = Object.values(clubCompetitionSeasons).find(
            ccs => ccs.clubId === userClubId
        );

        if (!userCcs) return null;

        const userStanding = Object.values(standings).find(
            s => s.clubCompetitionSeasonId === userCcs.id
        );

        if (!userStanding) return null;

        const groupId = userStanding.competitionGroupId;
        const group = groups[groupId];

        return {
            groupId,
            groupName: group?.name || "Liga Nacional",
            standings: Object.values(standings).filter(s => s.competitionGroupId === groupId)
        };
    }, [userClubId, standings, clubCompetitionSeasons, groups]);

    const tableData = useMemo(() => {
        if (!activeCompetitionData) return [];

        return activeCompetitionData.standings
            .map(standing => {
                const ccs = clubCompetitionSeasons[standing.clubCompetitionSeasonId];
                const club = clubs[ccs?.clubId];
                return {
                    ...standing,
                    clubName: club?.name || "Desconhecido",
                    clubId: club?.id,
                    clubBadgeId: club?.badgeId,
                    isUser: club?.id === userClubId
                };
            })
            .sort((a, b) => {
                if (b.points !== a.points) return b.points - a.points;
                if (b.wins !== a.wins) return b.wins - a.wins;
                if (b.goalsBalance !== a.goalsBalance) return b.goalsBalance - a.goalsBalance;
                return b.goalsScored - a.goalsScored;
            });
    }, [activeCompetitionData, clubCompetitionSeasons, clubs, userClubId]);

    const matchesData = useMemo(() => {
        if (!activeCompetitionData) return { rounds: [], matches: [] };

        const groupMatches = Object.values(matches).filter(
            m => m.competitionGroupId === activeCompetitionData.groupId
        );

        const rounds = [...new Set(groupMatches.map(m => m.roundNumber))].sort((a, b) => a - b);

        return {
            rounds,
            matches: groupMatches
        };
    }, [matches, activeCompetitionData]);

    React.useEffect(() => {
        if (matchesData.rounds.length > 0 && viewRound === 1) {
            const current = matchesData.matches.find(m => m.status === 'SCHEDULED');
            if (current) {
                setViewRound(current.roundNumber);
            } else {
                setViewRound(matchesData.rounds[matchesData.rounds.length - 1]);
            }
        }
    }, [matchesData, viewRound]);

    const displayedMatches = useMemo(() => {
        let ms = matchesData.matches.filter(m => m.roundNumber === viewRound);

        if (onlyMyGames && userClubId) {
            ms = ms.filter(m => m.homeClubId === userClubId || m.awayClubId === userClubId);
        }

        return ms.sort((a, b) => a.datetime - b.datetime);
    }, [matchesData, viewRound, onlyMyGames, userClubId]);

    if (!activeCompetitionData) {
        return <div className="p-8 text-text-muted">Nenhuma competição ativa encontrada para o seu clube.</div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300 h-full flex flex-col">
            <div className="flex flex-col md:flex-row md:items-center justify-between bg-background-secondary p-6 rounded-lg border border-background-tertiary shadow-sm flex-none">
                <div className="flex items-center mb-4 md:mb-0">
                    <div className="p-3 bg-primary/10 rounded-full mr-4 text-primary">
                        <Trophy size={32} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-text-primary">
                            {activeCompetitionData.groupName}
                        </h1>
                        <p className="text-text-secondary text-sm">
                            Temporada Atual
                        </p>
                    </div>
                </div>

                <div className="flex space-x-2 bg-background-tertiary/30 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveView("TABLE")}
                        className={`px-4 py-2 rounded text-sm font-medium transition-all ${activeView === "TABLE"
                            ? "bg-primary text-white shadow-sm"
                            : "text-text-secondary hover:text-text-primary hover:bg-white/5"
                            }`}
                    >
                        Classificação
                    </button>
                    <button
                        onClick={() => setActiveView("RESULTS")}
                        className={`px-4 py-2 rounded text-sm font-medium transition-all ${activeView === "RESULTS"
                            ? "bg-primary text-white shadow-sm"
                            : "text-text-secondary hover:text-text-primary hover:bg-white/5"
                            }`}
                    >
                        Resultados
                    </button>
                </div>
            </div>

            <div className="flex-1 min-h-0 bg-background-secondary rounded-lg border border-background-tertiary shadow-sm overflow-hidden flex flex-col">

                {activeView === "TABLE" && (
                    <div className="overflow-auto custom-scrollbar flex-1">
                        <table className="w-full text-left text-sm">
                            <thead className="sticky top-0 bg-background-secondary z-10 shadow-sm">
                                <tr className="border-b border-background-tertiary text-text-secondary uppercase text-xs tracking-wider">
                                    <th className="p-4 w-16 text-center">Pos</th>
                                    <th className="p-4">Clube</th>
                                    <th className="p-4 w-16 text-center" title="Jogos">J</th>
                                    <th className="p-4 w-16 text-center" title="Vitórias">V</th>
                                    <th className="p-4 w-16 text-center" title="Empates">E</th>
                                    <th className="p-4 w-16 text-center" title="Derrotas">D</th>
                                    <th className="p-4 w-16 text-center" title="Gols Pró">GP</th>
                                    <th className="p-4 w-16 text-center" title="Gols Contra">GC</th>
                                    <th className="p-4 w-16 text-center" title="Saldo de Gols">SG</th>
                                    <th className="p-4 w-20 text-center font-bold text-text-primary">Pts</th>
                                    <th className="p-4 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-background-tertiary/30">
                                {tableData.map((row, index) => (
                                    <tr
                                        key={row.id}
                                        onClick={() => row.clubId && setSelectedClubId(row.clubId)}
                                        className={`
                                            cursor-pointer transition-all duration-200 group
                                            ${row.isUser
                                                ? 'bg-primary/5 hover:bg-primary/10 border-l-4 border-l-primary'
                                                : 'hover:bg-background-tertiary/30 border-l-4 border-l-transparent'
                                            } 
                                        `}
                                    >
                                        <td className="p-4 text-center font-medium text-text-secondary">
                                            {index + 1}º
                                        </td>
                                        <td className="p-4 font-medium text-text-primary flex items-center">
                                            <div className="w-6 h-6 mr-3">
                                                <ClubBadge
                                                    badgeId={row.clubBadgeId}
                                                    clubName={row.clubName}
                                                    className="w-full h-full"
                                                    size="sm"
                                                />
                                            </div>
                                            {row.clubName}
                                            {row.isUser && <span className="ml-2 text-[10px] bg-primary text-white px-1.5 py-0.5 rounded shadow-sm">VOCÊ</span>}
                                        </td>
                                        <td className="p-4 text-center text-text-muted">{row.gamesPlayed}</td>
                                        <td className="p-4 text-center text-text-muted">{row.wins}</td>
                                        <td className="p-4 text-center text-text-muted">{row.draws}</td>
                                        <td className="p-4 text-center text-text-muted">{row.defeats}</td>
                                        <td className="p-4 text-center text-text-muted hidden md:table-cell">{row.goalsScored}</td>
                                        <td className="p-4 text-center text-text-muted hidden md:table-cell">{row.goalsConceded}</td>
                                        <td className={`p-4 text-center font-medium ${row.goalsBalance > 0 ? 'text-status-success' : row.goalsBalance < 0 ? 'text-status-danger' : 'text-text-muted'}`}>
                                            {row.goalsBalance > 0 ? `+${row.goalsBalance}` : row.goalsBalance}
                                        </td>
                                        <td className="p-4 text-center font-bold text-lg text-text-primary">
                                            {row.points}
                                        </td>
                                        <td className="p-4 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Eye size={16} className="text-text-muted hover:text-primary" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeView === "RESULTS" && (
                    <div className="flex flex-col h-full">
                        <div className="flex items-center justify-between p-4 border-b border-background-tertiary bg-background/50">
                            <div className="flex items-center space-x-4">
                                <button
                                    onClick={() => setViewRound(prev => Math.max(1, prev - 1))}
                                    disabled={viewRound <= 1}
                                    className="p-2 hover:bg-background-tertiary rounded disabled:opacity-30 transition-colors"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <div className="text-center min-w-[120px]">
                                    <span className="text-xs text-text-muted uppercase tracking-wider block">Rodada</span>
                                    <span className="text-xl font-bold text-text-primary">{viewRound}</span>
                                </div>
                                <button
                                    onClick={() => setViewRound(prev => Math.min(matchesData.rounds.length, prev + 1))}
                                    disabled={viewRound >= matchesData.rounds.length}
                                    className="p-2 hover:bg-background-tertiary rounded disabled:opacity-30 transition-colors"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>

                            <button
                                onClick={() => setOnlyMyGames(!onlyMyGames)}
                                className={`flex items-center px-3 py-1.5 rounded text-sm transition-colors border ${onlyMyGames
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
                                {displayedMatches.length === 0 ? (
                                    <div className="col-span-full text-center py-10 text-text-muted italic">
                                        Nenhuma partida encontrada nesta rodada.
                                    </div>
                                ) : (
                                    displayedMatches.map(match => {
                                        const homeClub = clubs[match.homeClubId];
                                        const awayClub = clubs[match.awayClubId];
                                        const isUserGame = match.homeClubId === userClubId || match.awayClubId === userClubId;
                                        const isPlayed = match.status === 'FINISHED';

                                        return (
                                            <div
                                                key={match.id}
                                                className={`
                                                    relative p-4 rounded border transition-all duration-200
                                                    ${isUserGame
                                                        ? "bg-primary/5 border-primary/30 shadow-[0_0_10px_rgba(59,130,246,0.05)]"
                                                        : "bg-background border-background-tertiary hover:border-text-muted/30"
                                                    }
                                                `}
                                            >
                                                <div className="text-xs text-text-muted mb-3 flex items-center justify-center">
                                                    <Calendar size={12} className="mr-1" />
                                                    {formatDate(match.datetime)}
                                                    {match.status === 'IN_PROGRESS' && <span className="ml-2 text-status-success animate-pulse font-bold">• AO VIVO</span>}
                                                </div>

                                                <div className="flex items-center justify-between">
                                                    <div
                                                        className="flex-1 flex items-center justify-end space-x-3 cursor-pointer hover:opacity-80 transition-opacity"
                                                        onClick={() => setSelectedClubId(homeClub.id)}
                                                    >
                                                        <span className={`font-bold ${isPlayed && match.homeGoals > match.awayGoals ? 'text-text-primary' : 'text-text-secondary'}`}>
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
                                                        onClick={() => setSelectedClubId(awayClub.id)}
                                                    >
                                                        <div className="w-8 h-8 rounded-full border border-background-tertiary p-0.5 bg-white">
                                                            <ClubBadge
                                                                badgeId={awayClub.badgeId}
                                                                clubName={awayClub.name}
                                                                className="w-full h-full"
                                                            />
                                                        </div>
                                                        <span className={`font-bold ${isPlayed && match.awayGoals > match.homeGoals ? 'text-text-primary' : 'text-text-secondary'}`}>
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