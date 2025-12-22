import { useEffect, useState, useCallback } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from "recharts";
import { FacilityCard } from "../features/infrastructure/FacilityCard";

type FacilityType =
    | "stadium_capacity"
    | "stadium_quality"
    | "training_center_quality"
    | "youth_academy_quality"
    | "medical_center_quality"
    | "administrative_center_quality";

interface FacilityStatus {
    type: FacilityType;
    name: string;
    currentLevel: number;
    nextLevel: number;
    upgradeCost: number;
    monthlyMaintenance: number;
    constructionDuration: number;
    isMaxLevel: boolean;
    isUpgrading: boolean;
    currentBenefit: string;
    nextBenefit: string;
}

interface ActiveConstruction {
    facilityType: FacilityType;
    startLevel: number;
    targetLevel: number;
    cost: number;
    daysRemaining: number;
}

interface InfrastructureOverview {
    teamId: number;
    budget: number;
    facilities: Record<FacilityType, FacilityStatus>;
    activeConstruction: ActiveConstruction | null;
    totalMaintenanceCost: number;
}

interface Team {
    id: number;
    name: string;
    budget: number;
}

const getFacilityIcon = (type: FacilityType): string => {
    switch (type) {
        case "stadium_capacity": return "🏟️";
        case "stadium_quality": return "✨";
        case "training_center_quality": return "🏋️";
        case "youth_academy_quality": return "🎓";
        case "medical_center_quality": return "🏥";
        case "administrative_center_quality": return "🏢";
        default: return "🏗️";
    }
};

const formatMoney = (value: number) => `€${value.toLocaleString('pt-PT')}`;

