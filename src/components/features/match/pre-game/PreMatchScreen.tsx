import { useState, useEffect, useCallback } from "react";
import type { Player, Team, TacticsConfig, Formation } from "../../../../domain/models";
import { FormationSelector } from "./FormationSelector";
import { TacticsPanel } from "./TacticsPanel";
import { FieldView } from "./FieldView";
import { BenchPanel } from "./BenchPanel";
import { Logger } from "../../../../lib/Logger";

const logger = new Logger("PreMatchScreen");

interface PreMatchScreenProps {
    matchId: number;
    homeTeam: Team;
    awayTeam: Team;
    onConfirm: (lineup: PreMatchLineup) => void;
    onCancel: () => void;
}

export interface PreMatchLineup {
    formation: Formation;
    starters: number[];
    bench: number[];
    tactics: TacticsConfig;
}

interface DraggedPlayer {
    player: Player;
    sourceType: "field" | "bench";
    sourceIndex?: number;
}

export function PreMatchScreen({
    matchId,
    homeTeam,
    awayTeam,
    onConfirm,
    onCancel,
}: PreMatchScreenProps) {
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);

    // Estado do Lineup
    const [formation, setFormation] = useState<Formation>(
        homeTeam.defaultFormation || "4-4-2"
    );
    const [starters, setStarters] = useState<(Player | null)[]>(
        Array(11).fill(null)
    );
    const [bench, setBench] = useState<Player[]>([]);
    const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);

    // Estado Tático
    const [tactics, setTactics] = useState<TacticsConfig>({
        style: homeTeam.defaultGameStyle || "balanced",
        marking: homeTeam.defaultMarking || "man_to_man",
        mentality: homeTeam.defaultMentality || "normal",
        passingDirectness: homeTeam.defaultPassingDirectness || "mixed",
    });

    // Drag & Drop State
    const [draggedPlayer, setDraggedPlayer] = useState<DraggedPlayer | null>(
        null
    );

    // Carregar jogadores
    useEffect(() => {
        const loadPlayers = async () => {
            try {
                const data = await window.electronAPI.player.getPlayers(homeTeam.id);
                const availablePlayers = data.filter(
                    (p: Player) => !p.isInjured && p.suspensionGamesRemaining === 0
                );

                setPlayers(availablePlayers);

                // Auto-selecionar os 11 melhores
                const sorted = [...availablePlayers].sort(
                    (a, b) => b.overall - a.overall
                );
                const top11 = sorted.slice(0, 11);
                const remainingBench = sorted.slice(11, 18);

                setStarters(top11);
                setBench(remainingBench);
                setAvailablePlayers(sorted.slice(18));
            } catch (error) {
                logger.error("Erro ao carregar jogadores:", error);
            } finally {
                setLoading(false);
            }
        };

        loadPlayers();
    }, [homeTeam.id]);

    // Handlers de Drag & Drop
    const handleDragStart = useCallback(
        (player: Player, sourceType: "field" | "bench", sourceIndex?: number) => {
            setDraggedPlayer({ player, sourceType, sourceIndex });
        },
        []
    );

    const handleDrop = useCallback(
        (targetType: "field" | "bench", targetIndex?: number) => {
            if (!draggedPlayer) return;

            const { player, sourceType, sourceIndex } = draggedPlayer;

            // Campo -> Campo (Trocar posições)
            if (sourceType === "field" && targetType === "field" && targetIndex !== undefined && sourceIndex !== undefined) {
                const newStarters = [...starters];
                const temp = newStarters[targetIndex];
                newStarters[targetIndex] = newStarters[sourceIndex];
                newStarters[sourceIndex] = temp;
                setStarters(newStarters);
            }

            // Banco -> Campo
            if (sourceType === "bench" && targetType === "field" && targetIndex !== undefined) {
                const newStarters = [...starters];
                const replacedPlayer = newStarters[targetIndex];
                newStarters[targetIndex] = player;
                setStarters(newStarters);

                const newBench = bench.filter((p) => p.id !== player.id);
                if (replacedPlayer) newBench.push(replacedPlayer);
                setBench(newBench);
            }

            // Campo -> Banco
            if (sourceType === "field" && targetType === "bench" && sourceIndex !== undefined) {
                const newStarters = [...starters];
                newStarters[sourceIndex] = null;
                setStarters(newStarters);

                setBench([...bench, player]);
            }

            // Disponíveis -> Campo
            if (sourceType === "bench" && targetType === "field" && targetIndex !== undefined) {
                const isAvailable = availablePlayers.some((p) => p.id === player.id);
                if (isAvailable) {
                    const newStarters = [...starters];
                    const replacedPlayer = newStarters[targetIndex];
                    newStarters[targetIndex] = player;
                    setStarters(newStarters);

                    setAvailablePlayers(availablePlayers.filter((p) => p.id !== player.id));
                    if (replacedPlayer) {
                        setAvailablePlayers([...availablePlayers, replacedPlayer]);
                    }
                }
            }

            setDraggedPlayer(null);
        },
        [draggedPlayer, starters, bench, availablePlayers]
    );

    const handleConfirm = useCallback(() => {
        const finalStarters = starters.filter((p): p is Player => p !== null);

        if (finalStarters.length < 11) {
            alert("Você precisa selecionar 11 jogadores titulares!");
            return;
        }

        const lineup: PreMatchLineup = {
            formation,
            starters: finalStarters.map((p) => p.id),
            bench: bench.map((p) => p.id),
            tactics,
        };

        onConfirm(lineup);
    }, [formation, starters, bench, tactics, onConfirm]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-950">
                <div className="text-white">Carregando jogadores...</div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-slate-950 text-white flex flex-col overflow-hidden">
            {/* Header */}
            <header className="bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Preparação Pré-Jogo</h1>
                    <p className="text-sm text-slate-400">
                        {homeTeam.name} vs {awayTeam.name}
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 rounded font-bold transition-colors"
                    >
                        Confirmar e Iniciar
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel - Formation & Field */}
                <div className="flex-1 flex flex-col p-6 overflow-y-auto">
                    <FormationSelector
                        formation={formation}
                        onChange={setFormation}
                    />

                    <FieldView
                        formation={formation}
                        starters={starters}
                        onDragStart={handleDragStart}
                        onDrop={handleDrop}
                        draggedPlayer={draggedPlayer}
                    />
                </div>

                {/* Right Panel - Tactics & Bench */}
                <div className="w-96 bg-slate-900 border-l border-slate-800 flex flex-col overflow-hidden">
                    <TacticsPanel tactics={tactics} onChange={setTactics} />

                    <BenchPanel
                        bench={bench}
                        availablePlayers={availablePlayers}
                        onDragStart={handleDragStart}
                    />
                </div>
            </div>
        </div>
    );
}