import { BrandButton } from "../../common/BrandButton";
import type { SeasonSummary } from "../../pages/club/types";
import { Modal } from "../../common/Modal";

interface SeasonEndModalProps {
    summary: SeasonSummary;
    onClose: () => void;
}

export function SeasonEndModal({ summary, onClose }: SeasonEndModalProps) {
    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="🏆 Temporada Encerrada!"
            variant="success"
            size="md"
            noPadding={true}
        >
            <div className="relative overflow-hidden text-center p-8">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-gradient-to-b from-emerald-500/10 to-transparent opacity-50 pointer-events-none" />

                <span className="text-6xl mb-6 block drop-shadow-lg animate-in zoom-in duration-500">🏆</span>

                <h2 className="text-2xl font-bold text-white mb-2">Resumo do Ano {summary.seasonYear}</h2>
                <p className="text-slate-400 mb-8 text-sm">A temporada chegou ao fim. Veja os destaques.</p>

                <div className="bg-slate-950/50 rounded-xl p-6 mb-8 border border-slate-800 shadow-inner">
                    <p className="text-slate-300 text-lg">
                        Campeão da Liga
                    </p>
                    <p className="text-emerald-400 font-black text-2xl mt-1 tracking-wide">
                        {summary.championName}
                    </p>
                </div>

                <div className="space-y-4">
                    <BrandButton
                        onClick={onClose}
                        className="w-full shadow-emerald-900/30"
                    >
                        Iniciar Nova Temporada
                    </BrandButton>
                </div>
            </div>
        </Modal>
    );
}