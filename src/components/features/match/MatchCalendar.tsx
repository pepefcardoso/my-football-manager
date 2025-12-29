import type { Match, Team, Competition } from "../../../domain/models";
import { TeamLogo } from "../../common/TeamLogo";
import Badge from "../../common/Badge";
import { EmptyState } from "../../common/EmptyState";

interface MatchCalendarProps {
    matches: Match[];
    teams: Team[];
    competitions: Competition[];
    userTeamId: number;
    currentDate: string;
    onSelectMatch: (match: Match) => void;
}

export function MatchCalendar({
    matches,
    teams,
    competitions,
    userTeamId,
    currentDate,
    onSelectMatch
}: MatchCalendarProps) {

    const getTeamName = (id: number | null) => {
        if (!id) return "Time Indefinido";
        const team = teams.find(t => t.id === id);
        return team ? team.name : "Desconhecido";
    };

    if (matches.length === 0) {
        return (
            <div className="bg-slate-900/50 rounded-lg border border-slate-800 border-dashed">
                <EmptyState
                    icon={<span className="text-4xl">📅</span>}
                    title="Sem jogos agendados"
                    description="Não existem partidas marcadas para esta fase da temporada."
                />
            </div>
        );
    }

    return (
        <div className="space-y-4 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {matches.map((match) => {
                const isHome = match.homeTeamId === userTeamId;
                const homeTeamObj = teams.find(t => t.id === match.homeTeamId);
                const awayTeamObj = teams.find(t => t.id === match.awayTeamId);
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
                            <div className="flex-1 flex items-center justify-end gap-3 min-w-0">
                                <span className={`font-semibold text-lg truncate ${isHome ? "text-white" : "text-slate-400"}`}>
                                    {getTeamName(match.homeTeamId)}
                                </span>
                                <TeamLogo team={homeTeamObj} className="w-8 h-8 flex-shrink-0" />
                            </div>

                            <div className="bg-slate-950 px-4 py-2 rounded-lg border border-slate-800 min-w-[80px] text-center shrink-0 shadow-inner">
                                {match.isPlayed ? (
                                    <span className="text-xl font-black text-white tracking-widest">
                                        {match.homeScore} - {match.awayScore}
                                    </span>
                                ) : (
                                    <span className="text-slate-600 font-mono text-lg">VS</span>
                                )}
                            </div>

                            <div className="flex-1 flex items-center justify-start gap-3 min-w-0">
                                <TeamLogo team={awayTeamObj} className="w-8 h-8 flex-shrink-0" />
                                <span className={`font-semibold text-lg truncate ${!isHome ? "text-white" : "text-slate-400"}`}>
                                    {getTeamName(match.awayTeamId)}
                                </span>
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
                                    onClick={() => onSelectMatch(match)}
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
    );
}