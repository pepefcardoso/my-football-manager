import { useEffect, useState } from "react";
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
    const [allTeams, setAllTeams] = useState<Team[]>([]);
    const [simulating, setSimulating] = useState(false);
    const [showSeasonModal, setShowSeasonModal] = useState(false);
    const [seasonSummary, setSeasonSummary] = useState<SeasonSummary | null>(null);

    const advanceDateGlobal = useGameStore((state) => state.advanceDate);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [state, teamsList] = await Promise.all([
                    window.electronAPI.game.getGameState(),
                    window.electronAPI.team.getTeams()
                ]);
                setGameState(state);
                setAllTeams(teamsList);
            } catch (error) {
                logger.error("Erro ao carregar dados iniciais:", error);
            }
        };

        loadInitialData();
    }, []);

    const fetchGameState = async () => {
        try {
            const state = await window.electronAPI.game.getGameState();
            setGameState(state);
        } catch (error) {
            logger.error("Erro ao atualizar estado do jogo:", error);
        }
    };

    const handleAdvanceDay = async () => {
        if (simulating) return;
        setSimulating(true);
        try {
            const result = await window.electronAPI.game.advanceDay();

            advanceDateGlobal(result.date);
            await fetchGameState();

            if ((result as any).seasonRollover) {
                setSeasonSummary((result as any).seasonRollover);
                setShowSeasonModal(true);
            }

            if (result.messages && result.messages.length > 0) {
                result.messages.forEach(msg => logger.info(msg));
            }

        } catch (error) {
            logger.error("Erro ao avançar dia:", error);
        } finally {
            setSimulating(false);
        }
    };

    const getTeamName = (id: number) => {
        return allTeams.find(t => t.id === id)?.name || "Time Desconhecido";
    };

    return (
        <div className="p-8 relative">
            <header className="mb-8 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div
                        className="w-20 h-20 rounded-full flex items-center justify-center font-bold text-2xl shadow-lg border-2 border-slate-800"
                        style={{ backgroundColor: team.primaryColor || "#333" }}
                    >
                        {team.shortName}
                    </div>
                    <div>
                        <h2 className="text-4xl font-light text-white">{team.name}</h2>
                        <p className="text-slate-400">Visão Geral do Clube</p>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                    <div className="text-slate-400 text-sm font-mono bg-slate-900 px-3 py-1 rounded border border-slate-800">
                        {gameState?.currentDate
                            ? new Date(gameState.currentDate).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })
                            : 'Data Desconhecida'}
                    </div>
                    <button
                        onClick={handleAdvanceDay}
                        disabled={simulating}
                        className={`
                            px-6 py-3 rounded-lg font-bold text-white shadow-lg transition-all
                            ${simulating
                                ? "bg-slate-700 cursor-wait"
                                : "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 transform hover:scale-105"
                            }
                        `}
                    >
                        {simulating ? "Simulando..." : "Avançar Dia ➤"}
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <StatCard title="Reputação" value={team.reputation || 0} suffix="/10000" />
                <StatCard
                    title="Orçamento"
                    value={`€${((team.budget || 0) / 1000000).toFixed(1)}M`}
                />
                <StatCard title="Próxima Partida" value="--" subtitle="Ver Calendário" />
            </div>

            {gameState && (
                <TrainingControl
                    currentFocus={gameState.trainingFocus || "technical"}
                    onUpdate={fetchGameState}
                />
            )}

            {showSeasonModal && seasonSummary && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">

                        <div className="bg-gradient-to-r from-emerald-600 to-cyan-600 p-8 text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                            <h2 className="text-4xl font-black text-white tracking-tighter uppercase relative z-10 drop-shadow-md">
                                Temporada Encerrada!
                            </h2>
                            <p className="text-emerald-100 mt-2 font-medium relative z-10 text-lg">
                                Resumo Oficial do Ano {seasonSummary.seasonYear}
                            </p>
                        </div>

                        <div className="p-8 space-y-8">

                            <div className="text-center bg-slate-950/50 p-6 rounded-lg border border-slate-800">
                                <p className="text-amber-400 text-xs uppercase tracking-[0.2em] font-bold mb-2">Campeão Nacional</p>
                                <p className="text-4xl font-bold text-white flex items-center justify-center gap-3">
                                    <span className="text-5xl">🏆</span> {seasonSummary.championName}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                <div className="bg-slate-950/30 p-5 rounded-lg border border-slate-800">
                                    <h4 className="text-emerald-400 font-bold mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
                                        <span>🔼</span> Promovidos (Série B)
                                    </h4>
                                    <ul className="space-y-2">
                                        {seasonSummary.promotedTeams.map((teamId) => (
                                            <li key={teamId} className="text-slate-300 text-sm flex items-center gap-2 p-2 bg-slate-900/50 rounded">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                                {getTeamName(teamId)}
                                            </li>
                                        ))}
                                        {seasonSummary.promotedTeams.length === 0 && (
                                            <li className="text-slate-500 text-xs italic">Nenhum time promovido.</li>
                                        )}
                                    </ul>
                                </div>

                                <div className="bg-slate-950/30 p-5 rounded-lg border border-slate-800">
                                    <h4 className="text-red-400 font-bold mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
                                        <span>🔻</span> Rebaixados (Série A)
                                    </h4>
                                    <ul className="space-y-2">
                                        {seasonSummary.relegatedTeams.map((teamId) => (
                                            <li key={teamId} className="text-slate-300 text-sm flex items-center gap-2 p-2 bg-slate-900/50 rounded">
                                                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                                {getTeamName(teamId)}
                                            </li>
                                        ))}
                                        {seasonSummary.relegatedTeams.length === 0 && (
                                            <li className="text-slate-500 text-xs italic">Nenhum time rebaixado.</li>
                                        )}
                                    </ul>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-800">
                                <button
                                    onClick={() => setShowSeasonModal(false)}
                                    className="w-full py-4 bg-white hover:bg-slate-200 text-slate-900 font-bold rounded-lg transition-all shadow-lg hover:shadow-white/10 flex items-center justify-center gap-2"
                                >
                                    <span>📅</span> Iniciar Pré-Temporada {seasonSummary.seasonYear + 1}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ClubOverviewPage;