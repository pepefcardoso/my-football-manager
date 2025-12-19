import { useEffect, useState } from "react";
import { formatCurrency } from "../../../utils/formatters";
import { Logger } from "../../../lib/Logger";
import StatCard from "../../common/StatCard";
import Badge from "../../common/Badge";

const logger = new Logger("FinancialDashboard");

interface DashboardData {
    currentBudget: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    monthlyCashflow: number;
    salaryBill: {
        annual: number;
        monthly: number;
        playerCount: number;
    };
    operationalCosts: {
        annual: number;
        monthly: number;
    };
    projectedAnnualRevenue: number;
    ffpCompliance: boolean;
    financialHealth: string;
}

interface FinancialDashboardProps {
    teamId: number;
    seasonId: number;
}

export function FinancialDashboard({ teamId, seasonId }: FinancialDashboardProps) {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDashboard = async () => {
            setLoading(true);
            setError(null);

            try {
                const dashboard = await window.electronAPI.finance.getDashboard(teamId, seasonId);

                if (dashboard) {
                    setData(dashboard);
                } else {
                    setError("Failed to load financial dashboard");
                }
            } catch (err) {
                logger.error("Error fetching dashboard:", err);
                setError(err instanceof Error ? err.message : "Unknown error");
            } finally {
                setLoading(false);
            }
        };

        fetchDashboard();
    }, [teamId, seasonId]);

    if (loading) {
        return (
            <div className="flex justify-center p-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-6 text-red-400">
                <p className="font-bold mb-2">Error Loading Dashboard</p>
                <p className="text-sm">{error || "No data available"}</p>
            </div>
        );
    }

    const getHealthColor = (health: string) => {
        switch (health) {
            case "Healthy":
                return "text-emerald-400";
            case "Warning":
                return "text-yellow-400";
            case "Critical":
                return "text-red-400";
            default:
                return "text-slate-400";
        }
    };

    const getHealthIcon = (health: string) => {
        switch (health) {
            case "Healthy":
                return "✅";
            case "Warning":
                return "⚠️";
            case "Critical":
                return "🚨";
            default:
                return "❓";
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-sm font-medium text-slate-400 mb-2">Financial Health Status</h3>
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">{getHealthIcon(data.financialHealth)}</span>
                            <span className={`text-2xl font-bold ${getHealthColor(data.financialHealth)}`}>
                                {data.financialHealth}
                            </span>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-slate-500 mb-1">FFP Compliance</p>
                        <Badge variant={data.ffpCompliance ? "success" : "danger"}>
                            {data.ffpCompliance ? "Compliant" : "Violation"}
                        </Badge>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Current Budget"
                    value={formatCurrency(data.currentBudget)}
                    subtitle={data.currentBudget < 0 ? "⚠️ In debt" : "Available funds"}
                />
                <StatCard
                    title="Monthly Income"
                    value={formatCurrency(data.monthlyIncome)}
                    subtitle="Projected revenue"
                />
                <StatCard
                    title="Monthly Expenses"
                    value={formatCurrency(data.monthlyExpenses)}
                    subtitle="Total costs"
                />
                <StatCard
                    title="Monthly Cashflow"
                    value={formatCurrency(data.monthlyCashflow)}
                    subtitle={data.monthlyCashflow >= 0 ? "Surplus" : "Deficit"}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">💼 Salary Bill</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400">Monthly Wages</span>
                            <span className="font-mono text-emerald-400">{formatCurrency(data.salaryBill.monthly)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400">Annual Total</span>
                            <span className="font-mono text-white">{formatCurrency(data.salaryBill.annual)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t border-slate-800">
                            <span className="text-slate-400">Active Players</span>
                            <span className="font-bold text-white">{data.salaryBill.playerCount}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400">Avg. per Player</span>
                            <span className="font-mono text-slate-300">
                                {formatCurrency(Math.round(data.salaryBill.annual / data.salaryBill.playerCount))}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">🏭 Operational Costs</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400">Monthly Operations</span>
                            <span className="font-mono text-red-400">{formatCurrency(data.operationalCosts.monthly)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400">Annual Projection</span>
                            <span className="font-mono text-white">{formatCurrency(data.operationalCosts.annual)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t border-slate-800">
                            <span className="text-slate-400">% of Revenue</span>
                            <span className="font-bold text-white">
                                {((data.operationalCosts.annual / data.projectedAnnualRevenue) * 100).toFixed(1)}%
                            </span>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 lg:col-span-2">
                    <h3 className="text-lg font-semibold text-white mb-4">💰 Revenue Projection</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <p className="text-xs text-slate-500 mb-1">Projected Annual</p>
                            <p className="text-xl font-bold text-emerald-400">{formatCurrency(data.projectedAnnualRevenue)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 mb-1">Monthly Avg.</p>
                            <p className="text-xl font-bold text-white">
                                {formatCurrency(Math.round(data.projectedAnnualRevenue / 12))}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 mb-1">Total Costs</p>
                            <p className="text-xl font-bold text-red-400">
                                {formatCurrency(data.salaryBill.annual + data.operationalCosts.annual)}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 mb-1">Projected Profit</p>
                            <p className={`text-xl font-bold ${data.projectedAnnualRevenue - (data.salaryBill.annual + data.operationalCosts.annual) >= 0
                                    ? "text-emerald-400"
                                    : "text-red-400"
                                }`}>
                                {formatCurrency(
                                    data.projectedAnnualRevenue - (data.salaryBill.annual + data.operationalCosts.annual)
                                )}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}