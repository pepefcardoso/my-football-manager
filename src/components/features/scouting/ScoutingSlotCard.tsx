import type { ScoutingSlot } from "../../../domain/models";

interface ScoutingSlotCardProps {
    slot: ScoutingSlot;
    onConfigure: (slotNumber: number) => void;
    onStop: (slotNumber: number) => void;
}

export function ScoutingSlotCard({ slot, onConfigure, onStop }: ScoutingSlotCardProps) {
    const { isActive, slotNumber, filters, stats } = slot;

    return (
        <div className={`
            relative p-4 rounded-lg border transition-all
            ${isActive
                ? "bg-slate-800 border-emerald-500/50 shadow-lg shadow-emerald-900/10"
                : "bg-slate-900/50 border-slate-800 border-dashed hover:border-slate-600"}
        `}>
            <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Slot {slotNumber}
                </span>
                {isActive ? (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        ATIVO
                    </span>
                ) : (
                    <span className="text-xs text-slate-600 font-medium">Inativo</span>
                )}
            </div>

            {isActive ? (
                <div className="space-y-3">
                    <div className="text-sm text-slate-200">
                        <p className="font-semibold text-white mb-1">Filtros Ativos:</p>
                        <ul className="space-y-1 text-xs text-slate-400">
                            <li>🌍 {filters.country || "Global"}</li>
                            <li>⚽ {filters.position || "Qualquer Posição"}</li>
                            <li>🎂 {filters.ageGroup ? `Idade: ${filters.ageGroup}` : "Qualquer Idade"}</li>
                        </ul>
                    </div>

                    <div className="pt-3 border-t border-slate-700 flex justify-between items-center">
                        <div className="text-xs">
                            <span className="text-slate-500 block">Encontrados</span>
                            <span className="text-white font-mono font-bold text-lg">{stats.playersFound}</span>
                        </div>
                        <button
                            onClick={() => onStop(slotNumber)}
                            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs rounded border border-red-500/30 transition-colors"
                        >
                            Parar
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                    <button
                        onClick={() => onConfigure(slotNumber)}
                        className="group flex flex-col items-center gap-2 text-slate-400 hover:text-emerald-400 transition-colors"
                    >
                        <div className="w-10 h-10 rounded-full border-2 border-slate-700 group-hover:border-emerald-500 flex items-center justify-center text-xl transition-all">
                            +
                        </div>
                        <span className="text-sm font-medium">Configurar Busca</span>
                    </button>
                </div>
            )}
        </div>
    );
}