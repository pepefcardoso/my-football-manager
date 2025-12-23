import { useEffect, useState, useMemo, useCallback } from "react";
import Badge from "../common/Badge";
import { MatchViewer } from "../features/match/MatchViewer";
import { PreMatchScreen, type PreMatchLineup } from "../features/match/pre-game/PreMatchScreen";
import type { Match, Team, Competition } from "../../domain/models";
import { Logger } from "../../lib/Logger";
import { useGameStore } from "../../store/useGameStore";

const logger = new Logger("MatchesPage");

interface MatchesPageProps {
    teamId: number;
    teams: Team[];
}

type ViewState = 'calendar' | 'pre-match' | 'match';

function MatchesPage({ teamId, teams }: MatchesPageProps) {
    const [matches, setMatches] = useState<Match[]>([]);
    const [competitions, setCompetitions] = useState<Competition[]>([]);
    const [allTeams, setAllTeams] = useState<Team[]>(teams);
    const [loading, setLoading] = useState(true);
    const [viewState, setViewState] = useState<ViewState>('calendar');
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

    const currentDate = useGameStore((state) => state.currentDate);

    const refreshData = useCallback(async () => {
        setLoading(true);
        try {
            const state = await window.electronAPI.game.getGameState();
            if (state && state.currentSeasonId) {
                const [matchesData, competitionsData, teamsData] = await Promise.all([
                    window.electronAPI.match.getMatches(teamId, state.currentSeasonId),
                    window.electronAPI.competition.getCompetitions(),
                    window.electronAPI.team.getTeams()
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
        return [...matches].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [matches]);

    const getTeamName = (id: number | null) => {
        if (!id) return "Time Indefinido";
        const team = allTeams.find(t => t.id === id);
        return team ? team.name : "Desconhecido";
    };

    const handleStartMatchFlow = (match: Match) => {
        setSelectedMatch(match);
        setViewState('pre-match');
    };

    const handleConfirmLineup = (_lineup: PreMatchLineup) => {
        setViewState('match');
    };

    const handleBackToCalendar = async () => {
        setSelectedMatch(null);
        setViewState('calendar');
        await refreshData();
    };

    if (selectedMatch && viewState === 'pre-match') {
        const homeTeam = allTeams.find((t) => t.id === selectedMatch.homeTeamId);
        const awayTeam = allTeams.find((t) => t.id === selectedMatch.awayTeamId);

        if (!homeTeam || !awayTeam) return <div>Erro: Times não encontrados</div>;

        return (
            <PreMatchScreen
                matchId={selectedMatch.id}
                homeTeam={homeTeam}
                awayTeam={awayTeam}
                userTeamId={teamId}
                onConfirm={handleConfirmLineup}
                onCancel={handleBackToCalendar}
            />
        );
    }

    if (selectedMatch && viewState === 'match') {
        const homeTeam = allTeams.find((t) => t.id === selectedMatch.homeTeamId);
        const awayTeam = allTeams.find((t) => t.id === selectedMatch.awayTeamId);

        return (
            <div className="h-full flex flex-col animate-in fade-in duration-300">
                <div className="bg-slate-900 p-4 border-b border-slate-800 flex justify-between items-center shadow-lg z-10">
                    <button
                        onClick={handleBackToCalendar}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm text-slate-200 flex items-center gap-2 transition-colors border border-slate-700"
                    >
                        ← Voltar ao Calendário
                    </button>
                    <h2 className="text-lg font-bold text-white tracking-wide">
                        {homeTeam?.name} vs {awayTeam?.name}
                    </h2>
                    <div className="w-24"></div>
                </div>

                <MatchViewer
                    matchId={selectedMatch.id}
                    homeTeamName={homeTeam?.name || "Casa"}
                    awayTeamName={awayTeam?.name || "Fora"}
                    homeTeamId={selectedMatch.homeTeamId!}
                    awayTeamId={selectedMatch.awayTeamId!}
                />
            </div>
        );
    }

    return (
        <div className="p-8 pb-20">
            <header className="mb-8 border-b border-slate-800 pb-4">
                <div className="flex justify-between items-end">
                    <div>
                        <h2 className="text-3xl font-light text-white mb-1">Calendário de Jogos</h2>
                        <p className="text-slate-400 text-sm">Temporada Atual • {new Date(currentDate).getFullYear()}</p>
                    </div>
                    <div className="text-right">
                        <div className="text-xs uppercase font-bold text-slate-500 mb-1">Hoje é</div>
                        <div className="text-emerald-400 font-mono font-bold bg-emerald-950/30 px-3 py-1 rounded border border-emerald-500/30">
                            {new Date(currentDate).toLocaleDateString("pt-PT")}
                        </div>
                    </div>
                </div>
            </header>

            {loading ? (
                <div className="flex justify-center p-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500"></div>
                </div>
            ) : (
                <div className="space-y-4 max-w-5xl mx-auto">
                    {matches.length === 0 && (
                        <div className="text-center py-10 bg-slate-900/50 rounded-lg border border-slate-800 border-dashed">
                            <p className="text-slate-500">Nenhuma partida agendada para esta temporada.</p>
                        </div>
                    )}

                    {sortedMatches.map((match) => {
                        const isHome = match.homeTeamId === teamId;
                        const homeTeamObj = allTeams.find(t => t.id === match.homeTeamId);
                        const competition = competitions.find(c => c.id === match.competitionId);
                        const stadiumName = homeTeamObj ? `Estádio do ${homeTeamObj.shortName}` : "Campo Neutro";
                        const isToday = match.date === currentDate;
                        const isFuture = new Date(match.date) > new Date(currentDate);
                        const homeScore = match.homeScore || 0;
                        const awayScore = match.awayScore || 0;

                        let resultVariant: "success" | "danger" | "neutral" = "neutral";
                        let resultText = "-";
                        if (match.isPlayed) {
                            if (homeScore === awayScore) {
                                resultVariant = "neutral";
                                resultText = "E";
                            } else if (isHome) {
                                resultVariant = homeScore > awayScore ? "success" : "danger";
                                resultText = homeScore > awayScore ? "V" : "D";
                            } else {
                                resultVariant = awayScore > homeScore ? "success" : "danger";
                                resultText = awayScore > homeScore ? "V" : "D";
                            }
                        }

                        let rowBorderClass = "border-slate-800 hover:border-slate-700";
                        let rowBgClass = "bg-slate-900";
                        if (isToday && !match.isPlayed) {
                            rowBorderClass = "border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)]";
                            rowBgClass = "bg-slate-800";
                        } else if (match.isPlayed) {
                            rowBgClass = "bg-slate-950/50 opacity-80 hover:opacity-100";
                        }

                        return (
                            <div
                                key={match.id}
                                className={`
                                    relative p-4 rounded-xl border transition-all duration-300 flex flex-col md:flex-row items-center justify-between group gap-4
                                    ${rowBorderClass} ${rowBgClass}
                                `}
                            >
                                {isToday && !match.isPlayed && (
                                    <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-emerald-500 rounded-r-lg animate-pulse hidden md:block" />
                                )}

                                <div className="flex items-center gap-4 w-full md:w-1/4">
                                    <div className="flex flex-col items-center justify-center bg-slate-950 w-14 h-14 rounded-lg border border-slate-800 text-slate-400 shrink-0">
                                        <span className="text-xs uppercase font-bold text-slate-500">
                                            {new Date(match.date).toLocaleDateString("pt-PT", { month: "short" }).replace(".", "")}
                                        </span>
                                        <span className={`text-xl font-bold ${isToday ? "text-emerald-400" : "text-white"}`}>
                                            {new Date(match.date).getDate()}
                                        </span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-0.5">
                                            {competition?.name || "Amistoso"}
                                        </span>
                                        <span className="text-xs text-slate-500 flex items-center gap-1">
                                            🏟️ {stadiumName}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex-1 flex justify-center items-center gap-4 w-full">
                                    <div className={`flex-1 text-right font-semibold text-lg truncate ${isHome ? "text-white" : "text-slate-400"}`}>
                                        {getTeamName(match.homeTeamId)}
                                    </div>

                                    <div className="bg-slate-950 px-4 py-2 rounded-lg border border-slate-800 min-w-[80px] text-center shrink-0">
                                        {match.isPlayed ? (
                                            <span className="text-xl font-black text-white tracking-widest">
                                                {match.homeScore} - {match.awayScore}
                                            </span>
                                        ) : (
                                            <span className="text-slate-600 font-mono text-lg">VS</span>
                                        )}
                                    </div>

                                    <div className={`flex-1 text-left font-semibold text-lg truncate ${!isHome ? "text-white" : "text-slate-400"}`}>
                                        {getTeamName(match.awayTeamId)}
                                    </div>
                                </div>

                                <div className="w-full md:w-1/4 flex justify-end items-center">
                                    {match.isPlayed ? (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-500 font-medium uppercase mr-2">Finalizado</span>
                                            <Badge variant={resultVariant} className="w-8 h-8 flex items-center justify-center p-0 rounded-full text-sm font-bold">
                                                {resultText}
                                            </Badge>
                                        </div>
                                    ) : isToday ? (
                                        <button
                                            onClick={() => handleStartMatchFlow(match)}
                                            className="w-full md:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg transition-all shadow-lg shadow-emerald-900/30 hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            <span>⚽</span> JOGAR
                                        </button>
                                    ) : isFuture ? (
                                        <span className="px-4 py-2 rounded-lg bg-slate-800 text-slate-500 text-sm border border-slate-700 font-medium">
                                            Agendado
                                        </span>
                                    ) : (
                                        <span className="px-4 py-2 rounded-lg bg-amber-900/20 text-amber-500 text-sm border border-amber-900/30 font-medium flex items-center gap-2">
                                            <span>⚠️</span> Pendente
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default MatchesPage;