function InfrastructurePage({ teamId }: { teamId: number }) {
    const [team, setTeam] = useState<Team | null>(null);
    const [status, setStatus] = useState<InfrastructureOverview | null>(null);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<"overview" | "competitive" | "history">("overview");
    const [rivalComparison, setRivalComparison] = useState<any>(null);
    const [chartData, setChartData] = useState<any[]>([]);

    const refreshData = useCallback(async () => {
        setLoading(true);
        try {
            const [teamData, infrastructureStatus] = await Promise.all([
                window.electronAPI.team.getTeams().then((teams: any[]) =>
                    teams.find((t) => t.id === teamId)
                ),
                window.electronAPI.infrastructure.getStatus(teamId),
            ]);

            setTeam(teamData || null);
            setStatus(infrastructureStatus as InfrastructureOverview);
        } catch (error) {
            console.error("Erro ao carregar dados de infraestrutura:", error);
        } finally {
            setLoading(false);
        }
    }, [teamId]);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    useEffect(() => {
        const loadTabData = async () => {
            if (activeTab === "competitive" && !rivalComparison) {
                const comparison = await window.electronAPI.infrastructure.compareWithLeague(teamId);
                setRivalComparison(comparison);
            }
            if (activeTab === "history" && chartData.length === 0) {
                const data = await window.electronAPI.infrastructure.getChartData(teamId, "capacity");
                setChartData(data || []);
            }
        };
        loadTabData();
    }, [activeTab, teamId, rivalComparison, chartData.length]);

    const handleUpgrade = async (facilityType: FacilityType) => {
        if (!team) return;

        const amount = facilityType === "stadium_capacity" ? 1000 : 1;

        setActionLoading(true);
        try {
            const result = await window.electronAPI.infrastructure.startUpgrade(teamId, facilityType, amount);

            if (result.success) {
                await refreshData();
            } else {
                alert(`❌ ${result.message}`);
            }
        } catch (error) {
            console.error("Erro no upgrade:", error);
            alert("Erro ao processar a melhoria.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDowngrade = async (facilityType: FacilityType) => {
        if (facilityType === "stadium_capacity") return;

        setActionLoading(true);
        try {
            const result = await window.electronAPI.infrastructure.downgradeFacility(teamId, facilityType, 1);
            if (result.success) {
                await refreshData();
            } else {
                alert(`❌ ${result.message}`);
            }
        } catch (error) {
            console.error("Erro no downgrade:", error);
        } finally {
            setActionLoading(false);
        }
    };

    if (loading && !status) {
        return (
            <div className="p-8 flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    if (!team || !status) {
        return <div className="p-8 text-red-400">Falha ao carregar dados de infraestrutura.</div>;
    }

    const facilityKeys: FacilityType[] = [
        "stadium_capacity",
        "stadium_quality",
        "training_center_quality",
        "youth_academy_quality",
        "medical_center_quality",
        "administrative_center_quality"
    ];

    return (
        <div className="p-8 pb-20 animate-in fade-in duration-500 space-y-6">
            <header className="flex justify-between items-start bg-slate-900/50 p-6 rounded-xl border border-slate-800">
                <div>
                    <h2 className="text-3xl font-light text-white mb-1">Infraestrutura</h2>
                    <p className="text-slate-400 text-sm">Gestão Patrimonial e Desenvolvimento</p>
                </div>
                <div className="text-right">
                    <div className="text-sm text-slate-400 mb-1">Orçamento Disponível</div>
                    <div className={`text-3xl font-bold ${team.budget < 0 ? 'text-red-500' : 'text-emerald-400'}`}>
                        {formatMoney(team.budget)}
                    </div>
                </div>
            </header>

            {status.activeConstruction && (
                <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🏗️</span>
                        <div>
                            <h4 className="text-blue-200 font-bold">Obra em Andamento</h4>
                            <p className="text-blue-300/70 text-sm">
                                Atualizando {status.facilities[status.activeConstruction.facilityType]?.name}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-mono font-bold text-white">
                            {status.activeConstruction.daysRemaining} dias
                        </div>
                        <div className="text-xs text-blue-300">restantes</div>
                    </div>
                </div>
            )}

            <div className="border-b border-slate-800">
                <div className="flex gap-1">
                    {[
                        { id: "overview", label: "Visão Geral" },
                        { id: "competitive", label: "Comparação da Liga" },
                        { id: "history", label: "Histórico" }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === tab.id
                                ? "border-emerald-500 text-emerald-400 bg-slate-900/50"
                                : "border-transparent text-slate-400 hover:text-white hover:bg-slate-900/30"
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === "overview" && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
                            <div className="text-sm text-slate-400 mb-1">Custo Mensal Total</div>
                            <div className="text-2xl font-bold text-red-400">
                                {formatMoney(status.totalMaintenanceCost)}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">Manutenção de Instalações</div>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
                            <div className="text-sm text-slate-400 mb-1">Capacidade Total</div>
                            <div className="text-2xl font-bold text-white">
                                {status.facilities.stadium_capacity.currentLevel.toLocaleString()}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">Lugares Disponíveis</div>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
                            <div className="text-sm text-slate-400 mb-1">Qualidade Média</div>
                            <div className="text-2xl font-bold text-emerald-400">
                                {Math.round(
                                    (status.facilities.training_center_quality.currentLevel +
                                        status.facilities.youth_academy_quality.currentLevel +
                                        status.facilities.medical_center_quality.currentLevel) / 3
                                )}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">Nível Global (0-100)</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {facilityKeys.map((key) => {
                            const facility = status.facilities[key];
                            if (!facility) return null;

                            return (
                                <FacilityCard
                                    key={key}
                                    title={facility.name}
                                    icon={getFacilityIcon(key)}
                                    level={facility.currentLevel}
                                    description={facility.currentBenefit}
                                    bonusText={`Prox: ${facility.nextBenefit}`}
                                    upgradeCost={facility.upgradeCost}
                                    isMaxLevel={facility.isMaxLevel}
                                    isLoading={actionLoading || facility.isUpgrading}
                                    canAfford={team.budget >= facility.upgradeCost}
                                    onUpgrade={() => handleUpgrade(key)}
                                    onDowngrade={() => handleDowngrade(key)}
                                />
                            );
                        })}
                    </div>
                </div>
            )}

            {activeTab === "competitive" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    {rivalComparison ? (
                        <>
                            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                                <h3 className="text-xl font-semibold text-white mb-4">🏆 Ranking de Infraestrutura</h3>
                                <div className="mb-6">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-bold text-emerald-400">#{rivalComparison.userTeam.ranking}</span>
                                        <span className="text-slate-400">de {rivalComparison.rivals.length + 1} clubes</span>
                                    </div>
                                    <p className="text-slate-500 mt-2">
                                        Seu Score Geral: <span className="text-white font-bold">{rivalComparison.userTeam.overallInfrastructureScore}/100</span>
                                    </p>
                                </div>

                                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Insights da Diretoria</h4>
                                <div className="space-y-2">
                                    {rivalComparison.insights.map((insight: string, idx: number) => (
                                        <div key={idx} className="text-sm text-slate-300 p-3 bg-slate-950/50 border border-slate-800 rounded flex items-center gap-3">
                                            <span className="text-emerald-500">💡</span>
                                            {insight}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                                <h3 className="text-xl font-semibold text-white mb-6">📊 Comparativo Direto</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    <div>
                                        <div className="text-xs text-slate-500 uppercase">Média Capacidade</div>
                                        <div className="text-xl font-bold text-white mt-1">
                                            {rivalComparison.leagueAverage.stadiumCapacity.toLocaleString()}
                                        </div>
                                        <div className={`text-xs mt-1 ${status.facilities.stadium_capacity.currentLevel > rivalComparison.leagueAverage.stadiumCapacity ? 'text-emerald-400' : 'text-red-400'}`}>
                                            Você: {status.facilities.stadium_capacity.currentLevel.toLocaleString()}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-500 uppercase">Qualidade CT</div>
                                        <div className="text-xl font-bold text-white mt-1">
                                            {rivalComparison.leagueAverage.trainingQuality.toFixed(1)}
                                        </div>
                                        <div className="text-xs text-slate-400 mt-1">
                                            Você: {status.facilities.training_center_quality.currentLevel}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex justify-center p-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === "history" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                        <h3 className="text-xl font-semibold text-white mb-6">📈 Evolução Patrimonial</h3>
                        {chartData.length > 0 ? (
                            <div className="h-[400px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                        <XAxis
                                            dataKey="date"
                                            stroke="#64748b"
                                            tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short' })}
                                        />
                                        <YAxis stroke="#64748b" />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff' }}
                                            itemStyle={{ color: '#10b981' }}
                                        />
                                        <Legend />
                                        <Line
                                            type="monotone"
                                            dataKey="value"
                                            stroke="#10b981"
                                            strokeWidth={3}
                                            dot={{ r: 4, fill: '#10b981' }}
                                            activeDot={{ r: 6 }}
                                            name="Capacidade do Estádio"
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="text-center text-slate-500 py-12 bg-slate-950/30 rounded-lg">
                                Sem dados históricos suficientes para gerar o gráfico.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default InfrastructurePage;