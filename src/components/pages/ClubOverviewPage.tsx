import { useEffect, useState, useCallback, useRef } from "react";
import type { GameState, Team } from "../../domain/models";
import { Logger } from "../../lib/Logger";
import { useGameStore } from "../../store/useGameStore";
import { TrainingFocus } from "../../domain/enums";

const logger = new Logger("ClubOverviewPage");

interface ExtendedMatchInfo {
    date: string;
    opponentName: string;
    opponentShortName: string;
    competitionName: string;
    location: "HOME" | "AWAY";
    score?: string;
    result?: "W" | "D" | "L";
}

interface SeasonSummary {
    seasonYear: number;
    championName: string;
    promotedTeams: number[];
    relegatedTeams: number[];
}

function ClubOverviewPage({ team }: { team: Team }) {
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [teamsMap, setTeamsMap] = useState<Record<number, Team>>({});
    const [nextMatch, setNextMatch] = useState<ExtendedMatchInfo | null>(null);
    const [recentResults, setRecentResults] = useState<ExtendedMatchInfo[]>([]);
    const [formStreak, setFormStreak] = useState<("W" | "D" | "L")[]>([]);
    const [seasonSummary, setSeasonSummary] = useState<SeasonSummary | null>(null);
    const [showSeasonModal, setShowSeasonModal] = useState(false);
    const isSimulatingRef = useRef(false);

    const {
        currentDate,
        isProcessing,
        setProcessing,
        advanceDate,
        triggerEvent,
        navigateInGame
    } = useGameStore();

    const updateMatchData = useCallback(async (teamId: number, seasonId: number, tMap: Record<number, Team>) => {
        try {
            const matches = await window.electronAPI.match.getMatches(teamId, seasonId);
            const sortedMatches = matches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            const upcoming = sortedMatches.find(m => !m.isPlayed);

            if (upcoming) {
                const isHome = upcoming.homeTeamId === teamId;
                const opponentId = isHome ? upcoming.awayTeamId : upcoming.homeTeamId;
                const opponent = opponentId ? tMap[opponentId] : null;

                setNextMatch({
                    date: upcoming.date,
                    opponentName: opponent?.name || "Desconhecido",
                    opponentShortName: opponent?.shortName || "???",
                    competitionName: "Liga Nacional",
                    location: isHome ? "HOME" : "AWAY"
                });
            } else {
                setNextMatch(null);
            }

            const played = sortedMatches.filter(m => m.isPlayed).reverse();
            const recent: ExtendedMatchInfo[] = played.slice(0, 5).map(m => {
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
                    date: new Date(m.date).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' }),
                    opponentName: opponent?.name || "???",
                    opponentShortName: opponent?.shortName || "???",
                    competitionName: "Liga", // TODO adicionar competição real
                    location: (isHome ? "HOME" : "AWAY") as "HOME" | "AWAY",
                    score: `${m.homeScore} - ${m.awayScore}`,
                    result
                };
            });

            setRecentResults(recent);
            setFormStreak(recent.map(r => r.result!).reverse());

        } catch (error) {
            logger.error("Erro ao buscar partidas:", error);
        }
    }, []);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [state, allTeams] = await Promise.all([
                    window.electronAPI.game.getGameState(),
                    window.electronAPI.team.getTeams()
                ]);

                setGameState(state);

                const tMap: Record<number, Team> = {};
                allTeams.forEach(t => tMap[t.id] = t);
                setTeamsMap(tMap);

                if (state?.currentDate) {
                    advanceDate(state.currentDate);
                    await updateMatchData(team.id, state.currentSeasonId || 1, tMap);
                }
            } catch (error) {
                logger.error("Erro ao sincronizar estado inicial:", error);
            }
        };
        fetchInitialData();

        return () => {
            isSimulatingRef.current = false;
        };
    }, [team.id, advanceDate, updateMatchData]);

    const processSingleDay = useCallback(async (): Promise<{ shouldStop: boolean; reason?: string }> => {
        try {
            const result = await window.electronAPI.game.advanceDay();

            if (result.stopReason) {
                const stopMapping: Record<string, string> = {
                    'match_day': "matches",
                    'financial_crisis': "finances",
                    'transfer_proposal': "transfer"
                };

                const route = stopMapping[result.stopReason];
                if (route) {
                    logger.info(`⏸️ Simulação pausada: ${result.stopReason}`);
                    setTimeout(() => navigateInGame(route as any), 100);
                    return { shouldStop: true, reason: result.stopReason };
                }
                return { shouldStop: true, reason: result.stopReason };
            }

            if (result.date) {
                advanceDate(result.date);
                const newState = await window.electronAPI.game.getGameState();
                setGameState(newState);
                if (newState) {
                    await updateMatchData(team.id, newState.currentSeasonId || 1, teamsMap);
                }
            }

            if ((result as any).narrativeEvent) {
                triggerEvent((result as any).narrativeEvent);
                return { shouldStop: true, reason: 'event' };
            }

            if ((result as any).seasonRollover) {
                setSeasonSummary((result as any).seasonRollover);
                setShowSeasonModal(true);
                return { shouldStop: true, reason: 'season_end' };
            }

            return { shouldStop: false };

        } catch (error) {
            logger.error("Erro crítico ao avançar dia:", error);
            return { shouldStop: true, reason: 'error' };
        }
    }, [navigateInGame, advanceDate, triggerEvent, team.id, teamsMap, updateMatchData]);

    const handleAdvanceOneDay = useCallback(async () => {
        if (isProcessing) return;
        setProcessing(true);
        await processSingleDay();
        setProcessing(false);
    }, [isProcessing, setProcessing, processSingleDay]);

    const handleSimulateContinue = useCallback(async () => {
        if (isProcessing) return;
        setProcessing(true);
        isSimulatingRef.current = true;

        while (isSimulatingRef.current) {
            const result = await processSingleDay();
            if (result.shouldStop) {
                isSimulatingRef.current = false;
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        setProcessing(false);
    }, [isProcessing, setProcessing, processSingleDay]);

    const handleUpdateTraining = async (focus: string) => {
        if (isProcessing) return;
        await window.electronAPI.game.updateTrainingFocus(focus);
        const newState = await window.electronAPI.game.getGameState();
        setGameState(newState);
    };

    const displayDate = currentDate
        ? new Date(currentDate).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })
        : 'Carregando...';

    const trainingOptions = [
        { id: TrainingFocus.TECHNICAL, label: "⚽ Técnico", color: "emerald" },
        { id: TrainingFocus.TACTICAL, label: "📋 Tático", color: "blue" },
        { id: TrainingFocus.PHYSICAL, label: "💪 Físico", color: "orange" },
        { id: TrainingFocus.REST, label: "🛌 Descanso", color: "indigo" },
    ];

    return (
        <div className="min-h-screen bg-slate-950 p-8 animate-in fade-in duration-500">
            <header className="mb-8 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div
                        className="w-20 h-20 rounded-2xl flex items-center justify-center font-black text-3xl shadow-2xl border-2 border-white/10 relative overflow-hidden"
                        style={{ backgroundColor: team.primaryColor || "#333" }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
                        <span className="relative z-10 text-white drop-shadow-lg select-none">
                            {team.shortName.substring(0, 2)}
                        </span>
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tight">{team.name}</h1>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-slate-400 text-sm">Temporada 2024/25</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-3">
                    <div className="text-slate-300 font-mono bg-slate-900 px-6 py-2 rounded-xl border border-slate-800 text-sm shadow-lg">
                        📅 {displayDate}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleAdvanceOneDay}
                            disabled={isProcessing}
                            className="px-6 py-3 rounded-xl font-bold text-sm text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all disabled:opacity-50 shadow-lg hover:shadow-xl active:scale-95"
                        >
                            +1 Dia
                        </button>

                        {isProcessing ? (
                            <button
                                onClick={() => { isSimulatingRef.current = false; }}
                                className="px-8 py-3 rounded-xl font-bold text-sm text-white bg-red-600 hover:bg-red-500 transition-all shadow-lg hover:shadow-xl active:scale-95"
                            >
                                <div className="flex items-center gap-2">
                                    <span>⏸ Parar</span>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            </button>
                        ) : (
                            <button
                                onClick={handleSimulateContinue}
                                className="group px-8 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 transition-all shadow-lg hover:shadow-2xl hover:shadow-emerald-500/20 active:scale-95"
                            >
                                <div className="flex items-center gap-2">
                                    <span>▶ Continuar</span>
                                    <span className="text-emerald-200 group-hover:translate-x-1 transition-transform">➤</span>
                                </div>
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[minmax(120px,auto)]">

                <div className="col-span-1 md:col-span-12 lg:col-span-8 row-span-2 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 rounded-2xl border border-slate-800 p-8 shadow-2xl relative overflow-hidden group hover:border-emerald-500/30 transition-all">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                    {nextMatch ? (
                        <div className="relative z-10 h-full flex flex-col justify-between">
                            <div className="flex items-center gap-2 mb-6">
                                <span className="text-3xl">⚽</span>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Próximo Desafio</h3>
                                    <p className="text-xs text-emerald-400 font-mono">{nextMatch.competitionName}</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mb-6">
                                <div className="text-center flex-1">
                                    <div className="text-sm text-slate-500 mb-2">{team.name}</div>
                                    <div
                                        className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-lg border border-white/10"
                                        style={{ backgroundColor: team.primaryColor }}
                                    >
                                        {team.shortName.substring(0, 3)}
                                    </div>
                                </div>

                                <div className="px-8 text-center">
                                    <div className="text-6xl font-black text-slate-700 mb-2 select-none">VS</div>
                                    <div className={`inline-block px-4 py-1 rounded-full text-xs font-bold ${nextMatch.location === "HOME"
                                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                        : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                        }`}>
                                        {nextMatch.location === "HOME" ? "🏠 CASA" : "✈️ FORA"}
                                    </div>
                                </div>

                                <div className="text-center flex-1">
                                    <div className="text-sm text-slate-500 mb-2">{nextMatch.opponentName}</div>
                                    <div className="w-20 h-20 mx-auto rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl font-black text-white shadow-lg">
                                        {nextMatch.opponentShortName.substring(0, 3)}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-6 border-t border-slate-800">
                                <div>
                                    <div className="text-xs text-slate-500 mb-2">Data do Jogo</div>
                                    <div className="text-lg font-bold text-white font-mono">
                                        {new Date(nextMatch.date).toLocaleDateString("pt-PT", { day: "2-digit", month: "long" })}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500 mr-2">Forma Recente:</span>
                                    {formStreak.map((result, i) => (
                                        <span
                                            key={i}
                                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${result === "W" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                                                result === "D" ? "bg-slate-700 text-slate-400 border border-slate-600" :
                                                    "bg-red-500/20 text-red-400 border border-red-500/30"
                                                }`}
                                            title={result === "W" ? "Vitória" : result === "D" ? "Empate" : "Derrota"}
                                        >
                                            {result}
                                        </span>
                                    ))}
                                    {formStreak.length === 0 && <span className="text-slate-600 text-xs">--</span>}
                                </div>

                                <button
                                    onClick={() => navigateInGame("matches")}
                                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-2xl hover:shadow-emerald-500/20 active:scale-95"
                                >
                                    Ver Detalhes →
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500">
                            <span className="text-4xl mb-4">💤</span>
                            <p className="text-lg font-medium">Sem jogos agendados em breve.</p>
                            <p className="text-sm">Aguarde o início da próxima temporada.</p>
                        </div>
                    )}
                </div>

                <div className="col-span-1 md:col-span-6 lg:col-span-4 bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-lg hover:border-slate-700 transition-all">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-2xl">💰</span>
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Orçamento</h3>
                    </div>
                    <div className={`text-4xl font-black mb-2 tracking-tight ${team.budget < 0 ? "text-red-400" : "text-emerald-400"}`}>
                        €{(team.budget / 1000000).toFixed(1)}M
                    </div>
                    <div className="flex justify-between items-center">
                        <div className="text-xs text-slate-500">
                            {team.budget < 0 ? "⚠️ Finanças em risco" : "Saúde financeira estável"}
                        </div>
                        <button
                            onClick={() => navigateInGame("finances")}
                            className="text-xs text-slate-400 hover:text-white underline decoration-slate-600"
                        >
                            Gerir
                        </button>
                    </div>
                </div>

                <div className="col-span-1 md:col-span-6 lg:col-span-4 bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-lg hover:border-slate-700 transition-all">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-2xl">⭐</span>
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Reputação</h3>
                    </div>
                    <div className="text-4xl font-black text-white mb-2 tracking-tight">{team.reputation}</div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                            className="bg-gradient-to-r from-yellow-500 to-amber-500 h-2 rounded-full transition-all duration-1000"
                            style={{ width: `${Math.min(100, (team.reputation / 10000) * 100)}%` }}
                        />
                    </div>
                </div>

                <div className="col-span-1 md:col-span-12 lg:col-span-8 bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-lg">
                    <div className="flex items-center gap-2 mb-6">
                        <span className="text-2xl">📊</span>
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Últimos Resultados</h3>
                    </div>

                    <div className="space-y-3">
                        {recentResults.length > 0 ? (
                            recentResults.map((match, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-slate-950/50 rounded-xl border border-slate-800 hover:border-slate-700 transition-all group">
                                    <div className="flex items-center gap-4">
                                        <span
                                            className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold shadow-sm ${match.result === "W" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500/20" :
                                                match.result === "D" ? "bg-slate-700/30 text-slate-400 border border-slate-600/30" :
                                                    "bg-red-500/10 text-red-400 border border-red-500/20 group-hover:bg-red-500/20"
                                                }`}
                                        >
                                            {match.result}
                                        </span>
                                        <div>
                                            <div className="font-bold text-slate-200">{match.opponentName}</div>
                                            <div className="text-xs text-slate-500 font-mono">{match.date} • {match.location === "HOME" ? "Casa" : "Fora"}</div>
                                        </div>
                                    </div>
                                    <div className="text-lg font-mono font-bold text-white tracking-widest bg-slate-900 px-3 py-1 rounded-md border border-slate-800">
                                        {match.score}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-slate-600 italic">
                                Nenhum jogo disputado recentemente.
                            </div>
                        )}
                    </div>
                </div>

                <div className="col-span-1 md:col-span-12 lg:col-span-4 bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-lg">
                    <div className="flex items-center gap-2 mb-6">
                        <span className="text-2xl">🏋️</span>
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Foco Treino</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-3 h-[calc(100%-3rem)] content-start">
                        {trainingOptions.map((option) => {
                            const isActive = gameState?.trainingFocus === option.id;
                            return (
                                <button
                                    key={option.id}
                                    onClick={() => handleUpdateTraining(option.id)}
                                    className={`
                                        p-4 rounded-xl border transition-all text-xs font-bold flex flex-col items-center justify-center gap-2 h-24
                                        ${isActive
                                            ? `bg-${option.color}-600/20 border-${option.color}-500 text-white shadow-lg ring-1 ring-${option.color}-500/50`
                                            : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800 hover:border-slate-700"
                                        }
                                    `}
                                >
                                    <span className="text-2xl">{option.label.split(" ")[0]}</span>
                                    <span>{option.label.split(" ")[1]}</span>
                                    {isActive && <span className="w-2 h-2 rounded-full bg-emerald-500 absolute top-2 right-2 shadow-glow"></span>}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {showSeasonModal && seasonSummary && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in zoom-in duration-300">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden">
                        <div className="bg-gradient-to-r from-emerald-600 to-cyan-600 p-8 text-center">
                            <h2 className="text-4xl font-black text-white tracking-tighter uppercase drop-shadow-md">
                                Temporada Encerrada!
                            </h2>
                            <p className="text-emerald-100 mt-2 font-medium text-lg">
                                Resumo Oficial do Ano {seasonSummary.seasonYear}
                            </p>
                        </div>
                        <div className="p-8 space-y-8">
                            <div className="text-center bg-slate-950/50 p-6 rounded-xl border border-slate-800">
                                <p className="text-amber-400 text-xs uppercase tracking-widest font-bold mb-2">Campeão Nacional</p>
                                <p className="text-3xl font-bold text-white flex items-center justify-center gap-3">
                                    <span className="text-4xl">🏆</span> {seasonSummary.championName}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowSeasonModal(false)}
                                className="w-full py-4 bg-white hover:bg-slate-200 text-slate-900 font-bold rounded-xl transition-all shadow-lg"
                            >
                                Iniciar Nova Temporada
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ClubOverviewPage;