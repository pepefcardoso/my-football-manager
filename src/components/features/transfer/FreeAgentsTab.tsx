import { useState } from "react";
import { useFreeAgents } from "../../../hooks/transfer/useFreeAgents";
import { useUserTeam, useCurrentDate, useCurrentSeasonId } from "../../../store/useGameStore";
import { SearchResultsGrid } from "../scouting/SearchResultsGrid";
import { TransferProposalModal } from "../transfer/TransferProposalModal";
import type { Player } from "../../../domain/models";
import { LoadingOverlay } from "../../common/Loading";
import { EmptyState } from "../../common/EmptyState";

export function FreeAgentsTab() {
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
    const { agents, isLoading, fetch: fetchFreeAgents } = useFreeAgents();
    const userTeam = useUserTeam();
    const currentDate = useCurrentDate();
    const currentSeasonId = useCurrentSeasonId();

    const handleProposalSent = () => {
        setSelectedPlayer(null);
        alert("Proposta enviada para o agente livre!");
    };

    if (isLoading) return <LoadingOverlay message="Buscando agentes livres..." />;

    return (
        <div className="h-full overflow-y-auto p-8 relative">
            {agents.length === 0 ? (
                <div className="bg-slate-900/30 rounded-lg border border-slate-800 h-full flex flex-col justify-center">
                    <EmptyState
                        icon={<span className="text-4xl">🆓</span>}
                        title="Agentes Livres"
                        description="Jogadores sem contrato podem ser contratados sem taxa de transferência."
                        action={{
                            label: "🔍 Buscar Todos os Agentes Livres",
                            onClick: () => fetchFreeAgents()
                        }}
                    />
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