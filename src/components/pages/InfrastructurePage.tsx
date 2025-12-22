import { useEffect, useState, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

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

interface Team {
    id: number;
    name: string;
    budget: number;
}

interface GameState {
    currentSeasonId: number;
}

function InfrastructurePage({ teamId }: { teamId: number }) {
    const [team, setTeam] = useState<Team | null>(null);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [status, setStatus] = useState<InfrastructureStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<"overview" | "competitive" | "history" | "ffp">("overview");
    const [rivalComparison, setRivalComparison] = useState<any>(null);
    const [chartData, setChartData] = useState<any[]>([]);
    const [ffpReport, setFFPReport] = useState<any>(null);

    const refreshData = useCallback(async () => {
        try {
            const [teamData, state, infrastructureStatus] = await Promise.all([
                window.electronAPI.team.getTeams().then((teams: any[]) =>
                    teams.find((t) => t.id === teamId)
                ),
                window.electronAPI.game.getGameState(),
                window.electronAPI.infrastructure.getStatus(teamId),
            ]);

            setTeam(teamData || null);
            setGameState(state);
            setStatus(infrastructureStatus);
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
        }
    }, [teamId]);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    const loadCompetitiveData = useCallback(async () => {
        try {
            const comparison = await window.electronAPI.infrastructure.compareWithLeague(teamId);
            setRivalComparison(comparison);
        } catch (error) {
            console.error("Erro ao carregar comparação:", error);
        }
    }, [teamId]);

    const loadHistoryData = useCallback(async () => {
        try {
            const data = await window.electronAPI.infrastructure.getChartData(teamId, "capacity");
            setChartData(data || []);
        } catch (error) {
            console.error("Erro ao carregar histórico:", error);
        }
    }, [teamId]);

    const loadFFPData = useCallback(async () => {
        if (!gameState?.currentSeasonId) return;
        try {
            const report = await window.electronAPI.infrastructure.getFFPReport(teamId, gameState.currentSeasonId);
            setFFPReport(report);
        } catch (error) {
            console.error("Erro ao carregar FFP:", error);
        }
    }, [teamId, gameState?.currentSeasonId]);

    useEffect(() => {
        if (activeTab === "competitive") loadCompetitiveData();
        if (activeTab === "history") loadHistoryData();
        if (activeTab === "ffp") loadFFPData();
    }, [activeTab, loadCompetitiveData, loadHistoryData, loadFFPData]);

    const handleUpgrade = async (facilityType: "stadium" | "training" | "youth", upgradeType: "expand" | "quality") => {
        if (!gameState?.currentSeasonId || !team) return;
        setLoading(true);

        try {
            let result;
            if (upgradeType === "expand" && facilityType === "stadium") {
                result = await window.electronAPI.infrastructure.expandStadium(teamId, gameState.currentSeasonId);
            } else {
                result = await window.electronAPI.infrastructure.upgradeFacility(teamId, gameState.currentSeasonId, facilityType);
            }

            if (result.success) {
                alert(`✅ ${result.message}`);
                await refreshData();
            } else {
                alert(`❌ ${result.message}`);
            }
        } catch (error) {
            console.error("Erro ao realizar upgrade:", error);
            alert("Erro ao processar upgrade");
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
                </div>
            </div>
        );
    }

    const formatCurrency = (value: number) => `€${value.toLocaleString()}`;
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
                    <div className={`text-2xl font-bold ${team.budget < 0 ? 'text-red-500' : 'text-emerald-400'}`}>
                        {formatCurrency(team.budget)}
                    </div>
                </div>
            </header>

            <div className="mb-6 border-b border-slate-800">
                <div className="flex gap-4">
                    {["overview", "competitive", "history", "ffp"].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === tab
                                ? "border-emerald-500 text-emerald-400"
                                : "border-transparent text-slate-400 hover:text-white"
                                }`}
                        >
                            {tab === "overview" && "Visão Geral"}
                            {tab === "competitive" && "Comparação"}
                            {tab === "history" && "Histórico"}
                            {tab === "ffp" && "FFP"}
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === "overview" && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                            <div className="text-sm text-slate-400 mb-1">Torcida Atual</div>
                            <div className="text-2xl font-bold text-white">{status.fanBase.current.toLocaleString()}</div>
                            <div className={`text-xs mt-1 ${status.fanBase.growthRate > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {status.fanBase.growthRate > 0 ? '↗' : '↘'} {(status.fanBase.growthRate * 100).toFixed(1)}% projetado
                            </div>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                            <div className="text-sm text-slate-400 mb-1">Ocupação do Estádio</div>
                            <div className="text-2xl font-bold text-white">{utilizationPercentage}%</div>
                            <div className="text-xs text-slate-500 mt-1">
                                {status.stadium.averageAttendance.toLocaleString()} / {status.stadium.capacity.toLocaleString()}
                            </div>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                            <div className="text-sm text-slate-400 mb-1">Receita por Jogo</div>
                            <div className="text-2xl font-bold text-emerald-400">{formatCurrency(status.stadium.revenuePerMatch)}</div>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                            <div className="text-sm text-slate-400 mb-1">Custos Mensais</div>
                            <div className="text-2xl font-bold text-red-400">{formatCurrency(status.totalMonthlyCost)}</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-semibold text-white mb-2">🏟️ Estádio</h3>
                                    <div className="text-sm text-slate-400">
                                        <p>Capacidade: {status.stadium.capacity.toLocaleString()}</p>
                                        <p>Qualidade: {status.stadium.quality}/100</p>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <button
                                    onClick={() => handleUpgrade("stadium", "expand")}
                                    disabled={loading || team.budget < status.stadium.nextExpansionCost}
                                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded text-sm"
                                >
                                    Expandir (+1000) - {formatCurrency(status.stadium.nextExpansionCost)}
                                </button>
                                <button
                                    onClick={() => handleUpgrade("stadium", "quality")}
                                    disabled={loading || team.budget < status.stadium.nextQualityUpgradeCost}
                                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded text-sm"
                                >
                                    Melhorar (+5) - {formatCurrency(status.stadium.nextQualityUpgradeCost)}
                                </button>
                            </div>
                        </div>

                        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-semibold text-white mb-2">🏋️ Centro de Treinamento</h3>
                                    <div className="text-sm text-slate-400">
                                        <p>Qualidade: {status.trainingCenter.quality}/100</p>
                                        <p className="text-emerald-400">-{(status.trainingCenter.injuryReductionRate * 100).toFixed(0)}% Lesões</p>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => handleUpgrade("training", "quality")}
                                disabled={loading || team.budget < status.trainingCenter.nextUpgradeCost}
                                className="w-full py-2 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white rounded text-sm"
                            >
                                Melhorar (+5) - {formatCurrency(status.trainingCenter.nextUpgradeCost)}
                            </button>
                        </div>

                        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-semibold text-white mb-2">🎓 Academia de Base</h3>
                                    <div className="text-sm text-slate-400">
                                        <p>Qualidade: {status.youthAcademy.quality}/100</p>
                                        <p className="text-blue-400">+{status.youthAcademy.intakeQualityBonus} Qualidade Jovens</p>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => handleUpgrade("youth", "quality")}
                                disabled={loading || team.budget < status.youthAcademy.nextUpgradeCost}
                                className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded text-sm"
                            >
                                Melhorar (+5) - {formatCurrency(status.youthAcademy.nextUpgradeCost)}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "competitive" && (
                <div className="space-y-6">
                    {rivalComparison ? (
                        <>
                            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                                <h3 className="text-xl font-semibold text-white mb-4">🏆 Classificação da Liga</h3>
                                <div className="mb-4">
                                    <div className="text-3xl font-bold text-emerald-400">#{rivalComparison.userTeam.ranking}</div>
                                    <div className="text-sm text-slate-400">de {rivalComparison.rivals.length + 1} times</div>
                                    <div className="text-sm text-slate-500 mt-2">
                                        Score de Infraestrutura: {rivalComparison.userTeam.overallInfrastructureScore}/100
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {rivalComparison.insights.map((insight: string, idx: number) => (
                                        <div key={idx} className="text-sm text-slate-300 p-2 bg-slate-950 rounded">{insight}</div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                                <h3 className="text-xl font-semibold text-white mb-4">📊 Médias da Liga</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-sm text-slate-400">Capacidade Média</div>
                                        <div className="text-lg font-bold text-white">{rivalComparison.leagueAverage.stadiumCapacity.toLocaleString()}</div>
                                        <div className="text-xs text-slate-500">Você: {status.stadium.capacity.toLocaleString()}</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-slate-400">Qualidade CT Média</div>
                                        <div className="text-lg font-bold text-white">{rivalComparison.leagueAverage.trainingQuality}</div>
                                        <div className="text-xs text-slate-500">Você: {status.trainingCenter.quality}</div>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-center text-slate-400 py-8">Carregando dados...</div>
                    )}
                </div>
            )}

            {activeTab === "history" && (
                <div className="space-y-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                        <h3 className="text-xl font-semibold text-white mb-4">📈 Evolução da Capacidade</h3>
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="date" stroke="#94a3b8" />
                                    <YAxis stroke="#94a3b8" />
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                                    <Legend />
                                    <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} name="Capacidade" />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-center text-slate-400 py-8">Sem dados históricos disponíveis</div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === "ffp" && (
                <div className="space-y-6">
                    {ffpReport ? (
                        <>
                            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                                <h3 className="text-xl font-semibold text-white mb-4">📋 Relatório FFP</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-sm text-slate-400">Status de Conformidade</div>
                                        <div className={`text-lg font-bold ${ffpReport.complianceStatus.compliant ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {ffpReport.complianceStatus.compliant ? "✅ Conforme" : "❌ Não Conforme"}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-slate-400">Limite de Investimento</div>
                                        <div className="text-lg font-bold text-white">{formatCurrency(ffpReport.complianceStatus.investmentCap)}</div>
                                        <div className="text-xs text-slate-500">Gasto: {formatCurrency(ffpReport.complianceStatus.currentInvestment)}</div>
                                    </div>
                                </div>
                                {ffpReport.complianceStatus.violations.length > 0 && (
                                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/50 rounded">
                                        <div className="text-sm text-red-400 font-medium mb-2">Violações:</div>
                                        {ffpReport.complianceStatus.violations.map((v: string, idx: number) => (
                                            <div key={idx} className="text-xs text-red-300">{v}</div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                                <h3 className="text-xl font-semibold text-white mb-4">💰 Depreciação de Ativos</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Valor Contábil Total</span>
                                        <span className="text-white font-bold">{formatCurrency(ffpReport.totalBookValue)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Depreciação Anual</span>
                                        <span className="text-white font-bold">{formatCurrency(ffpReport.totalAnnualDepreciation)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Despesas Ajustadas FFP</span>
                                        <span className="text-white font-bold">{formatCurrency(ffpReport.ffpAdjustedExpenses)}</span>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-center text-slate-400 py-8">Carregando relatório FFP...</div>
                    )}
                </div>
            )}
        </div>
    );
}

export default InfrastructurePage;