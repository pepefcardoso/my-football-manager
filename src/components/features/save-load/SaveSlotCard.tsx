import type { GameSaveMetadata } from "../../../domain/GameSaveTypes";
import Badge from "../../common/Badge";

interface SaveSlotCardProps {
    metadata: GameSaveMetadata;
    selected: boolean;
    onClick: () => void;
}

export function SaveSlotCard({ metadata, selected, onClick }: SaveSlotCardProps) {
    const lastSavedDate = new Date(metadata.lastSaveTimestamp).toLocaleString("pt-PT", {
        dateStyle: "short",
        timeStyle: "short",
    });

    const gameDate = new Date(metadata.currentDate).toLocaleDateString("pt-PT", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });

    return (
        <div
            onClick={onClick}
            className={`
        relative w-full p-4 rounded-lg border cursor-pointer transition-all duration-200 group
        ${selected
                    ? "bg-emerald-900/20 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                    : "bg-slate-900 border-slate-800 hover:bg-slate-800 hover:border-slate-700"
                }
      `}
        >
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                    <div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-inner border border-slate-700"
                        style={{ backgroundColor: metadata.primaryColor || '#333' }}
                    >
                        {metadata.teamName.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <h4 className={`font-bold ${selected ? "text-white" : "text-slate-200"}`}>
                            {metadata.teamName}
                        </h4>
                        <p className="text-xs text-slate-400">Treinador {metadata.managerName}</p>
                    </div>
                </div>
                <Badge variant={selected ? "success" : "neutral"}>
                    {metadata.seasonYear}
                </Badge>
            </div>

            <div className="space-y-1 mt-3">
                <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Data do Jogo:</span>
                    <span className="text-slate-300 font-medium">{gameDate}</span>
                </div>
                <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Salvo em:</span>
                    <span className="text-slate-400">{lastSavedDate}</span>
                </div>
                <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Tempo de Jogo:</span>
                    <span className="text-slate-400">
                        {Math.floor(metadata.playTimeSeconds / 3600)}h {Math.floor((metadata.playTimeSeconds % 3600) / 60)}m
                    </span>
                </div>
            </div>

            {selected && (
                <div className="absolute inset-y-0 right-0 w-1 bg-emerald-500 rounded-r-lg" />
            )}
        </div>
    );
}