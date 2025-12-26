import { useState } from "react";
import type { Player } from "../../../../domain/models";
import { Modal } from "../../../common/Modal";

interface SubstitutionModalProps {
    matchId: number;
    teamId: number;
    isHome: boolean;
    onClose: () => void;
    onConfirm: (playerOutId: number, playerInId: number) => Promise<void>;
    currentOnField: Player[];
    currentBench: Player[];
}

export function SubstitutionModal({
    isHome,
    onClose,
    onConfirm,
    currentOnField,
    currentBench
}: SubstitutionModalProps) {
    const [selectedOut, setSelectedOut] = useState<number | null>(null);
    const [selectedIn, setSelectedIn] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

    const footer = (
        <>
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
        </>
    );

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title={
                <span className="flex items-center gap-2">
                    🔄 Substituição <span className="text-sm font-normal text-slate-400">({isHome ? "Mandante" : "Visitante"})</span>
                </span>
            }
            size="xl"
            footer={footer}
            className="max-h-[90vh]"
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-950/30 p-4 rounded-xl border border-red-900/20">
                    <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
                        🔻 Sair
                    </h3>
                    <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                        {currentOnField.map((player) => (
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
                        🔼 Entrar
                    </h3>
                    <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                        {currentBench.map((player) => (
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
                <div className="mt-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm font-medium">
                    ⚠️ {error}
                </div>
            )}
        </Modal>
    );
}