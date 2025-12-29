import { useCallback } from "react";
import { useGameStore, useCurrentDate, useIsProcessing } from "../../store/useGameStore";
import type { Team } from "../../domain/models";
import { useClubOverview } from "../../hooks/useClubOverview";
import { useGameSimulation } from "../../hooks/useGameSimulation";
import { useTrainingManagement } from "../../hooks/useTrainingManagement";
import { ClubHeader } from "../features/club/ClubHeader";
import { NextMatchCard } from "../features/club/NextMatchCard";
import { TrainingPanel } from "../features/club/TrainingPanel";
import StatCard from "../common/StatCard";
import { SeasonEndModal } from "../features/season/SeasonEndModal";
import { LoadingSpinner } from "../common/Loading";

function ClubOverviewPage({ team }: { team: Team }) {
    const currentDate = useCurrentDate();
    const isProcessing = useIsProcessing();
    const navigateInGame = useGameStore((state) => state.navigateInGame);
    const { data: overviewData, isLoading, refetch } = useClubOverview(team.id);

    const {
        handleAdvanceOneDay,
        handleSimulateContinue,
        stopSimulation,
        seasonSummary,
        showSeasonModal,
        setShowSeasonModal
    } = useGameSimulation();

    const { updateTraining, isUpdating: isTrainingUpdating } = useTrainingManagement({
        onSuccess: () => refetch()
    });

    const handleNavigateToMatches = useCallback(() => {
        navigateInGame("matches");
    }, [navigateInGame]);

    const budgetFormatted = `€${(team.budget / 1_000_000).toFixed(1)}M`;
    const budgetStatus = team.budget < 0 ? "⚠️ Risco" : "Estável";

    if (isLoading || !overviewData) {
        return <LoadingSpinner size="lg" centered={true} text="Analisando dados do clube..." />;
    }

    const { gameState, nextMatch, formStreak } = overviewData;

    return (
        <div className="min-h-screen bg-slate-950 p-8 animate-in fade-in duration-500">
            <ClubHeader
                team={team}
                currentDate={currentDate}
                isProcessing={isProcessing}
                onAdvanceOne={handleAdvanceOneDay}
                onSimulate={handleSimulateContinue}
                onStop={stopSimulation}
            />

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[minmax(120px,auto)]">

                <NextMatchCard
                    match={nextMatch}
                    team={team}
                    formStreak={formStreak}
                    onViewDetails={handleNavigateToMatches}
                />

                <div className="col-span-1 md:col-span-6 lg:col-span-4">
                    <StatCard
                        title="Orçamento Disponível"
                        value={budgetFormatted}
                        subtitle={budgetStatus}
                    />
                </div>

                <div className="col-span-1 md:col-span-6 lg:col-span-4">
                    <StatCard
                        title="Reputação do Clube"
                        value={team.reputation}
                        subtitle="Ranking Nacional"
                    />
                </div>

                <TrainingPanel
                    currentFocus={gameState?.trainingFocus}
                    onUpdate={updateTraining}
                    isLoading={isTrainingUpdating}
                />
            </div>

            {showSeasonModal && seasonSummary && (
                <SeasonEndModal
                    summary={seasonSummary}
                    onClose={() => setShowSeasonModal(false)}
                />
            )}
        </div>
    );
}

export default ClubOverviewPage;