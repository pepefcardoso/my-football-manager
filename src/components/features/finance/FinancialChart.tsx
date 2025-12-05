import { useMemo } from "react";
import { formatCurrency } from "../../../utils/formatters";
import type { FinancialRecord } from "../../../domain/models";

interface FinancialChartProps {
    records: FinancialRecord[];
}

function FinancialChart({ records }: FinancialChartProps) {
    const monthlyData = useMemo(() => {
        const data: Record<string, { income: number; expense: number; label: string }> = {};

        records.forEach((record) => {
            const date = new Date(record.date);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
            const label = date.toLocaleDateString("pt-PT", { month: "short" });

            if (!data[key]) {
                data[key] = { income: 0, expense: 0, label };
            }

            if (record.type === "income") {
                data[key].income += record.amount;
            } else {
                data[key].expense += record.amount;
            }
        });

        return Object.keys(data)
            .sort()
            .map((key) => data[key]);
    }, [records]);

    if (monthlyData.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center border border-slate-800 rounded-lg bg-slate-900/50 text-slate-500">
                Sem dados financeiros suficientes para gerar gráfico.
            </div>
        );
    }

    const maxValue = Math.max(
        ...monthlyData.map((d) => Math.max(d.income, d.expense))
    );

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <h3 className="text-sm font-medium text-slate-400 mb-6">Balanço Mensal (Receitas vs Despesas)</h3>

            <div className="flex items-end justify-between gap-4 h-48">
                {monthlyData.map((item, index) => {
                    const incomeHeight = Math.max((item.income / maxValue) * 100, 1);
                    const expenseHeight = Math.max((item.expense / maxValue) * 100, 1);

                    return (
                        <div key={index} className="flex-1 flex flex-col items-center gap-2 group relative">
                            <div className="w-full flex justify-center gap-1 h-full items-end">
                                <div
                                    style={{ height: `${incomeHeight}%` }}
                                    className="w-3 md:w-6 bg-emerald-500/80 hover:bg-emerald-400 rounded-t transition-all relative group-hover:opacity-100"
                                >
                                    <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-emerald-400 text-xs px-2 py-1 rounded border border-slate-700 whitespace-nowrap z-10 pointer-events-none">
                                        + {formatCurrency(item.income)}
                                    </div>
                                </div>

                                <div
                                    style={{ height: `${expenseHeight}%` }}
                                    className="w-3 md:w-6 bg-red-500/80 hover:bg-red-400 rounded-t transition-all relative"
                                >
                                    <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-red-400 text-xs px-2 py-1 rounded border border-slate-700 whitespace-nowrap z-10 pointer-events-none">
                                        - {formatCurrency(item.expense)}
                                    </div>
                                </div>
                            </div>
                            <span className="text-xs text-slate-500 font-mono uppercase">{item.label}</span>
                        </div>
                    );
                })}
            </div>

            <div className="mt-4 flex gap-4 justify-center text-xs">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-emerald-500/80 rounded"></div>
                    <span className="text-slate-400">Receitas</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500/80 rounded"></div>
                    <span className="text-slate-400">Despesas</span>
                </div>
            </div>
        </div>
    );
}

export default FinancialChart;