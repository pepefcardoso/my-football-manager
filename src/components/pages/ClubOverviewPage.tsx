import { useEffect, useState, useCallback, useRef } from "react";
import TrainingControl from "../features/squad/TrainingControl";
import type { GameState, Team } from "../../domain/models";
import StatCard from "../common/StatCard";
import { Logger } from "../../lib/Logger";
import { useGameStore } from "../../store/useGameStore";

const logger = new Logger("ClubOverviewPage");

interface SeasonSummary {
    seasonYear: number;
    championName: string;
    promotedTeams: number[];
    relegatedTeams: number[];
}

function ClubOverviewPage({ team }: { team: Team }) {
    const [gameState, setGameState] = useState<GameState | null>(null);
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

    useEffect(() => {
        const fetchState = async () => {
            try {
                const state = await window.electronAPI.game.getGameState();
                setGameState(state);
                if (state?.currentDate) {
                    advanceDate(state.currentDate);
                }
            } catch (error) {
                logger.error("Erro ao sincronizar estado inicial:", error);
            }
        };
        fetchState();

        return () => {
            isSimulatingRef.current = false;
        };
    }, [advanceDate]);

    const processSingleDay = useCallback(async (): Promise<{ shouldStop: boolean; reason?: string }> => {
        try {
            const result = await window.electronAPI.game.advanceDay();

            if (result.stopReason) {
                if (result.stopReason === 'match_day') {
                    logger.info("⏸️ Simulação pausada: Dia de Jogo.");
                    navigateInGame("matches");
                    return { shouldStop: true, reason: 'match_day' };
                }

                if (result.stopReason === 'financial_crisis') {
                    logger.warn("⏸️ Simulação pausada: Crise Financeira.");
                    navigateInGame("finances");
                    alert("Atenção: A diretoria exige uma reunião sobre as finanças!");
                    return { shouldStop: true, reason: 'financial_crisis' };
                }

                if (result.stopReason === 'transfer_proposal') {
                    logger.info("⏸️ Simulação pausada: Proposta de Transferência.");

                    navigateInGame("transfer");

                    return { shouldStop: true, reason: 'transfer_proposal' };
                }
                return { shouldStop: true, reason: result.stopReason };
            }

            if (result.date) {
                advanceDate(result.date);
                const newState = await window.electronAPI.game.getGameState();
                setGameState(newState);
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
            alert("Erro ao processar a simulação. Verifique o console.");
            return { shouldStop: true, reason: 'error' };
        }
    }, [navigateInGame, advanceDate, triggerEvent]);

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

    const handleStopSimulation = () => {
        isSimulatingRef.current = false;
    };

    const displayDate = currentDate
        ? new Date(currentDate).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })
        : 'Data Desconhecida';

    return (
        <div className="p-8 relative animate-in fade-in duration-500">
            <header className="mb-8 flex justify-between items-center bg-slate-900/50 p-4 rounded-xl border border-slate-800 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                    <div
                        className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl shadow-lg border-2 border-slate-700 relative overflow-hidden"
                        style={{ backgroundColor: team.primaryColor || "#333" }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent" />
                        <span className="relative z-10 text-white drop-shadow-md">{team.shortName}</span>
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-white tracking-tight">{team.name}</h2>
                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Visão Geral do Clube
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-3">
                    <div className="text-slate-300 font-mono bg-slate-950/80 px-4 py-1.5 rounded-lg border border-slate-700 text-sm shadow-inner">
                        📅 {displayDate}
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={handleAdvanceOneDay}
                            disabled={isProcessing}
                            className="px-4 py-3 rounded-lg font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Avançar apenas 1 dia"
                        >
                            +1 Dia
                        </button>

                        {isProcessing ? (
                            <button
                                onClick={handleStopSimulation}
                                className="px-8 py-3 rounded-lg font-bold text-white shadow-lg transition-all duration-300 bg-red-600 hover:bg-red-500 hover:scale-[1.02] active:scale-95"
                            >
                                <div className="flex items-center gap-2">
                                    <span>Parar</span>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            </button>
                        ) : (
                            <button
                                onClick={handleSimulateContinue}
                                className="group relative px-8 py-3 rounded-lg font-bold text-white shadow-lg transition-all duration-300 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 hover:scale-[1.02] active:scale-95"
                            >
                                <div className="flex items-center gap-2">
                                    <span>Continuar</span>
                                    <span className="text-emerald-200 group-hover:translate-x-1 transition-transform">➤</span>
                                </div>
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <StatCard
                    title="Reputação do Clube"
                    value={team.reputation || 0}
                    suffix="/10000"
                />
                <StatCard
                    title="Orçamento Disponível"
                    value={`€${((team.budget || 0) / 1000000).toFixed(1)}M`}
                    subtitle={team.budget < 0 ? "⚠️ Finanças em risco" : "Saúde financeira estável"}
                />
                <StatCard
                    title="Próximo Desafio"
                    value="Ver Calendário"
                    subtitle="Prepare a equipe"
                />
            </div>

            {gameState && (
                <div className="animate-in slide-in-from-bottom-4 duration-700 delay-100">
                    <TrainingControl
                        currentFocus={gameState.trainingFocus || "technical"}
                        onUpdate={async () => {
                            const newState = await window.electronAPI.game.getGameState();
                            setGameState(newState);
                        }}
                    />
                </div>
            )}

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

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-950/30 p-4 rounded-lg border border-slate-800/50">
                                    <h4 className="text-emerald-400 font-bold mb-3 flex items-center gap-2">
                                        <span>🔼</span> Promovidos
                                    </h4>
                                    <div className="text-sm text-slate-300">
                                        {seasonSummary.promotedTeams.length > 0
                                            ? seasonSummary.promotedTeams.join(", ")
                                            : "Nenhum time promovido."}
                                    </div>
                                </div>
                                <div className="bg-slate-950/30 p-4 rounded-lg border border-slate-800/50">
                                    <h4 className="text-red-400 font-bold mb-3 flex items-center gap-2">
                                        <span>🔻</span> Rebaixados
                                    </h4>
                                    <div className="text-sm text-slate-300">
                                        {seasonSummary.relegatedTeams.length > 0
                                            ? seasonSummary.relegatedTeams.join(", ")
                                            : "Nenhum time rebaixado."}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowSeasonModal(false)}
                                className="w-full py-4 bg-white hover:bg-slate-200 text-slate-900 font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
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