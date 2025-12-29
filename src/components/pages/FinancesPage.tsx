import { useState } from "react";
import { useGameStore } from "../../store/useGameStore"; // Usando a store existente para pegar seasonId
import { FinancialDashboard } from "../features/finance/FinancialDashBoard";
import { FinancialTransactions } from "../features/finance/FinancialTransactions";
import { OperationalCostsPanel } from "../features/finance/OperationalCostsPanel";
import { RevenueProjectionPanel } from "../features/finance/RevenueProjectionPanel";
import { LoadingSpinner } from "../common/Loading";

type FinanceTab = "dashboard" | "transactions" | "operations" | "revenue";

interface FinancesPageProps {
    teamId: number;
}

function FinancesPage({ teamId }: FinancesPageProps) {
    const [activeTab, setActiveTab] = useState<FinanceTab>("dashboard");
    const seasonId = useGameStore((state) => state.currentSeasonId);

    const renderTabContent = () => {
        if (!seasonId) return <LoadingSpinner text="Carregando contexto da temporada..." />;

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
    };

    return (
        <div className="p-8 pb-20 space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-light text-white mb-1">Gestão Financeira</h2>
                    <p className="text-slate-400 text-sm">Visão geral e planeamento financeiro</p>
                </div>
            </header>

            <nav className="flex gap-2 border-b border-slate-800 overflow-x-auto">
                <TabButton
                    label="📊 Dashboard"
                    isActive={activeTab === "dashboard"}
                    onClick={() => setActiveTab("dashboard")}
                />
                <TabButton
                    label="💳 Transações"
                    isActive={activeTab === "transactions"}
                    onClick={() => setActiveTab("transactions")}
                />
                <TabButton
                    label="🏭 Operações"
                    isActive={activeTab === "operations"}
                    onClick={() => setActiveTab("operations")}
                />
                <TabButton
                    label="💰 Receitas"
                    isActive={activeTab === "revenue"}
                    onClick={() => setActiveTab("revenue")}
                />
            </nav>

            <div className="animate-in fade-in duration-300 min-h-[400px]">
                {renderTabContent()}
            </div>
        </div>
    );
}

function TabButton({ label, isActive, onClick }: { label: string; isActive: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${isActive
                    ? "border-emerald-500 text-emerald-400"
                    : "border-transparent text-slate-400 hover:text-white"
                }`}
        >
            {label}
        </button>
    );
}

export default FinancesPage;