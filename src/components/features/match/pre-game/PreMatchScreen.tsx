import { useState, useEffect, useCallback } from "react";
import type { Player, Team, TacticsConfig, Formation } from "../../../../domain/models";
import { FormationSelector } from "./FormationSelector";
import { TacticsPanel } from "./TacticsPanel";
import { FieldView } from "./FieldView";
import { BenchPanel } from "./BenchPanel";
import { Logger } from "../../../../lib/Logger";
import { LoadingSpinner } from "../../../common/Loading";

const logger = new Logger("PreMatchScreen");

interface PreMatchScreenProps {
    matchId: number;
    homeTeam: Team;
    awayTeam: Team;
    userTeamId: number;
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
    userTeamId,
    onConfirm,
    onCancel,
}: PreMatchScreenProps) {
    const isUserHome = homeTeam.id === userTeamId;
    const myTeam = isUserHome ? homeTeam : awayTeam;
    const opponentTeam = isUserHome ? awayTeam : homeTeam;

    const [loading, setLoading] = useState(true);

    const [formation, setFormation] = useState<Formation>(
        myTeam.defaultFormation || "4-4-2"
    );
    const [starters, setStarters] = useState<(Player | null)[]>(
        Array(11).fill(null)
    );
    const [bench, setBench] = useState<Player[]>([]);
    const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);

    const [tactics, setTactics] = useState<TacticsConfig>({
        style: myTeam.defaultGameStyle || "balanced",
        marking: myTeam.defaultMarking || "man_to_man",
        mentality: myTeam.defaultMentality || "normal",
        passingDirectness: myTeam.defaultPassingDirectness || "mixed",
    });

    const [draggedPlayer, setDraggedPlayer] = useState<DraggedPlayer | null>(
        null
    );

    useEffect(() => {
        const loadPlayers = async () => {
            try {
                const data = await window.electronAPI.player.getPlayers(myTeam.id);
                const validPlayers = data.filter(
                    (p: Player) => !p.isInjured && p.suspensionGamesRemaining === 0
                );

                const sorted = [...validPlayers].sort(
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
    }, [myTeam.id]);

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

            if (sourceType === "field" && targetType === "field" && targetIndex !== undefined && sourceIndex !== undefined) {
                const newStarters = [...starters];
                const temp = newStarters[targetIndex];
                newStarters[targetIndex] = newStarters[sourceIndex];
                newStarters[sourceIndex] = temp;
                setStarters(newStarters);
            }

            if (sourceType === "bench" && targetType === "field" && targetIndex !== undefined) {
                const newStarters = [...starters];
                const replacedPlayer = newStarters[targetIndex];
                newStarters[targetIndex] = player;
                setStarters(newStarters);

                const newBench = bench.filter((p) => p.id !== player.id);
                if (replacedPlayer) newBench.push(replacedPlayer);
                setBench(newBench);
            }

            if (sourceType === "field" && targetType === "bench" && sourceIndex !== undefined) {
                const newStarters = [...starters];
                newStarters[sourceIndex] = null;
                setStarters(newStarters);
                setBench([...bench, player]);
            }

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

    const handleConfirm = useCallback(async () => {
        const finalStarters = starters.filter((p): p is Player => p !== null);

        if (finalStarters.length < 11) {
            alert("Você precisa selecionar 11 jogadores titulares!");
            return;
        }

        const myLineup: PreMatchLineup = {
            formation,
            starters: finalStarters.map((p) => p.id),
            bench: bench.map((p) => p.id),
            tactics,
        };

        const cpuLineup = { ...myLineup, starters: [], bench: [] };

        try {
            await window.electronAPI.match.savePreMatchTactics(
                matchId,
                isUserHome ? myLineup : cpuLineup,
                isUserHome ? cpuLineup : myLineup
            );

            onConfirm(myLineup);
        } catch (err) {
            logger.error("Erro ao salvar táticas", err);
            alert("Erro ao salvar táticas. Tente novamente.");
        }

    }, [formation, starters, bench, tactics, onConfirm, matchId, isUserHome]);

    if (loading) {
        return (
            <div className="h-screen bg-slate-950">
                <LoadingSpinner text="Carregando elenco..." />
            </div>
        );
    }

    return (
        <div className="h-screen bg-slate-950 text-white flex flex-col overflow-hidden">
            <header className="bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Preparação Pré-Jogo</h1>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                        <span className="text-emerald-400 font-bold">{myTeam.name}</span>
                        <span>vs</span>
                        <span>{opponentTeam.name}</span>
                        <span className="bg-slate-800 px-2 py-0.5 rounded text-xs ml-2">
                            {isUserHome ? "EM CASA 🏠" : "FORA ✈️"}
                        </span>
                    </div>
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
                        className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 rounded font-bold transition-colors shadow-lg shadow-emerald-900/20"
                    >
                        Confirmar e Iniciar
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
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