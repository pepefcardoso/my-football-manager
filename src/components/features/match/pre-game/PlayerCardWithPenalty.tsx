import { useState } from "react";
import { PositionPenaltyBadge } from "./PositionPenaltyBadge";
import type { Player } from "../../../../domain/models";
import { calculatePositionPenalty } from "../../../../domain/logic/penaltyCalculator";

interface PlayerCardWithPenaltyProps {
    player: Player;
    assignedPosition?: string;
    onSelect?: () => void;
    selected?: boolean;
    draggable?: boolean;
    onDragStart?: () => void;
}

export function PlayerCardWithPenalty({
    player,
    assignedPosition,
    onSelect,
    selected = false,
    draggable = false,
    onDragStart,
}: PlayerCardWithPenaltyProps) {
    const [showTooltip, setShowTooltip] = useState(false);

    const role = assignedPosition || player.position;
    const { message, severity, penaltyValue } = calculatePositionPenalty(player, role);
    const hasPenalty = severity !== "none";

    return (
        <div
            className={`
                relative p-3 rounded-lg transition-all cursor-pointer h-full border
                flex flex-col justify-between shadow-lg
                ${selected
                    ? "bg-emerald-600 border-emerald-400 ring-2 ring-emerald-400/50"
                    : "bg-slate-800 border-slate-700 hover:bg-slate-700 hover:border-slate-500"
                }
                ${hasPenalty ? "border-amber-500/40" : ""}
            `}
            onClick={onSelect}
            draggable={draggable}
            onDragStart={onDragStart}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            <div className="flex justify-between items-start mb-1">
                <div className="min-w-0">
                    <div className="font-bold text-white text-sm truncate leading-tight">
                        {player.lastName}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] mt-0.5">
                        <span className="text-slate-400 font-mono">{player.position}</span>
                        {hasPenalty && (
                            <>
                                <span className="text-slate-600">→</span>
                                <span className="text-amber-400 font-bold font-mono">{assignedPosition}</span>
                            </>
                        )}
                    </div>
                </div>

                <PositionPenaltyBadge
                    player={player}
                    assignedPosition={assignedPosition}
                    className="scale-90 origin-top-right"
                />
            </div>

            <div className="flex items-center gap-2 mt-auto">
                <div className="h-1.5 flex-1 bg-slate-950 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full ${player.energy > 80 ? 'bg-emerald-500' : player.energy > 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${player.energy}%` }}
                    />
                </div>
                <span className="text-[10px] text-slate-400">{player.energy}%</span>
            </div>

            {showTooltip && hasPenalty && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 z-50 w-56 p-3 bg-slate-950/95 backdrop-blur border border-amber-500/50 rounded-lg shadow-2xl animate-in fade-in zoom-in duration-200 pointer-events-none">
                    <div className="flex items-start gap-3">
                        <div className="bg-amber-500/20 p-1.5 rounded text-lg">⚠️</div>
                        <div>
                            <div className="font-bold text-amber-400 text-xs uppercase tracking-wide mb-1">
                                Fora de Posição
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed mb-2">
                                {message}
                            </p>
                            <div className="text-xs font-mono text-red-400 bg-red-900/20 px-2 py-1 rounded inline-block">
                                -{penaltyValue} pontos em atributos
                            </div>
                        </div>
                    </div>
                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-8 border-transparent border-t-slate-950/95" />
                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-[9px] border-transparent border-t-amber-500/50 -z-10" />
                </div>
            )}
        </div>
    );
}