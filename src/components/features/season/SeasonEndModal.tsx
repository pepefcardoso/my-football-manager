import { BrandButton } from "../../common/BrandButton";
import type { SeasonSummary } from "../../pages/club/types";

interface SeasonEndModalProps {
    summary: SeasonSummary;
    onClose: () => void;
}

export function SeasonEndModal({ summary, onClose }: SeasonEndModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-lg w-full text-center shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-2 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50" />

                <span className="text-4xl mb-4 block">🏆</span>

                <h2 className="text-3xl font-bold text-white mb-2">Temporada Encerrada!</h2>
                <p className="text-slate-400 mb-6 text-sm">Resumo do ano {summary.seasonYear}</p>

                <div className="bg-slate-950/50 rounded-xl p-4 mb-8 border border-slate-800">
                    <p className="text-slate-300">
                        Campeão: <span className="text-emerald-400 font-bold">{summary.championName}</span>
                    </p>
                </div>

                <BrandButton
                    onClick={onClose}
                    className="w-full"
                >
                    Iniciar Nova Temporada
                </BrandButton>
            </div>
        </div>
    );
}