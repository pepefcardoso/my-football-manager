import { useState, useMemo } from "react";
import { useGameStore } from "../../store/useGameStore";
import { formatCurrency } from "../../utils/formatters";
import { TransferHubSidebar } from "../features/transfer/TransferHubSidebar";
import { ScoutingResultsTab } from "../features/transfer/ScoutingResultsTab";
import { FreeAgentsTab } from "../features/transfer/FreeAgentsTab";
import { NegotiationsTab } from "../features/transfer/NegotiationsTab";
import { cn } from "../../utils/cn";

type TabKey = "results" | "market" | "negotiations";

interface TabConfig {
    key: TabKey;
    label: string;
    component: React.ComponentType<{ teamId: number }>;
    requiresTeamId?: boolean;
}

const TABS_CONFIG: TabConfig[] = [
    {
        key: "results",
        label: "Relatórios de Olheiros",
        component: ScoutingResultsTab,
        requiresTeamId: true
    },
    {
        key: "negotiations",
        label: "Negociações Ativas",
        component: NegotiationsTab,
        requiresTeamId: true
    },
    {
        key: "market",
        label: "Mercado Livre",
        component: FreeAgentsTab,
        requiresTeamId: false
    }
];

interface TransferHubPageProps {
    teamId: number;
}

function TransferHubPage({ teamId }: TransferHubPageProps) {
    const [activeTabKey, setActiveTabKey] = useState<TabKey>("results");
    const userTeam = useGameStore((state) => state.userTeam);
    const activeTab = useMemo(() =>
        TABS_CONFIG.find(tab => tab.key === activeTabKey) || TABS_CONFIG[0],
        [activeTabKey]);
    const renderActiveContent = () => {
        const Component = activeTab.component;
        return <Component teamId={teamId} />;
    };

    return (
        <div className="flex h-full bg-slate-950 text-white overflow-hidden">
            <TransferHubSidebar teamId={teamId} />

            <main className="flex-1 flex flex-col min-w-0 bg-slate-950">
                <header className="border-b border-slate-800 px-8 pt-8 pb-0 bg-slate-950 z-10">
                    <div className="flex justify-between items-end mb-6">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-white">
                                Central de Transferências
                            </h1>
                            <p className="text-slate-400 text-sm mt-1">
                                Gestão de mercado, prospecção e contratações.
                            </p>
                        </div>

                        <div className="text-right bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">
                                Orçamento Disponível
                            </p>
                            <p className={cn(
                                "text-xl font-mono font-bold",
                                userTeam && userTeam.budget < 0 ? "text-red-400" : "text-emerald-400"
                            )}>
                                {formatCurrency(userTeam?.budget || 0)}
                            </p>
                        </div>
                    </div>

                    <nav className="flex gap-8">
                        {TABS_CONFIG.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTabKey(tab.key)}
                                className={cn(
                                    "pb-4 text-sm font-medium border-b-2 transition-all duration-200",
                                    activeTabKey === tab.key
                                        ? "border-emerald-500 text-white"
                                        : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-800"
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </header>

                <div className="flex-1 overflow-hidden relative bg-slate-950">
                    {renderActiveContent()}
                </div>
            </main>
        </div>
    );
}

export default TransferHubPage;