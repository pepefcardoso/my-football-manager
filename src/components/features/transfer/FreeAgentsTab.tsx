import { useState } from "react";
import { useFreeAgents } from "../../../hooks/transfer/useFreeAgents";
import { useGameStore } from "../../../store/useGameStore";
import { SearchResultsGrid } from "../scouting/SearchResultsGrid";
import { TransferProposalModal } from "../transfer/TransferProposalModal";
import type { Player } from "../../../domain/models";
import { LoadingOverlay } from "../../common/Loading";

export function FreeAgentsTab() {
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
    const { agents, isLoading, fetch: fetchFreeAgents } = useFreeAgents();
    const { userTeam, currentDate, currentSeasonId } = useGameStore();

    const handleProposalSent = () => {
        setSelectedPlayer(null);
        alert("Proposta enviada para o agente livre!");
    };

    if (isLoading) return <LoadingOverlay message="Buscando agentes livres..." />;

    return (
        <div className="h-full overflow-y-auto p-8 relative">
            {agents.length === 0 ? (
                <div className="text-center text-slate-500 mt-10">
                    <h3 className="text-white text-lg font-bold mb-2">Agentes Livres</h3>
                    <p className="text-sm mb-8">Jogadores sem contrato podem ser contratados sem taxa de transferência.</p>
                    <button
                        className="px-6 py-3 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 text-white transition-all shadow-lg"
                        onClick={() => fetchFreeAgents()}
                    >
                        🔍 Buscar Todos os Agentes Livres
                    </button>
                </div>
            ) : (
                <SearchResultsGrid
                    players={agents}
                    loading={isLoading}
                    onPlayerClick={setSelectedPlayer}
                />
            )}

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