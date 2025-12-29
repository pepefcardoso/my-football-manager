import { useState } from "react";
import { useScoutingNetwork } from "../../../hooks/transfer/useScoutingNetwork";
import { useUserTeam, useCurrentDate, useCurrentSeasonId } from "../../../store/useGameStore";
import { SearchResultsGrid } from "../scouting/SearchResultsGrid";
import { TransferProposalModal } from "../transfer/TransferProposalModal";
import type { Player } from "../../../domain/models";
import { LoadingOverlay } from "../../common/Loading";

interface ScoutingResultsTabProps {
    teamId: number;
}

export function ScoutingResultsTab({ teamId }: ScoutingResultsTabProps) {
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
    const { results: scoutedPlayers, isLoading } = useScoutingNetwork(teamId);
    const userTeam = useUserTeam();
    const currentDate = useCurrentDate();
    const currentSeasonId = useCurrentSeasonId();

    const handleProposalSent = () => {
        setSelectedPlayer(null);
        alert("Proposta enviada! Acompanhe na aba de Negociações.");
    };

    if (isLoading) return <LoadingOverlay message="Atualizando relatórios..." />;

    return (
        <>
            <div className="h-full overflow-y-auto p-8">
                <SearchResultsGrid
                    players={scoutedPlayers}
                    loading={isLoading}
                    onPlayerClick={setSelectedPlayer}
                />
            </div>

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
        </>
    );
}