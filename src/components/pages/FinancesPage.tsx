import { useEffect, useState, useCallback } from "react";
import { Logger } from "../../lib/Logger";
import { FinancialDashboard } from "../features/finance/FinancialDashBoard";
import { FinancialTransactions } from "../features/finance/FinancialTransactions";
import { OperationalCostsPanel } from "../features/finance/OperationalCostsPanel";
import { RevenueProjectionPanel } from "../features/finance/RevenueProjectionPanel";
import { LoadingSpinner } from "../common/Loading";

const logger = new Logger("FinancesPage");

type FinanceTab = "dashboard" | "transactions" | "operations" | "revenue";

interface FinancesPageProps {
    teamId: number;
}

function FinancesPage({ teamId }: FinancesPageProps) {
    const [activeTab, setActiveTab] = useState<FinanceTab>("dashboard");
    const [loading, setLoading] = useState(true);
    const [seasonId, setSeasonId] = useState<number | null>(null);

    useEffect(() => {
        const fetchSeasonId = async () => {
            try {
                const gameState = await window.electronAPI.game.getGameState();
                setSeasonId(gameState?.currentSeasonId || 1);
            } catch (error) {
                logger.error("Error fetching season ID:", error);
                setSeasonId(1);
            } finally {
                setLoading(false);
            }
        };

        fetchSeasonId();
    }, []);

    const renderTabContent = useCallback(() => {
        if (loading || !seasonId) {
            return <LoadingSpinner text="A carregar dados financeiros..." />;
        }

        switch (activeTab) {
            case "dashboard":
                return <FinancialDashboard teamId={teamId} seasonId={seasonId} />;
            case "transactions":
                return <FinancialTransactions teamId={teamId} seasonId={seasonId} />;
            case "operations":
                return <OperationalCostsPanel teamId={teamId} />;
            case "revenue":
                return <RevenueProjectionPanel teamId={teamId} />;
            default:
                return null;
        }
    }, [activeTab, loading, seasonId, teamId]);

    return (
        <div className="p-8 pb-20 space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-light text-white mb-1">Financial Management</h2>
                    <p className="text-slate-400 text-sm">Comprehensive financial overview and planning</p>
                </div>
            </header>

            <div className="flex gap-2 border-b border-slate-800 overflow-x-auto">
                <button
                    onClick={() => setActiveTab("dashboard")}
                    className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${activeTab === "dashboard"
                        ? "border-emerald-500 text-emerald-400"
                        : "border-transparent text-slate-400 hover:text-white"
                        }`}
                >
                    📊 Dashboard
                </button>
                <button
                    onClick={() => setActiveTab("transactions")}
                    className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${activeTab === "transactions"
                        ? "border-emerald-500 text-emerald-400"
                        : "border-transparent text-slate-400 hover:text-white"
                        }`}
                >
                    💳 Transactions
                </button>
                <button
                    onClick={() => setActiveTab("operations")}
                    className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${activeTab === "operations"
                        ? "border-emerald-500 text-emerald-400"
                        : "border-transparent text-slate-400 hover:text-white"
                        }`}
                >
                    🏭 Operations
                </button>
                <button
                    onClick={() => setActiveTab("revenue")}
                    className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${activeTab === "revenue"
                        ? "border-emerald-500 text-emerald-400"
                        : "border-transparent text-slate-400 hover:text-white"
                        }`}
                >
                    💰 Revenue
                </button>
            </div>

            <div className="animate-in fade-in duration-300">
                {renderTabContent()}
            </div>
        </div>
    );
}

export default FinancesPage;