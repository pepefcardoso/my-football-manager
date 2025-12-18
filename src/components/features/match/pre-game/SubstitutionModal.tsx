import { useState, useEffect } from "react";
import type { Player } from "../../../../domain/models";

interface SubstitutionModalProps {
    matchId: number;
    isHome: boolean;
    onClose: () => void;
    onConfirm: (playerOutId: number, playerInId: number) => Promise<void>;
}

export function SubstitutionModal({
    matchId,
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
        // TODO: Carregar jogadores em campo e no banco via IPC
        setOnFieldPlayers([]);
        setBenchPlayers([]);
    }, [matchId, isHome]);

    const handleConfirm = async () => {
        if (!selectedOut || !selectedIn) {
            setError("Selecione um jogador para sair e outro para entrar.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            await onConfirm(selectedOut, selectedIn);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erro desconhecido");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 rounded-xl border border-slate-700 max-w-4xl w-full shadow-2xl overflow-hidden">
                <div className="bg-slate-950 border-b border-slate-800 p-6 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-white">🔄 Substituição</h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 grid grid-cols-2 gap-6">
                    <div>
                        <h3 className="text-lg font-bold text-emerald-400 mb-4">
                            Jogadores em Campo
                        </h3>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {onFieldPlayers.map((player) => (
                                <button
                                    key={player.id}
                                    onClick={() => setSelectedOut(player.id)}
                                    className={`
                    w-full p-4 rounded-lg text-left transition-all
                    ${selectedOut === player.id
                                            ? "bg-red-600 ring-2 ring-red-400"
                                            : "bg-slate-800 hover:bg-slate-700"
                                        }
                  `}
                                >
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <div className="font-medium text-white">
                                                {player.firstName} {player.lastName}
                                            </div>
                                            <div className="text-xs text-slate-400">
                                                {player.position} • Energia: {player.energy}%
                                            </div>
                                        </div>
                                        <div className="text-xl font-bold text-white">
                                            {player.overall}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-bold text-emerald-400 mb-4">
                            Banco de Reservas
                        </h3>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {benchPlayers.map((player) => (
                                <button
                                    key={player.id}
                                    onClick={() => setSelectedIn(player.id)}
                                    disabled={player.isInjured}
                                    className={`
                    w-full p-4 rounded-lg text-left transition-all
                    ${selectedIn === player.id
                                            ? "bg-emerald-600 ring-2 ring-emerald-400"
                                            : "bg-slate-800 hover:bg-slate-700"
                                        }
                    ${player.isInjured ? "opacity-50 cursor-not-allowed" : ""}
                  `}
                                >
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <div className="font-medium text-white">
                                                {player.firstName} {player.lastName}
                                            </div>
                                            <div className="text-xs text-slate-400">
                                                {player.position} • Energia: {player.energy}%
                                            </div>
                                        </div>
                                        <div className="text-xl font-bold text-white">
                                            {player.overall}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="mx-6 mb-4 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400">
                        {error}
                    </div>
                )}

                <div className="border-t border-slate-800 p-6 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isLoading || !selectedOut || !selectedIn}
                        className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 rounded font-bold transition-colors disabled:opacity-50"
                    >
                        {isLoading ? "Confirmando..." : "Confirmar Substituição"}
                    </button>
                </div>
            </div>
        </div>
    );
}