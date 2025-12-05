import { useEffect, useState, useCallback } from "react";
import type { Team, GameState } from "../../domain/models";
import { formatCurrency } from "../../utils/formatters";
import StatCard from "../common/StatCard";
import { Logger } from "../../lib/Logger";

interface InfraActionResponse {
    success: boolean;
    message: string;
}

const logger = new Logger('InfrastructurePage');

function InfrastructurePage({ teamId }: { teamId: number }) {
    const [team, setTeam] = useState<Team | null>(null);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [loading, setLoading] = useState(false);
    const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const refreshData = useCallback(async () => {
        try {
            const teamData = await window.electronAPI.getTeams();
            const myTeam = teamData.find(t => t.id === teamId);
            setTeam(myTeam || null);

            const state = await window.electronAPI.getGameState();
            setGameState(state);
        } catch (error) {
            logger.error("Erro ao carregar dados:", error);
        }
    }, [teamId]);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    const handleExpandStadium = async () => {
        if (!gameState?.currentSeasonId) return;
        setLoading(true);
        try {
            const result = await (window.electronAPI as any).upgradeInfrastructure(
                'expand_stadium',
                teamId,
                gameState.currentSeasonId
            ) as InfraActionResponse;

            setActionMessage({ type: result.success ? 'success' : 'error', text: result.message });
            if (result.success) refreshData();
        } catch (error) {
            logger.error("Erro ao expandir estádio:", error);
            setActionMessage({ type: 'error', text: "Erro ao processar solicitação." });
        } finally {
            setLoading(false);
        }
    };

    const handleUpgradeQuality = async (type: 'stadium' | 'training' | 'youth') => {
        if (!gameState?.currentSeasonId) return;
        setLoading(true);
        try {
            const result = await (window.electronAPI as any).upgradeInfrastructure(
                `upgrade_${type}`,
                teamId,
                gameState.currentSeasonId
            ) as InfraActionResponse;

            setActionMessage({ type: result.success ? 'success' : 'error', text: result.message });
            if (result.success) refreshData();
        } catch (error) {
            logger.error("Erro ao processar solicitação:", error);
            setActionMessage({ type: 'error', text: "Erro ao processar solicitação." });
        } finally {
            setLoading(false);
        }
    };

    if (!team) return <div className="p-8">A carregar...</div>;

    const stadiumCost = 500000;
    const qualityCost = (baseQuality: number) => Math.round(200000 * (1 + baseQuality / 50));

    return (
        <div className="p-8 pb-20">
            <header className="mb-6 flex justify-between items-start">
                <div>
                    <h2 className="text-3xl font-light text-white mb-1">Infraestrutura</h2>
                    <p className="text-slate-400 text-sm">Gestão de Estádio e Instalações</p>
                </div>
                <div className="text-right">
                    <div className="text-sm text-slate-400 mb-1">Orçamento Disponível</div>
                    <div className="text-2xl font-bold text-emerald-400">{formatCurrency(team.budget)}</div>
                </div>
            </header>

            {actionMessage && (
                <div className={`mb-6 p-4 rounded border ${actionMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-red-500/10 border-red-500/50 text-red-400'}`}>
                    {actionMessage.text}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard title="Capacidade Atual" value={team.stadiumCapacity} suffix="Lugares" />
                <StatCard title="Satisfação da Torcida" value={`${team.fanSatisfaction}%`} subtitle="Influencia o público" />
                <StatCard title="Base de Torcedores" value={team.fanBase} subtitle="Potencial máximo" />
            </div>

            <div className="space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-xl font-semibold text-white">🏟️ Estádio</h3>
                            <p className="text-slate-400 text-sm">Qualidade atual: {team.stadiumQuality}/100</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-950 p-4 rounded border border-slate-800">
                            <h4 className="font-medium text-slate-300 mb-2">Expansão de Arquibancada</h4>
                            <p className="text-xs text-slate-500 mb-4">+1.000 Lugares</p>
                            <button
                                onClick={handleExpandStadium}
                                disabled={loading || team.budget < stadiumCost}
                                className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-sm font-medium transition-colors"
                            >
                                Expandir ({formatCurrency(stadiumCost)})
                            </button>
                        </div>

                        <div className="bg-slate-950 p-4 rounded border border-slate-800">
                            <h4 className="font-medium text-slate-300 mb-2">Modernização</h4>
                            <p className="text-xs text-slate-500 mb-4">Melhora conforto e qualidade (+5)</p>
                            <button
                                onClick={() => handleUpgradeQuality('stadium')}
                                disabled={loading || team.stadiumQuality >= 100 || team.budget < qualityCost(team.stadiumQuality)}
                                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-sm font-medium transition-colors"
                            >
                                Melhorar ({formatCurrency(qualityCost(team.stadiumQuality))})
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-white mb-1">🏋️ Centro de Treinamento</h3>
                        <p className="text-slate-400 text-xs mb-4">Impacta a evolução física e técnica dos jogadores.</p>

                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-bold text-slate-300">Nível {team.trainingCenterQuality}/100</span>
                            <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-yellow-500" style={{ width: `${team.trainingCenterQuality}%` }}></div>
                            </div>
                        </div>

                        <button
                            onClick={() => handleUpgradeQuality('training')}
                            disabled={loading || team.trainingCenterQuality >= 100 || team.budget < qualityCost(team.trainingCenterQuality)}
                            className="w-full py-2 border border-slate-600 hover:bg-slate-800 disabled:opacity-50 text-slate-300 rounded text-sm transition-colors"
                        >
                            Melhorar CT ({formatCurrency(qualityCost(team.trainingCenterQuality))})
                        </button>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-white mb-1">🎓 Academia de Base</h3>
                        <p className="text-slate-400 text-xs mb-4">Impacta a qualidade dos jovens revelados.</p>

                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-bold text-slate-300">Nível {team.youthAcademyQuality}/100</span>
                            <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500" style={{ width: `${team.youthAcademyQuality}%` }}></div>
                            </div>
                        </div>

                        <button
                            onClick={() => handleUpgradeQuality('youth')}
                            disabled={loading || team.youthAcademyQuality >= 100 || team.budget < qualityCost(team.youthAcademyQuality)}
                            className="w-full py-2 border border-slate-600 hover:bg-slate-800 disabled:opacity-50 text-slate-300 rounded text-sm transition-colors"
                        >
                            Melhorar Base ({formatCurrency(qualityCost(team.youthAcademyQuality))})
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default InfrastructurePage;