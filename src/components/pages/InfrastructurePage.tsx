import { useEffect, useState, useCallback } from "react";
import { FacilityCard } from "../features/infrastructure/FacilityCard";
import { LoadingSpinner } from "../common/Loading";
import { cn } from "../../utils/cn";
import { COLOR_SYSTEM } from "../../utils/designSystem";

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

    const handleUpgrade = async (facilityType: FacilityType, amount: number = 1) => {
        if (!team) return;
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
        return <LoadingSpinner size="lg" centered={true} />;
    }

    if (!team || !status) {
        return <div className="p-8 text-red-400">Falha ao carregar dados.</div>;
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
            <header className="flex justify-between items-start bg-slate-900/50 p-6 rounded-xl border border-slate-800 backdrop-blur-sm">
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
                <div className={cn(COLOR_SYSTEM.status.info.bg, COLOR_SYSTEM.status.info.border,"p-4 rounded-lg flex items-center justify-between animate-pulse")}>
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🏗️</span>
                        <div>
                            <h4 className="text-blue-200 font-bold">Obra em Andamento</h4>
                            <p className="text-blue-300/70 text-sm">
                                {status.activeConstruction.facilityType === 'stadium_capacity'
                                    ? `Expandindo Estádio`
                                    : `Melhorando ${status.facilities[status.activeConstruction.facilityType]?.name}`
                                }
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

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {facilityKeys.map((key) => {
                    const facility = status.facilities[key];
                    if (!facility) return null;

                    const unitCost = key === "stadium_capacity" ? facility.upgradeCost : undefined;

                    return (
                        <FacilityCard
                            key={key}
                            type={key}
                            title={facility.name}
                            icon={getFacilityIcon(key)}
                            level={facility.currentLevel}
                            description={facility.currentBenefit}
                            bonusText={key === 'stadium_capacity' ? "Selecione a quantidade abaixo" : `Prox: ${facility.nextBenefit}`}
                            upgradeCost={facility.upgradeCost}
                            unitCost={unitCost}
                            isMaxLevel={facility.isMaxLevel}
                            isLoading={actionLoading || facility.isUpgrading}
                            canAfford={team.budget >= facility.upgradeCost}
                            onUpgrade={(amount) => handleUpgrade(key, amount)}
                            onDowngrade={() => handleDowngrade(key)}
                        />
                    );
                })}
            </div>
        </div>
    );
}

export default InfrastructurePage;