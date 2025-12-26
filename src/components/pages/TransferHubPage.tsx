import { useState } from "react";
import { useGameStore } from "../../store/useGameStore";
import { formatCurrency } from "../../utils/formatters";
import { useTransferNegotiations } from "../../hooks/transfer/useTransferNegotiations";
import { useScoutingNetwork } from "../../hooks/transfer/useScoutingNetwork";
import { useTransferActions } from "../../hooks/transfer/useTransferActions";
import { useFreeAgents } from "../../hooks/transfer/useFreeAgents";
import { ScoutingSlotCard } from "../features/scouting/ScoutingSlotCard";
import { SearchResultsGrid } from "../features/scouting/SearchResultsGrid";
import { TransferProposalModal } from "../features/transfer/TransferProposalModal";
import { ScoutingConfigModal } from "../features/scouting/ScoutingConfigModal";
import { NegotiationList } from "../features/transfer/NegotiationList";
import type { Player } from "../../domain/models";
import { TransferStatus } from "../../domain/enums";
import { LoadingOverlay } from "../common/Loading";

interface TransferHubPageProps {
    teamId: number;
}

type TabType = "results" | "market" | "negotiations";

function TransferHubPage({ teamId }: TransferHubPageProps) {
    const [activeTab, setActiveTab] = useState<TabType>("results");
    const [configuringSlot, setConfiguringSlot] = useState<number | null>(null);
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

    const { userTeam, currentDate } = useGameStore();
    const currentSeasonId = 1;

    const { bids, offers, isLoading: loadingNegs, refresh: refreshNegs } = useTransferNegotiations(teamId);
    const { slots, results: scoutedPlayers, isLoading: loadingScout, saveSlotConfig, stopSlot } = useScoutingNetwork(teamId);
    const { finalizeTransfer, respondToCounter, respondToOffer, isProcessing } = useTransferActions(teamId);
    const { agents, isLoading: loadingAgents, fetch: fetchFreeAgents } = useFreeAgents();

    const handleFetchFreeAgents = () => {
        fetchFreeAgents().then(() => setActiveTab("market"));
    };

    const handleProposalSent = () => {
        setSelectedPlayer(null);
        setActiveTab("negotiations");
        refreshNegs();
        alert("Proposta enviada!");
    };

    const isLoading = loadingNegs || loadingScout || loadingAgents || isProcessing;
    const displayPlayers = activeTab === "market" ? agents : scoutedPlayers;
    const hasActiveNegotiations = offers.length > 0 || bids.some(b => b.status === TransferStatus.ACCEPTED);

    return (
        <div className="flex h-full bg-slate-950 text-white overflow-hidden">
            {configuringSlot !== null && (
                <ScoutingConfigModal
                    slotNumber={configuringSlot}
                    onSave={(filters) => {
                        saveSlotConfig(configuringSlot, filters, slots);
                        setConfiguringSlot(null);
                    }}
                    onClose={() => setConfiguringSlot(null)}
                />
            )}

            <aside className="w-1/4 min-w-[300px] border-r border-slate-800 p-6 overflow-y-auto bg-slate-950/50">
                <h2 className="text-xl font-light mb-6 flex items-center gap-2">
                    <span className="text-2xl">📡</span> Rede de Olheiros
                </h2>

                <div className="space-y-4">
                    {slots.length > 0 ? slots.map((slot) => (
                        <ScoutingSlotCard
                            key={slot.slotNumber}
                            slot={slot}
                            onConfigure={setConfiguringSlot}
                            onStop={(slotNum) => stopSlot(slotNum, slots)}
                        />
                    )) : (
                        <div className="text-slate-500 text-sm text-center">A carregar slots...</div>
                    )}
                </div>

                <div className="mt-8 p-4 bg-blue-900/10 border border-blue-900/30 rounded text-xs text-blue-200">
                    <p className="font-bold mb-1">ℹ️ Dica de Scouting</p>
                    <p>Olheiros com melhores atributos encontram jogadores mais rápido e com mais precisão.</p>
                </div>
            </aside>

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
                            label={`Relatórios (${scoutedPlayers.length})`}
                        />
                        <TabButton
                            isActive={activeTab === "negotiations"}
                            onClick={() => setActiveTab("negotiations")}
                            label="Negociações"
                            notification={hasActiveNegotiations}
                        />
                        <TabButton
                            isActive={activeTab === "market"}
                            onClick={() => setActiveTab("market")}
                            label="Mercado Livre"
                        />
                    </nav>
                </header>

                <div className="flex-1 overflow-y-auto p-8 relative">
                    {isLoading && <LoadingOverlay message="" />}

                    {(activeTab === "results" || activeTab === "market") && (
                        <>
                            {activeTab === "market" && agents.length === 0 && !isLoading && (
                                <div className="text-center text-slate-500 mt-10">
                                    <h3 className="text-white text-lg font-bold mb-2">Agentes Livres</h3>
                                    <p className="text-sm mb-8">Jogadores sem contrato podem ser contratados sem taxa de transferência.</p>
                                    <button
                                        className="px-6 py-3 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 text-white transition-all shadow-lg"
                                        onClick={handleFetchFreeAgents}
                                    >
                                        🔍 Buscar Todos os Agentes Livres
                                    </button>
                                </div>
                            )}

                            {(activeTab !== "market" || agents.length > 0) && (
                                <SearchResultsGrid
                                    players={displayPlayers}
                                    loading={isLoading}
                                    onPlayerClick={setSelectedPlayer}
                                />
                            )}
                        </>
                    )}

                    {activeTab === "negotiations" && (
                        <NegotiationList
                            bids={bids}
                            offers={offers}
                            loading={isProcessing}
                            onFinalize={(id) => {
                                if (confirm("Confirmar transferência e pagamento?")) {
                                    finalizeTransfer(id);
                                }
                            }}
                            onRespondCounter={(id, accept) => respondToCounter({ proposalId: id, accept })}
                            onRespondOffer={(id, response) => respondToOffer({ proposalId: id, response, currentDate })}
                        />
                    )}
                </div>
            </main>

            {selectedPlayer && userTeam && (
                <TransferProposalModal
                    player={selectedPlayer}
                    proposingTeamId={userTeam.id}
                    currentDate={currentDate}
                    seasonId={currentSeasonId}
                    onClose={() => setSelectedPlayer(null)}
                    onProposalSent={handleProposalSent}
                />
            )}
        </div>
    );
}

function TabButton({ isActive, onClick, label, notification = false }: any) {
    return (
        <button
            onClick={onClick}
            className={`pb-4 text-sm font-medium border-b-2 transition-colors ${isActive ? "border-emerald-500 text-white" : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
        >
            {label}
            {notification && (
                <span className="ml-2 inline-flex items-center justify-center w-2 h-2 p-2 bg-emerald-500 rounded-full text-[10px] text-white font-bold">!</span>
            )}
        </button>
    );
}

export default TransferHubPage;