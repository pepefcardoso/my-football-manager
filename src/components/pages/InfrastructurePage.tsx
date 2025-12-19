import { useEffect, useState, useCallback } from "react";
import type { Team, GameState } from "../../domain/models";
import { formatCurrency } from "../../utils/formatters";
import StatCard from "../common/StatCard";
import { Logger } from "../../lib/Logger";

const logger = new Logger('InfrastructurePage');

function InfrastructurePage({ teamId }: { teamId: number }) {
    const [team, setTeam] = useState<Team | null>(null);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [loading, setLoading] = useState(false);
    const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const refreshData = useCallback(async () => {
        try {
            const teamData = await window.electronAPI.team.getTeams();
            const myTeam = teamData.find(t => t.id === teamId);
            setTeam(myTeam || null);

            const state = await window.electronAPI.game.getGameState();
            setGameState(state);

            // TODO: Buscar status detalhado se necessário futuramente
            // const status = await window.electronAPI.infrastructure.getInfrastructureStatus(teamId);
        } catch (error) {
            logger.error("Erro ao carregar dados:", error);
        }
    }, [teamId]);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    const handleExpandStadium = async () => {
        if (!gameState?.currentSeasonId || !team) return;
        setLoading(true);
        setActionMessage(null);

        try {
            const result = await window.electronAPI.infrastructure.upgradeInfrastructure(
                'expand_stadium',
                teamId,
                gameState.currentSeasonId
            );

            setActionMessage({
                type: result.success ? 'success' : 'error',
                text: result.message
            });

            if (result.success) {
                await refreshData();
            }
        } catch (error) {
            logger.error("Erro ao expandir estádio:", error);
            setActionMessage({ type: 'error', text: "Erro crítico ao comunicar com o servidor." });
        } finally {
            setLoading(false);
        }
    };

    const handleUpgradeQuality = async (type: 'stadium' | 'training' | 'youth') => {
        if (!gameState?.currentSeasonId || !team) return;
        setLoading(true);
        setActionMessage(null);

        try {
            const result = await window.electronAPI.infrastructure.upgradeInfrastructure(
                `upgrade_${type}` as any,
                teamId,
                gameState.currentSeasonId
            );

            setActionMessage({
                type: result.success ? 'success' : 'error',
                text: result.message
            });

            if (result.success) {
                await refreshData();
            }
        } catch (error) {
            logger.error(`Erro ao atualizar ${type}:`, error);
            setActionMessage({ type: 'error', text: "Erro crítico ao comunicar com o servidor." });
        } finally {
            setLoading(false);
        }
    };

    if (!team) return <div className="p-8 text-white">A carregar informações do clube...</div>;

    // TODO: VALORES REAIS, Custos estimados (visualização apenas, o backend valida o real)
    const stadiumCost = 500000;
    const qualityCost = (baseQuality: number) => Math.round(200000 * (1 + baseQuality / 50));

    return (
        <div className="p-8 pb-20 animate-in fade-in duration-500">
            <header className="mb-6 flex justify-between items-start">
                <div>
                    <h2 className="text-3xl font-light text-white mb-1">Infraestrutura</h2>
                    <p className="text-slate-400 text-sm">Gestão de Estádio e Instalações</p>
                </div>
                <div className="text-right">
                    <div className="text-sm text-slate-400 mb-1">Orçamento Disponível</div>
                    <div className={`text-2xl font-bold ${team.budget < 0 ? 'text-red-500' : 'text-emerald-400'}`}>
                        {formatCurrency(team.budget)}
                    </div>
                </div>
            </header>

            {actionMessage && (
                <div className={`mb-6 p-4 rounded border flex items-center gap-2 ${actionMessage.type === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                        : 'bg-red-500/10 border-red-500/50 text-red-400'
                    }`}>
                    <span>{actionMessage.type === 'success' ? '✅' : '❌'}</span>
                    {actionMessage.text}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard title="Capacidade Atual" value={team.stadiumCapacity} suffix="Lugares" />
                <StatCard title="Satisfação da Torcida" value={`${team.fanSatisfaction}%`} subtitle="Influencia o público" />
                <StatCard title="Base de Torcedores" value={team.fanBase} subtitle="Potencial máximo" />
            </div>

            <div className="space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 hover:border-slate-700 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                                🏟️ Estádio
                            </h3>
                            <p className="text-slate-400 text-sm">Qualidade atual: {team.stadiumQuality}/100</p>
                        </div>
                        <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden mt-2">
                            <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${team.stadiumQuality}%` }}></div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-950 p-4 rounded border border-slate-800">
                            <h4 className="font-medium text-slate-300 mb-2">Expansão de Arquibancada</h4>
                            <p className="text-xs text-slate-500 mb-4">+1.000 Lugares (Custo Fixo)</p>
                            <button
                                onClick={handleExpandStadium}
                                disabled={loading || team.budget < stadiumCost}
                                className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-sm font-medium transition-colors flex justify-center items-center gap-2"
                            >
                                {loading ? <span className="animate-spin">⏳</span> : 'Expandir'}
                                <span className="text-blue-100 text-xs">({formatCurrency(stadiumCost)})</span>
                            </button>
                        </div>

                        <div className="bg-slate-950 p-4 rounded border border-slate-800">
                            <h4 className="font-medium text-slate-300 mb-2">Modernização</h4>
                            <p className="text-xs text-slate-500 mb-4">Melhora conforto e qualidade (+5)</p>
                            <button
                                onClick={() => handleUpgradeQuality('stadium')}
                                disabled={loading || team.stadiumQuality >= 100 || team.budget < qualityCost(team.stadiumQuality)}
                                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-sm font-medium transition-colors flex justify-center items-center gap-2"
                            >
                                {loading ? <span className="animate-spin">⏳</span> : 'Melhorar'}
                                <span className="text-emerald-100 text-xs">({formatCurrency(qualityCost(team.stadiumQuality))})</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 hover:border-slate-700 transition-colors">
                        <h3 className="text-lg font-semibold text-white mb-1">🏋️ Centro de Treinamento</h3>
                        <p className="text-slate-400 text-xs mb-4">Impacta a evolução física e técnica dos jogadores.</p>

                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-bold text-slate-300">Nível {team.trainingCenterQuality}/100</span>
                            <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-yellow-500 transition-all duration-1000" style={{ width: `${team.trainingCenterQuality}%` }}></div>
                            </div>
                        </div>

                        <button
                            onClick={() => handleUpgradeQuality('training')}
                            disabled={loading || team.trainingCenterQuality >= 100 || team.budget < qualityCost(team.trainingCenterQuality)}
                            className="w-full py-2 border border-slate-600 hover:bg-slate-800 hover:text-white disabled:opacity-50 text-slate-300 rounded text-sm transition-colors flex justify-center items-center gap-2"
                        >
                            {loading ? 'Processando...' : 'Melhorar CT'}
                            <span className="text-xs">({formatCurrency(qualityCost(team.trainingCenterQuality))})</span>
                        </button>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 hover:border-slate-700 transition-colors">
                        <h3 className="text-lg font-semibold text-white mb-1">🎓 Academia de Base</h3>
                        <p className="text-slate-400 text-xs mb-4">Impacta a qualidade dos jovens revelados.</p>

                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-bold text-slate-300">Nível {team.youthAcademyQuality}/100</span>
                            <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${team.youthAcademyQuality}%` }}></div>
                            </div>
                        </div>

                        <button
                            onClick={() => handleUpgradeQuality('youth')}
                            disabled={loading || team.youthAcademyQuality >= 100 || team.budget < qualityCost(team.youthAcademyQuality)}
                            className="w-full py-2 border border-slate-600 hover:bg-slate-800 hover:text-white disabled:opacity-50 text-slate-300 rounded text-sm transition-colors flex justify-center items-center gap-2"
                        >
                            {loading ? 'Processando...' : 'Melhorar Base'}
                            <span className="text-xs">({formatCurrency(qualityCost(team.youthAcademyQuality))})</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default InfrastructurePage;