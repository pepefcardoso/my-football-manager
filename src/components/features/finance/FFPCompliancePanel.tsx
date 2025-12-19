import { useEffect, useState } from "react";
import { formatCurrency } from "../../../utils/formatters";
import { Logger } from "../../../lib/Logger";
import Badge from "../../common/Badge";

const logger = new Logger("FFPCompliancePanel");

interface FFPData {
    compliant: boolean;
    violations: string[];
    salaryToRevenueRatio: number;
    annualLoss: number;
    maxAllowedLoss: number;
}

interface FFPCompliancePanelProps {
    teamId: number;
    seasonId: number;
}

export function FFPCompliancePanel({ teamId, seasonId }: FFPCompliancePanelProps) {
    const [data, setData] = useState<FFPData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const result = await window.electronAPI.finance.checkFFPCompliance(teamId, seasonId);
                setData(result);
            } catch (error) {
                logger.error("Error fetching FFP compliance:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [teamId, seasonId]);

    if (loading) {
        return (
            <div className="flex justify-center p-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-6 text-red-400">
                Failed to load FFP compliance data
            </div>
        );
    }

    const maxSalaryRatio = 0.7; // 70%
    const salaryRatioPercentage = data.salaryToRevenueRatio * 100;
    const salaryRatioStatus = salaryRatioPercentage <= maxSalaryRatio * 100 ? "compliant" : "violation";

    const lossStatus = data.annualLoss <= data.maxAllowedLoss ? "compliant" : "violation";

    return (
        <div className="space-y-6">
            <div className={`border-2 rounded-lg p-8 ${data.compliant
                    ? "bg-emerald-900/20 border-emerald-700"
                    : "bg-red-900/20 border-red-700"
                }`}>
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-2xl font-bold text-white mb-2">
                            Financial Fair Play Status
                        </h3>
                        <p className="text-slate-400">
                            Assessment for Season {seasonId}
                        </p>
                    </div>
                    <div className="text-center">
                        <div className={`text-6xl mb-2 ${data.compliant ? "" : "animate-pulse"}`}>
                            {data.compliant ? "✅" : "⚠️"}
                        </div>
                        <Badge variant={data.compliant ? "success" : "danger"} className="text-lg px-4 py-2">
                            {data.compliant ? "COMPLIANT" : "VIOLATION"}
                        </Badge>
                    </div>
                </div>

                {!data.compliant && data.violations.length > 0 && (
                    <div className="mt-6 bg-red-500/10 border border-red-500/50 rounded-lg p-4">
                        <h4 className="font-bold text-red-400 mb-3">⚠️ Violations Detected</h4>
                        <ul className="space-y-2">
                            {data.violations.map((violation, idx) => (
                                <li key={idx} className="text-sm text-red-300 flex items-start gap-2">
                                    <span className="text-red-500">•</span>
                                    <span>{violation}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">💼 Salary to Revenue Ratio</h3>
                        <Badge variant={salaryRatioStatus === "compliant" ? "success" : "danger"}>
                            {salaryRatioStatus === "compliant" ? "✓ Pass" : "✗ Fail"}
                        </Badge>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-slate-400">Current Ratio</span>
                                <span className={`font-bold ${salaryRatioStatus === "compliant" ? "text-emerald-400" : "text-red-400"
                                    }`}>
                                    {salaryRatioPercentage.toFixed(1)}%
                                </span>
                            </div>
                            <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-500 ${salaryRatioStatus === "compliant" ? "bg-emerald-500" : "bg-red-500"
                                        }`}
                                    style={{ width: `${Math.min(salaryRatioPercentage, 100)}%` }}
                                />
                            </div>
                            <div className="flex justify-between items-center mt-1 text-xs text-slate-500">
                                <span>0%</span>
                                <span className="font-bold">Max: {maxSalaryRatio * 100}%</span>
                                <span>100%</span>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-800 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-400">Status</span>
                                <span className={salaryRatioStatus === "compliant" ? "text-emerald-400" : "text-red-400"}>
                                    {salaryRatioStatus === "compliant"
                                        ? "Within acceptable limits"
                                        : `${(salaryRatioPercentage - maxSalaryRatio * 100).toFixed(1)}% over limit`
                                    }
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">📊 Annual Loss</h3>
                        <Badge variant={lossStatus === "compliant" ? "success" : "danger"}>
                            {lossStatus === "compliant" ? "✓ Pass" : "✗ Fail"}
                        </Badge>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-slate-400">Current Loss</span>
                                <span className={`font-bold font-mono ${lossStatus === "compliant" ? "text-emerald-400" : "text-red-400"
                                    }`}>
                                    {formatCurrency(data.annualLoss)}
                                </span>
                            </div>
                            <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-500 ${lossStatus === "compliant" ? "bg-emerald-500" : "bg-red-500"
                                        }`}
                                    style={{
                                        width: `${Math.min((data.annualLoss / data.maxAllowedLoss) * 100, 100)}%`
                                    }}
                                />
                            </div>
                            <div className="flex justify-between items-center mt-1 text-xs text-slate-500">
                                <span>€0</span>
                                <span className="font-bold">Max: {formatCurrency(data.maxAllowedLoss)}</span>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-800 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-400">Allowed Loss</span>
                                <span className="text-white font-mono">{formatCurrency(data.maxAllowedLoss)}</span>
                            </div>
                            {lossStatus === "violation" && (
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Excess Loss</span>
                                    <span className="text-red-400 font-mono">
                                        {formatCurrency(data.annualLoss - data.maxAllowedLoss)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">📋 FFP Guidelines</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                        <h4 className="font-bold text-slate-300">Key Rules</h4>
                        <ul className="space-y-1 text-slate-400">
                            <li className="flex items-start gap-2">
                                <span className="text-emerald-500">•</span>
                                <span>Salary costs must not exceed 70% of total revenue</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-emerald-500">•</span>
                                <span>Maximum annual loss of €30,000,000 allowed</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-emerald-500">•</span>
                                <span>Assessment period is 3 years rolling</span>
                            </li>
                        </ul>
                    </div>
                    <div className="space-y-2">
                        <h4 className="font-bold text-slate-300">Potential Penalties</h4>
                        <ul className="space-y-1 text-slate-400">
                            <li className="flex items-start gap-2">
                                <span className="text-red-500">•</span>
                                <span>Transfer ban (cannot register new players)</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-red-500">•</span>
                                <span>Points deduction in league standings</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-red-500">•</span>
                                <span>Monetary fines and sanctions</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {!data.compliant && (
                <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-yellow-400 mb-3">💡 Recommendations</h3>
                    <ul className="space-y-2 text-sm text-yellow-200">
                        {data.salaryToRevenueRatio > maxSalaryRatio && (
                            <li className="flex items-start gap-2">
                                <span>→</span>
                                <span>Reduce salary costs by releasing high-wage players or renegotiating contracts</span>
                            </li>
                        )}
                        {data.annualLoss > data.maxAllowedLoss && (
                            <>
                                <li className="flex items-start gap-2">
                                    <span>→</span>
                                    <span>Increase revenue through commercial deals and matchday income</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span>→</span>
                                    <span>Reduce operational costs and avoid unnecessary expenditures</span>
                                </li>
                            </>
                        )}
                        <li className="flex items-start gap-2">
                            <span>→</span>
                            <span>Sell players to generate transfer income</span>
                        </li>
                    </ul>
                </div>
            )}
        </div>
    );
}