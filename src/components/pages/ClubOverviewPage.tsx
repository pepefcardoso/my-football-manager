import { useEffect, useState } from "react";
import TrainingControl from "../features/squad/TrainingControl";
import type { GameState, Team } from "../../domain/models";
import StatCard from "../common/StatCard";

function ClubOverviewPage({ team }: { team: Team }) {
    const [gameState, setGameState] = useState<GameState | null>(null);

    const fetchGameState = async () => {
        try {
            const state = await window.electronAPI.getGameState();
            setGameState(state);
        } catch (error) {
            console.error("Erro ao carregar estado do jogo:", error);
        }
    };

    useEffect(() => {
        const fetchGameState = async () => {
            try {
                const state = await window.electronAPI.getGameState();
                setGameState(state);
            } catch (error) {
                console.error("Erro ao carregar estado do jogo:", error);
            }
        };

        fetchGameState();
    }, []);

    return (
        <div className="p-8">
            <header className="mb-8">
                <div className="flex items-center gap-4 mb-4">
                    <div
                        className="w-20 h-20 rounded-full flex items-center justify-center font-bold text-2xl shadow-lg"
                        style={{ backgroundColor: team.primaryColor || "#333" }}
                    >
                        {team.shortName}
                    </div>
                    <div>
                        <h2 className="text-4xl font-light">{team.name}</h2>
                        <p className="text-slate-400">Visão Geral do Clube</p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Reputação" value={team.reputation || 0} suffix="/10000" />
                <StatCard
                    title="Orçamento"
                    value={`€${((team.budget || 0) / 1000000).toFixed(1)}M`}
                />
                <StatCard title="Próxima Partida" value="15 Jan 2025" subtitle="vs Blue Dragons" />
            </div>

            {gameState && (
                <TrainingControl
                    currentFocus={gameState.trainingFocus || "technical"}
                    onUpdate={fetchGameState}
                />
            )}
        </div>
    );
}

export default ClubOverviewPage;