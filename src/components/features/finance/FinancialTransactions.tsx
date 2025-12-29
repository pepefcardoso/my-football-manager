import { useEffect, useState, useMemo } from "react";
import { formatCurrency } from "../../../utils/formatters";
import type { FinancialRecord } from "../../../domain/models";
import { Logger } from "../../../lib/Logger";
import FinancialChart from "./FinancialChart";
import { LoadingSpinner } from "../../common/Loading";
import { EmptyState } from "../../common/EmptyState";

const logger = new Logger("FinancialTransactions");

interface FinancialTransactionsProps {
    teamId: number;
    seasonId: number;
}

type FilterType = "all" | "income" | "expense";
type FilterCategory = "all" | string;

export function FinancialTransactions({ teamId, seasonId }: FinancialTransactionsProps) {
    const [records, setRecords] = useState<FinancialRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState<FilterType>("all");
    const [filterCategory, setFilterCategory] = useState<FilterCategory>("all");

    useEffect(() => {
        const fetchRecords = async () => {
            setLoading(true);
            try {
                const data = await window.electronAPI.finance.getFinancialRecords(teamId, seasonId);
                setRecords(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            } catch (error) {
                logger.error("Error fetching financial records:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchRecords();
    }, [teamId, seasonId]);

    const filteredRecords = useMemo(() => {
        return records.filter((record) => {
            if (filterType !== "all" && record.type !== filterType) return false;
            if (filterCategory !== "all" && record.category !== filterCategory) return false;
            return true;
        });
    }, [records, filterType, filterCategory]);

    const categories = useMemo(() => {
        const cats = new Set(records.map((r) => r.category));
        return Array.from(cats).sort();
    }, [records]);

    const summary = useMemo(() => {
        const income = records.filter((r) => r.type === "income").reduce((sum, r) => sum + r.amount, 0);
        const expense = records.filter((r) => r.type === "expense").reduce((sum, r) => sum + r.amount, 0);
        return { income, expense, balance: income - expense };
    }, [records]);

    if (loading) {
        return (
            <LoadingSpinner
                size="md"
                centered={true}
                text="A carregar dados..."
            />
        );
    }

    const getCategoryIcon = (category: string) => {
        const icons: Record<string, string> = {
            ticket_sales: "🎟️",
            tv_rights: "📺",
            sponsors: "🤝",
            transfer_in: "💸",
            transfer_out: "💰",
            prize: "🏆",
            salary: "💼",
            staff_salary: "👔",
            stadium_maintenance: "🏟️",
            infrastructure: "🏗️",
        };
        return icons[category] || "💵";
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                    <div className="text-sm text-slate-400 mb-2">Total Income</div>
                    <div className="text-2xl font-bold text-emerald-400">{formatCurrency(summary.income)}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                    <div className="text-sm text-slate-400 mb-2">Total Expenses</div>
                    <div className="text-2xl font-bold text-red-400">{formatCurrency(summary.expense)}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                    <div className="text-sm text-slate-400 mb-2">Net Balance</div>
                    <div className={`text-2xl font-bold ${summary.balance >= 0 ? "text-blue-400" : "text-orange-400"}`}>
                        {summary.balance >= 0 ? "+" : ""}{formatCurrency(summary.balance)}
                    </div>
                </div>
            </div>

            <FinancialChart records={records} />

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                <div className="flex flex-wrap gap-3">
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">Type</label>
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value as FilterType)}
                            className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-white"
                        >
                            <option value="all">All Types</option>
                            <option value="income">Income Only</option>
                            <option value="expense">Expenses Only</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">Category</label>
                        <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-white"
                        >
                            <option value="all">All Categories</option>
                            {categories.map((cat) => (
                                <option key={cat} value={cat}>
                                    {cat.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={() => {
                                setFilterType("all");
                                setFilterCategory("all");
                            }}
                            className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
                        >
                            Reset Filters
                        </button>
                    </div>
                    <div className="flex items-end ml-auto">
                        <span className="text-sm text-slate-400">
                            Showing {filteredRecords.length} of {records.length} transactions
                        </span>
                    </div>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-950 border-b border-slate-800">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Date</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Category</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Description</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {filteredRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={4}>
                                        <EmptyState
                                            icon={<span className="text-4xl">🧾</span>}
                                            title="Nenhuma transação encontrada"
                                            description="Não existem registos financeiros que correspondam aos filtros selecionados."
                                            className="py-12"
                                        />
                                    </td>
                                </tr>
                            ) : (
                                filteredRecords.map((record) => (
                                    <tr key={record.id} className="hover:bg-slate-800/50 transition-colors">
                                        <td className="px-4 py-3 text-sm text-slate-400 font-mono">
                                            {new Date(record.date).toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "2-digit",
                                                year: "numeric",
                                            })}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">{getCategoryIcon(record.category)}</span>
                                                <span className="text-slate-300 capitalize">
                                                    {record.category.replace(/_/g, " ")}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-300">
                                            {record.description || "—"}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span
                                                className={`font-mono font-bold ${record.type === "income" ? "text-emerald-400" : "text-red-400"
                                                    }`}
                                            >
                                                {record.type === "income" ? "+" : "−"}
                                                {formatCurrency(record.amount)}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}