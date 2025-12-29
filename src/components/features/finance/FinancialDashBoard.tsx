import { formatCurrency } from "../../../utils/formatters";
import StatCard from "../../common/StatCard";
import { SkeletonCard } from "../../common/Skeleton";
import { useFinanceDashboard } from "../../../hooks/api/useFinance";

interface FinancialDashboardProps {
    teamId: number;
    seasonId: number;
}

export function FinancialDashboard({ teamId, seasonId }: FinancialDashboardProps) {
    const { data, isLoading, error } = useFinanceDashboard(teamId, seasonId);

    if (isLoading) {
        return (
            <div className="space-y-6 animate-in fade-in">
                <SkeletonCard />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <SkeletonCard /> <SkeletonCard /> <SkeletonCard /> <SkeletonCard />
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-6 text-red-400">
                <p className="font-bold mb-2">Erro ao carregar Dashboard</p>
                <p className="text-sm">{error instanceof Error ? error.message : "Erro desconhecido"}</p>
            </div>
        );
    }

    const getHealthColor = (health: string) => {
        switch (health) {
            case "Healthy": return "text-emerald-400";
            case "Warning": return "text-yellow-400";
            case "Critical": return "text-red-400";
            default: return "text-slate-400";
        }
    };

    const getHealthIcon = (health: string) => {
        switch (health) {
            case "Healthy": return "✅";
            case "Warning": return "⚠️";
            case "Critical": return "🚨";
            default: return "❓";
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-sm font-medium text-slate-400 mb-2">Saúde Financeira</h3>
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">{getHealthIcon(data.financialHealth)}</span>
                            <span className={`text-2xl font-bold ${getHealthColor(data.financialHealth)}`}>
                                {data.financialHealth}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Orçamento Atual"
                    value={formatCurrency(data.currentBudget)}
                    subtitle={data.currentBudget < 0 ? "⚠️ Em Dívida" : "Fundos Disponíveis"}
                />
                <StatCard
                    title="Receita Mensal"
                    value={formatCurrency(data.monthlyIncome)}
                    subtitle="Projeção"
                />
                <StatCard
                    title="Despesa Mensal"
                    value={formatCurrency(data.monthlyExpenses)}
                    subtitle="Custos totais"
                />
                <StatCard
                    title="Fluxo de Caixa"
                    value={formatCurrency(data.monthlyCashflow)}
                    subtitle={data.monthlyCashflow >= 0 ? "Superávit" : "Déficit"}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">💼 Folha Salarial</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400">Mensal</span>
                            <span className="font-mono text-emerald-400">{formatCurrency(data.salaryBill.monthly)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400">Anual</span>
                            <span className="font-mono text-white">{formatCurrency(data.salaryBill.annual)}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">🏭 Custos Operacionais</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400">Mensal</span>
                            <span className="font-mono text-red-400">{formatCurrency(data.operationalCosts.monthly)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400">Anual</span>
                            <span className="font-mono text-white">{formatCurrency(data.operationalCosts.annual)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}