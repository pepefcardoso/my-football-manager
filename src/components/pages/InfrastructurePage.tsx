import { useEffect, useState, useCallback } from "react";
import type { Team, GameState } from "../../domain/models";
import { formatCurrency } from "../../utils/formatters";
import { Logger } from "../../lib/Logger";
import Badge from "../common/Badge";

const logger = new Logger('InfrastructurePage');

interface InfrastructureStatus {
    stadium: {
        capacity: number;
        quality: number;
        utilizationRate: number;
        averageAttendance: number;
        revenuePerMatch: number;
        annualMaintenanceCost: number;
        monthlyMaintenanceCost: number;
        isPressured: boolean;
        expansionRecommended: boolean;
        nextExpansionCost: number;
        nextQualityUpgradeCost: number;
    };
    trainingCenter: {
        quality: number;
        injuryReductionRate: number;
        fitnessBonus: number;
        recoverySpeedMultiplier: number;
        developmentBonus: number;
        annualMaintenanceCost: number;
        monthlyMaintenanceCost: number;
        nextUpgradeCost: number;
        upgradeRecommended: boolean;
    };
    youthAcademy: {
        quality: number;
        intakeQualityBonus: number;
        intakeQuantityBonus: number;
        potentialBoost: number;
        developmentRate: number;
        currentYouthPlayers: number;
        annualMaintenanceCost: number;
        monthlyMaintenanceCost: number;
        nextUpgradeCost: number;
        upgradeRecommended: boolean;
    };
    totalAnnualCost: number;
    totalMonthlyCost: number;
    fanBase: {
        current: number;
        projected: number;
        growthRate: number;
        capacityRatio: number;
    };
    financialHealth: {
        canAffordUpgrades: boolean;
        recommendedReserve: number;
        availableBudget: number;
        infrastructureBudgetCap: number;
    };
}

