import type { GameSaveMetadata } from "../../../domain/GameSaveTypes";
import Badge from "../../common/Badge";

interface SaveSlotCardProps {
    metadata: GameSaveMetadata;
    selected: boolean;
    onClick: () => void;
}

export function SaveSlotCard({ metadata, selected, onClick }: SaveSlotCardProps) {
    const formattedDate = new Date(metadata.currentDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    const lastPlayed = new Date(metadata.lastSaveTimestamp).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

    const hours = Math.floor(metadata.playTimeSeconds / 3600);
    const minutes = Math.floor((metadata.playTimeSeconds % 3600) / 60);
    const teamColor = metadata.primaryColor || '#334155';

    return (
        <div
            onClick={onClick}
            className={`
                relative w-full p-0 rounded-xl border cursor-pointer transition-all duration-300 group overflow-hidden
                ${selected
                    ? "bg-slate-900 border-emerald-500 ring-1 ring-emerald-500/50 shadow-2xl shadow-emerald-900/20 scale-[1.02]"
                    : "bg-slate-900/60 border-slate-800 hover:border-slate-600 hover:bg-slate-800 hover:-translate-y-1"
                }
            `}
        >
            <div className="h-1.5 w-full transition-all duration-500" style={{ backgroundColor: teamColor }} />

            <div className="p-5 relative">
                <div
                    className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity"
                    style={{ backgroundColor: teamColor }}
                />

                <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="flex items-center gap-4">
                        <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black text-white shadow-lg border border-white/10"
                            style={{ backgroundColor: teamColor }}
                        >
                            {metadata.teamName.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <h4 className={`font-bold text-lg leading-tight ${selected ? "text-white" : "text-slate-200"}`}>
                                {metadata.teamName}
                            </h4>
                            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mt-0.5 flex items-center gap-1">
                                <span>👔</span> {metadata.managerName}
                            </p>
                        </div>
                    </div>
                    <Badge variant={selected ? "success" : "neutral"}>
                        {metadata.seasonYear}
                    </Badge>
                </div>

                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs border-t border-slate-800 pt-3">
                    <div>
                        <span className="block text-slate-500 mb-0.5">Data no Jogo</span>
                        <span className="text-slate-300 font-mono">{formattedDate}</span>
                    </div>
                    <div className="text-right">
                        <span className="block text-slate-500 mb-0.5">Tempo Jogado</span>
                        <span className="text-slate-300 font-mono">{hours}h {minutes}m</span>
                    </div>
                    <div className="col-span-2 pt-1 flex justify-between items-center">
                        <span className="text-slate-600">Último save:</span>
                        <span className="text-slate-500">{lastPlayed}</span>
                    </div>
                </div>
            </div>

            {selected && (
                <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
            )}
        </div>
    );
}