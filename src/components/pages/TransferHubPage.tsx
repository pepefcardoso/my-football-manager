import { ScoutingSlotCard } from "../features/scouting/ScoutingSlotCard";
import { SearchResultsGrid } from "../features/scouting/SearchResultsGrid";
import { TransferProposalModal } from "../features/transfer/TransferProposalModal";
import { ScoutingConfigModal } from "../features/scouting/ScoutingConfigModal";
import { NegotiationList } from "../features/transfer/NegotiationList";
import { useTransferHubController } from "../../hooks/useTransferHubController";
import { formatCurrency } from "../../utils/formatters";

interface TransferHubPageProps {
    teamId: number;
}

function TransferHubPage({ teamId }: TransferHubPageProps) {
    const ctrl = useTransferHubController(teamId);

    return (
        <div className="flex h-full bg-slate-950 text-white overflow-hidden">
            {ctrl.configuringSlot !== null && (
                <ScoutingConfigModal
                    slotNumber={ctrl.configuringSlot}
                    onSave={ctrl.saveSlotConfig}
                    onClose={() => ctrl.setConfiguringSlot(null)}
                />
            )}

            <aside className="w-1/4 min-w-[300px] border-r border-slate-800 p-6 overflow-y-auto bg-slate-950/50">
                <h2 className="text-xl font-light mb-6 flex items-center gap-2">
                    <span className="text-2xl">📡</span> Rede de Olheiros
                </h2>

                <div className="space-y-4">
                    {ctrl.team?.scoutingSlots?.map((slot) => (
                        <ScoutingSlotCard
                            key={slot.slotNumber}
                            slot={slot}
                            onConfigure={ctrl.setConfiguringSlot}
                            onStop={ctrl.stopSlot}
                        />
                    ))}
                    {(!ctrl.team?.scoutingSlots) && <div className="text-slate-500 text-sm text-center">A carregar slots...</div>}
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
                            <p className={`text-xl font-mono ${ctrl.userTeam && ctrl.userTeam.budget < 0 ? 'text-red-500' : 'text-emerald-400'}`}>
                                {formatCurrency(ctrl.userTeam?.budget || 0)}
                            </p>
                        </div>
                    </div>

                    <nav className="flex gap-6">
                        <TabButton
                            isActive={ctrl.activeTab === "results"}
                            onClick={() => ctrl.setActiveTab("results")}
                            label={`Relatórios (${ctrl.searchResults.length})`}
                        />
                        <TabButton
                            isActive={ctrl.activeTab === "negotiations"}
                            onClick={() => ctrl.setActiveTab("negotiations")}
                            label="Negociações"
                            notification={ctrl.incomingOffers.length > 0 || ctrl.myBids.some(b => b.status === 'accepted')}
                        />
                        <TabButton
                            isActive={ctrl.activeTab === "market"}
                            onClick={() => ctrl.setActiveTab("market")}
                            label="Mercado Livre"
                        />
                    </nav>
                </header>

                <div className="flex-1 overflow-y-auto p-8 relative">
                    {ctrl.loading && (
                        <div className="absolute inset-0 bg-slate-950/80 z-10 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                        </div>
                    )}

                    {ctrl.activeTab === "results" && (
                        <SearchResultsGrid
                            players={ctrl.searchResults}
                            loading={ctrl.loading}
                            onPlayerClick={ctrl.setSelectedPlayer}
                        />
                    )}

                    {ctrl.activeTab === "negotiations" && (
                        <NegotiationList
                            bids={ctrl.myBids}
                            offers={ctrl.incomingOffers}
                            loading={ctrl.loading}
                            onFinalize={ctrl.finalizeTransfer}
                            onRespondCounter={ctrl.respondToCounter}
                            onRespondOffer={ctrl.respondToOffer}
                        />
                    )}

                    {ctrl.activeTab === "market" && (
                        <div className="text-center text-slate-500 mt-10">
                            <h3 className="text-white text-lg font-bold mb-2">Agentes Livres</h3>
                            <p className="text-sm mb-8">Jogadores sem contrato podem ser contratados sem taxa de transferência.</p>
                            <button
                                className="px-6 py-3 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 text-white transition-all shadow-lg"
                                onClick={ctrl.fetchFreeAgents}
                            >
                                🔍 Buscar Todos os Agentes Livres
                            </button>
                        </div>
                    )}
                </div>
            </main>

            {ctrl.selectedPlayer && ctrl.userTeam && (
                <TransferProposalModal
                    player={ctrl.selectedPlayer}
                    proposingTeamId={ctrl.userTeam.id}
                    currentDate={ctrl.currentDate}
                    seasonId={ctrl.currentSeasonId}
                    onClose={() => ctrl.setSelectedPlayer(null)}
                    onProposalSent={() => {
                        ctrl.setSelectedPlayer(null);
                        ctrl.setActiveTab("negotiations");
                        ctrl.refresh();
                        alert("Proposta enviada!");
                    }}
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