function InfrastructurePage({ teamId }: { teamId: number }) {
    const [team, setTeam] = useState<Team | null>(null);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [status, setStatus] = useState<InfrastructureStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const [actionMessage, setActionMessage] = useState<{
        type: 'success' | 'error' | 'warning';
        text: string;
        warnings?: string[];
    } | null>(null);

    const refreshData = useCallback(async () => {
        try {
            const [teamData, state, infrastructureStatus] = await Promise.all([
                window.electronAPI.team.getTeams().then(teams =>
                    teams.find(t => t.id === teamId)
                ),
                window.electronAPI.game.getGameState(),
                window.electronAPI.infrastructure.getStatus(teamId),
            ]);

            setTeam(teamData || null);
            setGameState(state);
            setStatus(infrastructureStatus);
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
            const result = await window.electronAPI.infrastructure.expandStadium(
                teamId,
                gameState.currentSeasonId
            );

            if (result.success && result.data) {
                setActionMessage({
                    type: 'success',
                    text: result.message || 'Estádio expandido com sucesso!',
                    warnings: result.warnings,
                });
                await refreshData();
            } else {
                setActionMessage({
                    type: 'error',
                    text: result.message || 'Erro ao expandir estádio',
                });
            }
        } catch (error) {
            logger.error("Erro ao expandir estádio:", error);
            setActionMessage({
                type: 'error',
                text: "Erro crítico ao comunicar com o servidor.",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleUpgradeQuality = async (
        facilityType: 'stadium' | 'training' | 'youth'
    ) => {
        if (!gameState?.currentSeasonId || !team) return;
        setLoading(true);
        setActionMessage(null);

        try {
            const result = await window.electronAPI.infrastructure.upgradeFacility(
                teamId,
                gameState.currentSeasonId,
                facilityType
            );

            if (result.success && result.data) {
                setActionMessage({
                    type: 'success',
                    text: result.message || 'Instalação melhorada com sucesso!',
                    warnings: result.warnings,
                });
                await refreshData();
            } else {
                setActionMessage({
                    type: 'error',
                    text: result.message || 'Erro ao melhorar instalação',
                });
            }
        } catch (error) {
            logger.error(`Erro ao atualizar ${facilityType}:`, error);
            setActionMessage({
                type: 'error',
                text: "Erro crítico ao comunicar com o servidor.",
            });
        } finally {
            setLoading(false);
        }
    };

    if (!team || !status) {
        return (
            <div className="p-8 text-white">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-slate-800 rounded w-1/4"></div>
                    <div className="h-4 bg-slate-800 rounded w-1/2"></div>
                    <div className="grid grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-48 bg-slate-800 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const canAffordAnyUpgrade = status.financialHealth.canAffordUpgrades;
    const utilizationPercentage = Math.round(status.stadium.utilizationRate * 100);

    return (
        <div className="p-8 pb-20 animate-in fade-in duration-500">
            <header className="mb-6 flex justify-between items-start">
                <div>
                    <h2 className="text-3xl font-light text-white mb-1">Infraestrutura</h2>
                    <p className="text-slate-400 text-sm">Gestão de Instalações e Crescimento</p>
                </div>
                <div className="text-right">
                    <div className="text-sm text-slate-400 mb-1">Orçamento Disponível</div>
                    <div className={`text-2xl font-bold ${team.budget < 0 ? 'text-red-500' : 'text-emerald-400'
                        }`}>
                        {formatCurrency(team.budget)}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                        Limite Infraestrutura: {formatCurrency(status.financialHealth.infrastructureBudgetCap)}
                    </div>
                </div>
            </header>

            {actionMessage && (
                <div className={`mb-6 p-4 rounded border ${actionMessage.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                    : actionMessage.type === 'warning'
                        ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-400'
                        : 'bg-red-500/10 border-red-500/50 text-red-400'
                    }`}>
                    <div className="flex items-start gap-2">
                        <span className="text-xl">
                            {actionMessage.type === 'success' ? '✅' :
                                actionMessage.type === 'warning' ? '⚠️' : '❌'}
                        </span>
                        <div className="flex-1">
                            <p className="font-medium">{actionMessage.text}</p>
                            {actionMessage.warnings && actionMessage.warnings.length > 0 && (
                                <ul className="mt-2 text-sm space-y-1">
                                    {actionMessage.warnings.map((warning, idx) => (
                                        <li key={idx} className="flex items-start gap-2">
                                            <span>⚠️</span>
                                            <span>{warning}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {!canAffordAnyUpgrade && (
                <div className="mb-6 p-4 rounded border bg-yellow-500/10 border-yellow-500/50 text-yellow-400">
                    <div className="flex items-start gap-2">
                        <span className="text-xl">⚠️</span>
                        <div>
                            <p className="font-medium">Reserva Financeira Insuficiente</p>
                            <p className="text-sm mt-1">
                                Mantenha pelo menos {formatCurrency(status.financialHealth.recommendedReserve)} +
                                3 meses de custos operacionais antes de investir em infraestrutura.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                    <div className="text-sm text-slate-400 mb-1">Torcida Atual</div>
                    <div className="text-2xl font-bold text-white">
                        {status.fanBase.current.toLocaleString()}
                    </div>
                    <div className={`text-xs mt-1 ${status.fanBase.growthRate > 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                        {status.fanBase.growthRate > 0 ? '↗' : '↘'} {(status.fanBase.growthRate * 100).toFixed(1)}%
                        projetado
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                    <div className="text-sm text-slate-400 mb-1">Ocupação do Estádio</div>
                    <div className="text-2xl font-bold text-white">
                        {utilizationPercentage}%
                    </div>
                    <div className={`text-xs mt-1 ${status.stadium.isPressured ? 'text-red-400' : 'text-slate-500'
                        }`}>
                        {status.stadium.averageAttendance.toLocaleString()} / {status.stadium.capacity.toLocaleString()}
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                    <div className="text-sm text-slate-400 mb-1">Receita por Jogo</div>
                    <div className="text-2xl font-bold text-emerald-400">
                        {formatCurrency(status.stadium.revenuePerMatch)}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                        Média por partida em casa
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                    <div className="text-sm text-slate-400 mb-1">Custos Mensais</div>
                    <div className="text-2xl font-bold text-red-400">
                        {formatCurrency(status.totalMonthlyCost)}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                        Manutenção total
                    </div>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 mb-6">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-xl font-semibold text-white flex items-center gap-2 mb-2">
                            🏟️ Estádio
                            {status.stadium.isPressured && (
                                <Badge variant="danger">Pressão de Capacidade</Badge>
                            )}
                        </h3>
                        <div className="text-sm text-slate-400 space-y-1">
                            <p>Capacidade: {status.stadium.capacity.toLocaleString()} lugares</p>
                            <p>Qualidade: {status.stadium.quality}/100</p>
                            <p>Manutenção Mensal: {formatCurrency(status.stadium.monthlyMaintenanceCost)}</p>
                        </div>
                    </div>

                    <div className="w-48">
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                            <span>Qualidade</span>
                            <span>{status.stadium.quality}%</span>
                        </div>
                        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-1000 ${status.stadium.quality >= 80 ? 'bg-emerald-500' :
                                    status.stadium.quality >= 60 ? 'bg-blue-500' :
                                        status.stadium.quality >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                style={{ width: `${status.stadium.quality}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-950 p-4 rounded border border-slate-800">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h4 className="font-medium text-slate-200 mb-1">Expansão de Capacidade</h4>
                                <p className="text-xs text-slate-500">+1.000 lugares</p>
                            </div>
                            {status.stadium.expansionRecommended && (
                                <Badge variant="success">Recomendado</Badge>
                            )}
                        </div>

                        <div className="text-sm text-slate-400 mb-3 space-y-1">
                            <p>💰 Custo: {formatCurrency(status.stadium.nextExpansionCost)}</p>
                            <p>📈 Público Atual: {utilizationPercentage}% de ocupação</p>
                            {status.stadium.isPressured && (
                                <p className="text-red-400">⚠️ Demanda reprimida - perdendo receita</p>
                            )}
                        </div>

                        <button
                            onClick={handleExpandStadium}
                            disabled={loading || !canAffordAnyUpgrade ||
                                team.budget < status.stadium.nextExpansionCost}
                            className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-sm font-medium transition-colors"
                        >
                            {loading ? 'Processando...' : 'Expandir Estádio'}
                        </button>
                    </div>

                    <div className="bg-slate-950 p-4 rounded border border-slate-800">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h4 className="font-medium text-slate-200 mb-1">Modernização</h4>
                                <p className="text-xs text-slate-500">+5 pontos de qualidade</p>
                            </div>
                        </div>

                        <div className="text-sm text-slate-400 mb-3 space-y-1">
                            <p>💰 Custo: {formatCurrency(status.stadium.nextQualityUpgradeCost)}</p>
                            <p>✨ Melhora experiência e atração de torcedores</p>
                            <p>📊 Nível atual: {status.stadium.quality}/100</p>
                        </div>

                        <button
                            onClick={() => handleUpgradeQuality('stadium')}
                            disabled={loading || !canAffordAnyUpgrade ||
                                status.stadium.quality >= 100 ||
                                team.budget < status.stadium.nextQualityUpgradeCost}
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-sm font-medium transition-colors"
                        >
                            {loading ? 'Processando...' :
                                status.stadium.quality >= 100 ? 'Nível Máximo' : 'Melhorar Qualidade'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                                🏋️ Centro de Treinamento
                                {status.trainingCenter.upgradeRecommended && (
                                    <Badge variant="warning">Recomendado</Badge>
                                )}
                            </h3>
                            <p className="text-xs text-slate-400">
                                Manutenção: {formatCurrency(status.trainingCenter.monthlyMaintenanceCost)}/mês
                            </p>
                        </div>

                        <div className="text-right">
                            <div className="text-2xl font-bold text-white">
                                {status.trainingCenter.quality}
                            </div>
                            <div className="text-xs text-slate-500">Qualidade</div>
                        </div>
                    </div>

                    <div className="bg-slate-950 p-3 rounded mb-4">
                        <div className="text-xs font-medium text-slate-400 mb-2">Benefícios Atuais</div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                                <span className="text-slate-500">Redução Lesões:</span>
                                <span className="text-emerald-400 ml-1 font-medium">
                                    {(status.trainingCenter.injuryReductionRate * 100).toFixed(1)}%
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-500">Bônus Fitness:</span>
                                <span className="text-blue-400 ml-1 font-medium">
                                    +{status.trainingCenter.fitnessBonus}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-500">Recuperação:</span>
                                <span className="text-purple-400 ml-1 font-medium">
                                    {status.trainingCenter.recoverySpeedMultiplier.toFixed(2)}x
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-500">Desenvolvimento:</span>
                                <span className="text-yellow-400 ml-1 font-medium">
                                    +{(status.trainingCenter.developmentBonus * 100).toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="text-sm text-slate-400 mb-3">
                        <p className="mb-1">💰 Custo Upgrade: {formatCurrency(status.trainingCenter.nextUpgradeCost)}</p>
                        <p className="text-xs">Nível após upgrade: {Math.min(100, status.trainingCenter.quality + 5)}</p>
                    </div>

                    <button
                        onClick={() => handleUpgradeQuality('training')}
                        disabled={loading || !canAffordAnyUpgrade ||
                            status.trainingCenter.quality >= 100 ||
                            team.budget < status.trainingCenter.nextUpgradeCost}
                        className="w-full py-2 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-sm font-medium transition-colors"
                    >
                        {loading ? 'Processando...' :
                            status.trainingCenter.quality >= 100 ? 'Nível Máximo' : 'Melhorar CT'}
                    </button>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                                🎓 Academia de Base
                                {status.youthAcademy.upgradeRecommended && (
                                    <Badge variant="warning">Recomendado</Badge>
                                )}
                            </h3>
                            <p className="text-xs text-slate-400">
                                Manutenção: {formatCurrency(status.youthAcademy.monthlyMaintenanceCost)}/mês
                            </p>
                        </div>

                        <div className="text-right">
                            <div className="text-2xl font-bold text-white">
                                {status.youthAcademy.quality}
                            </div>
                            <div className="text-xs text-slate-500">Qualidade</div>
                        </div>
                    </div>

                    <div className="bg-slate-950 p-3 rounded mb-4">
                        <div className="text-xs font-medium text-slate-400 mb-2">Benefícios Atuais</div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                                <span className="text-slate-500">Qualidade Jovens:</span>
                                <span className="text-emerald-400 ml-1 font-medium">
                                    +{status.youthAcademy.intakeQualityBonus}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-500">Quantidade Extra:</span>
                                <span className="text-blue-400 ml-1 font-medium">
                                    +{status.youthAcademy.intakeQuantityBonus}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-500">Potencial:</span>
                                <span className="text-purple-400 ml-1 font-medium">
                                    +{status.youthAcademy.potentialBoost}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-500">Taxa Evolução:</span>
                                <span className="text-yellow-400 ml-1 font-medium">
                                    {status.youthAcademy.developmentRate.toFixed(2)}x
                                </span>
                            </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-800 text-xs text-slate-400">
                            Jovens Ativos: {status.youthAcademy.currentYouthPlayers}
                        </div>
                    </div>

                    <div className="text-sm text-slate-400 mb-3">
                        <p className="mb-1">💰 Custo Upgrade: {formatCurrency(status.youthAcademy.nextUpgradeCost)}</p>
                        <p className="text-xs">Nível após upgrade: {Math.min(100, status.youthAcademy.quality + 5)}</p>
                    </div>

                    <button
                        onClick={() => handleUpgradeQuality('youth')}
                        disabled={loading || !canAffordAnyUpgrade ||
                            status.youthAcademy.quality >= 100 ||
                            team.budget < status.youthAcademy.nextUpgradeCost}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-sm font-medium transition-colors"
                    >
                        {loading ? 'Processando...' :
                            status.youthAcademy.quality >= 100 ? 'Nível Máximo' : 'Melhorar Academia'}
                    </button>
                </div>
            </div>

            <div className="mt-6 bg-slate-900 border border-slate-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Resumo Financeiro</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-950 p-4 rounded">
                        <div className="text-sm text-slate-400 mb-1">Custos Anuais</div>
                        <div className="text-xl font-bold text-red-400">
                            {formatCurrency(status.totalAnnualCost)}
                        </div>
                    </div>
                    <div className="bg-slate-950 p-4 rounded">
                        <div className="text-sm text-slate-400 mb-1">Custos Mensais</div>
                        <div className="text-xl font-bold text-orange-400">
                            {formatCurrency(status.totalMonthlyCost)}
                        </div>
                    </div>
                    <div className="bg-slate-950 p-4 rounded">
                        <div className="text-sm text-slate-400 mb-1">Reserva Mínima</div>
                        <div className="text-xl font-bold text-slate-300">
                            {formatCurrency(status.financialHealth.recommendedReserve)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default InfrastructurePage;