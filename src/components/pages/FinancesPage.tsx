import { useEffect, useState } from "react";
import { formatCurrency } from "../../utils/formatters";
import type { FinancialRecord } from "../../domain/models";
import FinancialChart from "../features/finance/FinancialChart";
import { Logger } from "../../lib/Logger";

const logger = new Logger("FinancesPage");

function FinancesPage({ teamId }: { teamId: number }) {
    const [records, setRecords] = useState<FinancialRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [health, setHealth] = useState<any>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const gameState = await window.electronAPI.game.getGameState();

                if (gameState?.currentSeasonId) {
                    const data = await window.electronAPI.finance.getFinancialRecords(teamId, gameState.currentSeasonId);
                    setRecords(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                }

                const healthData = await window.electronAPI.finance.getFinancialHealth(teamId);
                setHealth(healthData);

            } catch (error) {
                logger.error("Erro ao carregar finanças:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [teamId]);

    if (loading) {
        return (
            <div className="flex justify-center p-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    const totalIncome = records
        .filter((r) => r.type === "income")
        .reduce((acc, curr) => acc + curr.amount, 0);

    const totalExpense = records
        .filter((r) => r.type === "expense")
        .reduce((acc, curr) => acc + curr.amount, 0);

    const profitLoss = totalIncome - totalExpense;

    return (
        <div className="p-8 pb-20">
            <header className="mb-6 flex justify-between items-start">
                <div>
                    <h2 className="text-3xl font-light text-white mb-1">Departamento Financeiro</h2>
                    <p className="text-slate-400 text-sm">Controle de Fluxo de Caixa e Orçamento</p>
                </div>

                <div className="text-right">
                    <div className="text-sm text-slate-400 mb-1">Orçamento Atual</div>
                    <div className={`text-3xl font-bold ${health?.currentBudget < 0 ? 'text-red-500' : 'text-emerald-400'}`}>
                        {formatCurrency(health?.currentBudget || 0)}
                    </div>
                </div>
            </header>

            {health && !health.isHealthy && (
                <div className={`mb-8 p-4 rounded-lg border flex items-start gap-4 ${health.severity === 'critical'
                        ? 'bg-red-500/10 border-red-500/50 text-red-200'
                        : 'bg-yellow-500/10 border-yellow-500/50 text-yellow-200'
                    }`}>
                    <span className="text-2xl">⚠️</span>
                    <div>
                        <h4 className="font-bold mb-1">Atenção à Saúde Financeira</h4>
                        <p className="text-sm opacity-90 mb-2">
                            O clube está operando no vermelho. Se a situação persistir, sofreremos sanções.
                        </p>
                        {health.penaltiesApplied.length > 0 && (
                            <ul className="list-disc list-inside text-xs space-y-1 bg-black/20 p-2 rounded">
                                {health.penaltiesApplied.map((penalty: string, idx: number) => (
                                    <li key={idx}>{penalty}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg">
                    <div className="text-slate-400 text-xs uppercase font-bold mb-2">Receitas da Temporada</div>
                    <div className="text-2xl text-emerald-400 font-mono">{formatCurrency(totalIncome)}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg">
                    <div className="text-slate-400 text-xs uppercase font-bold mb-2">Despesas da Temporada</div>
                    <div className="text-2xl text-red-400 font-mono">{formatCurrency(totalExpense)}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg">
                    <div className="text-slate-400 text-xs uppercase font-bold mb-2">Balanço Líquido</div>
                    <div className={`text-2xl font-mono ${profitLoss >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
                        {profitLoss > 0 ? '+' : ''}{formatCurrency(profitLoss)}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <FinancialChart records={records} />
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-lg flex flex-col h-[500px]">
                    <div className="p-4 border-b border-slate-800 bg-slate-950/30">
                        <h3 className="font-semibold text-slate-300">Últimas Transações</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {records.length === 0 ? (
                            <p className="text-slate-500 text-center p-4">Nenhuma transação registrada.</p>
                        ) : (
                            records.map((record) => (
                                <div key={record.id} className="p-3 hover:bg-slate-800 rounded transition-colors flex justify-between items-center text-sm border border-transparent hover:border-slate-700">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-slate-200 font-medium">{record.description || "Transação"}</span>
                                        <div className="flex gap-2 text-xs text-slate-500">
                                            <span>{new Date(record.date).toLocaleDateString()}</span>
                                            <span>•</span>
                                            <span className="capitalize">{record.category.replace('_', ' ')}</span>
                                        </div>
                                    </div>
                                    <div className={`font-mono font-bold ${record.type === 'income' ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {record.type === 'income' ? '+' : '-'}{formatCurrency(record.amount)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default FinancesPage;