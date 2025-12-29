import { useState } from "react";
import { useGameStore } from "../../store/useGameStore";
import { formatCurrency } from "../../utils/formatters";
import { TransferHubSidebar } from "../features/transfer/TransferHubSidebar";
import { ScoutingResultsTab } from "../features/transfer/ScoutingResultsTab";
import { FreeAgentsTab } from "../features/transfer/FreeAgentsTab";
import { NegotiationsTab } from "../features/transfer/NegotiationsTab";

interface TransferHubPageProps {
    teamId: number;
}

type TabType = "results" | "market" | "negotiations";

function TransferHubPage({ teamId }: TransferHubPageProps) {
    const [activeTab, setActiveTab] = useState<TabType>("results");
    const userTeam = useGameStore((state) => state.userTeam);

    return (
        <div className="flex h-full bg-slate-950 text-white overflow-hidden">
            {/* Sidebar Isolada */}
            <TransferHubSidebar teamId={teamId} />

            <main className="flex-1 flex flex-col min-w-0 bg-slate-950">
                <header className="border-b border-slate-800 px-8 pt-8 pb-0">
                    <div className="flex justify-between items-end mb-6">
                        <h1 className="text-3xl font-bold tracking-tight">Transfer Hub</h1>
                        <div className="text-right">
                            <p className="text-xs text-slate-500">Orçamento Disponível</p>
                            <p className={`text-xl font-mono ${userTeam && userTeam.budget < 0 ? 'text-red-500' : 'text-emerald-400'}`}>
                                {formatCurrency(userTeam?.budget || 0)}
                            </p>
                        </div>
                    </div>

                    <nav className="flex gap-6">
                        <TabButton
                            isActive={activeTab === "results"}
                            onClick={() => setActiveTab("results")}
                            label="Relatórios"
                        />
                        <TabButton
                            isActive={activeTab === "negotiations"}
                            onClick={() => setActiveTab("negotiations")}
                            label="Negociações"
                        />
                        <TabButton
                            isActive={activeTab === "market"}
                            onClick={() => setActiveTab("market")}
                            label="Mercado Livre"
                        />
                    </nav>
                </header>

                <div className="flex-1 overflow-hidden relative">
                    {activeTab === "results" && <ScoutingResultsTab teamId={teamId} />}
                    {activeTab === "market" && <FreeAgentsTab />}
                    {activeTab === "negotiations" && <NegotiationsTab teamId={teamId} />}
                </div>
            </main>
        </div>
    );
}

function TabButton({ isActive, onClick, label }: { isActive: boolean; onClick: () => void; label: string }) {
    return (
        <button
            onClick={onClick}
            className={`pb-4 text-sm font-medium border-b-2 transition-colors ${isActive ? "border-emerald-500 text-white" : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
        >
            {label}
        </button>
    );
}

export default TransferHubPage;