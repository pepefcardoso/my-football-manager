import { useGameStore } from "../../store/useGameStore";
import type { Team } from "../../domain/models";
import { useClubOverviewData } from "../../hooks/useClubOverviewData";
import { useGameSimulation } from "../../hooks/useGameSimulation";
import { ClubHeader } from "../features/club/ClubHeader";
import { NextMatchCard } from "../features/club/NextMatchCard";
import { TrainingPanel } from "../features/club/TrainingPanel";
import StatCard from "../common/StatCard";

function ClubOverviewPage({ team }: { team: Team }) {
    const { currentDate, isProcessing, navigateInGame } = useGameStore();

    const {
        gameState,
        nextMatch,
        formStreak,
        updateTrainingFocus
    } = useClubOverviewData(team.id, currentDate);

    const {
        handleAdvanceOneDay,
        handleSimulateContinue,
        stopSimulation,
        seasonSummary,
        showSeasonModal,
        setShowSeasonModal
    } = useGameSimulation();

    const budgetFormatted = `€${(team.budget / 1_000_000).toFixed(1)}M`;
    const budgetStatus = team.budget < 0 ? "⚠️ Risco" : "Estável";

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
                    onViewDetails={() => navigateInGame("matches")}
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
                    onUpdate={updateTrainingFocus}
                />

            </div>

            {showSeasonModal && seasonSummary && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-lg w-full text-center">
                        <h2 className="text-3xl font-bold text-white mb-4">Temporada Encerrada!</h2>
                        <p className="text-slate-300 mb-6">Campeão: {seasonSummary.championName}</p>
                        <button
                            onClick={() => setShowSeasonModal(false)}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg"
                        >
                            Iniciar Nova Temporada
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ClubOverviewPage;