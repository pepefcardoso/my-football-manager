import { useState, useEffect } from "react";
import type { Player } from "../../../../domain/models";
import { Logger } from "../../../../lib/Logger";

const logger = new Logger("SubstitutionModal");

interface SubstitutionModalProps {
    matchId: number;
    teamId: number;
    isHome: boolean;
    onClose: () => void;
    onConfirm: (playerOutId: number, playerInId: number) => Promise<void>;
}

export function SubstitutionModal({
    matchId,
    teamId,
    isHome,
    onClose,
    onConfirm,
}: SubstitutionModalProps) {
    const [onFieldPlayers, setOnFieldPlayers] = useState<Player[]>([]);
    const [benchPlayers, setBenchPlayers] = useState<Player[]>([]);
    const [selectedOut, setSelectedOut] = useState<number | null>(null);
    const [selectedIn, setSelectedIn] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadSquad = async () => {
            try {
                const allPlayers = await window.electronAPI.player.getPlayers(teamId);

                const available = allPlayers.filter(p => !p.isInjured || p.injuryDaysRemaining === 0);

                // TODO endpoint 'getMatchState' retornaria 
                // exatamente quem está em campo.
                // Para garantir consistência com o Engine, o ideal seria o Engine enviar essa lista.

                const sorted = [...available].sort((a, b) => b.overall - a.overall);
                setOnFieldPlayers(sorted.slice(0, 11));
                setBenchPlayers(sorted.slice(11, 18));

            } catch (err) {
                logger.error("Erro ao carregar elenco para substituição", err);
                setError("Não foi possível carregar os jogadores.");
            }
        };

        loadSquad();
    }, [matchId, teamId]);

    const handleConfirm = async () => {
        if (!selectedOut || !selectedIn) {
            setError("Selecione um jogador para sair e outro para entrar.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            await onConfirm(selectedOut, selectedIn);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erro desconhecido");
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 rounded-xl border border-slate-700 max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-slate-950 border-b border-slate-800 p-6 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        🔄 Substituição <span className="text-sm font-normal text-slate-400">({isHome ? "Mandante" : "Visitante"})</span>
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto">
                    <div className="bg-slate-950/30 p-4 rounded-xl border border-red-900/20">
                        <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
                            🔻 Sair
                        </h3>
                        <div className="space-y-2">
                            {onFieldPlayers.map((player) => (
                                <button
                                    key={player.id}
                                    onClick={() => setSelectedOut(player.id)}
                                    className={`
                                        w-full p-3 rounded-lg text-left transition-all border
                                        ${selectedOut === player.id
                                            ? "bg-red-600/20 border-red-500 ring-1 ring-red-500 text-white"
                                            : "bg-slate-800 border-slate-700 hover:border-slate-500 text-slate-300"
                                        }
                                    `}
                                >
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <div className="font-bold">{player.firstName} {player.lastName}</div>
                                            <div className="text-xs opacity-70">{player.position} • Energia: {player.energy}%</div>
                                        </div>
                                        <div className="text-lg font-bold">{player.overall}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-950/30 p-4 rounded-xl border border-emerald-900/20">
                        <h3 className="text-lg font-bold text-emerald-400 mb-4 flex items-center gap-2">
                            pV Entrar
                        </h3>
                        <div className="space-y-2">
                            {benchPlayers.map((player) => (
                                <button
                                    key={player.id}
                                    onClick={() => setSelectedIn(player.id)}
                                    className={`
                                        w-full p-3 rounded-lg text-left transition-all border
                                        ${selectedIn === player.id
                                            ? "bg-emerald-600/20 border-emerald-500 ring-1 ring-emerald-500 text-white"
                                            : "bg-slate-800 border-slate-700 hover:border-slate-500 text-slate-300"
                                        }
                                    `}
                                >
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <div className="font-bold">{player.firstName} {player.lastName}</div>
                                            <div className="text-xs opacity-70">{player.position} • Energia: {player.energy}%</div>
                                        </div>
                                        <div className="text-lg font-bold">{player.overall}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="mx-6 mb-4 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm font-medium">
                        ⚠️ {error}
                    </div>
                )}

                <div className="border-t border-slate-800 p-6 flex justify-end gap-3 bg-slate-950">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isLoading || !selectedOut || !selectedIn}
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition-colors disabled:opacity-50 shadow-lg shadow-emerald-900/20"
                    >
                        {isLoading ? "Processando..." : "Confirmar Substituição"}
                    </button>
                </div>
            </div>
        </div>
    );
}