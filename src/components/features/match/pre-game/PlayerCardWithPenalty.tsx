import { useState } from "react";
import { PositionPenaltyBadge } from "./PositionPenaltyBadge";
import type { Player } from "../../../../domain/models";

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

    const isOutOfPosition =
        assignedPosition && assignedPosition !== player.position;

    const getPenaltyMessage = (): string => {
        if (!isOutOfPosition) return "";

        const transitions: Record<string, Record<string, string>> = {
            GK: {
                DF: "Goleiro como zagueiro: Penalidade severa (-50%)",
                MF: "Goleiro no meio: Penalidade extrema (-90%)",
                FW: "Goleiro atacando: Penalidade crítica (-95%)",
            },
            DF: {
                MF: "Zagueiro no meio: Penalidade moderada (-30%)",
                FW: "Zagueiro atacando: Penalidade severa (-60%)",
            },
            MF: {
                DF: "Meia na defesa: Penalidade moderada (-30%)",
                FW: "Meia atacando: Penalidade leve (-30%)",
            },
            FW: {
                MF: "Atacante no meio: Penalidade moderada (-40%)",
                DF: "Atacante na defesa: Penalidade severa (-70%)",
            },
        };

        return (
            transitions[player.position]?.[assignedPosition!] ||
            "Jogador fora de posição natural"
        );
    };

    return (
        <div
            className={`
        relative p-4 rounded-lg transition-all cursor-pointer
        ${selected
                    ? "bg-emerald-600 ring-2 ring-emerald-400"
                    : "bg-slate-800 hover:bg-slate-700"
                }
        ${isOutOfPosition ? "border-2 border-amber-500/50" : ""}
      `}
            onClick={onSelect}
            draggable={draggable}
            onDragStart={onDragStart}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <div className="font-medium text-white mb-1">
                        {player.firstName} {player.lastName}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-400">{player.position}</span>
                        {assignedPosition && assignedPosition !== player.position && (
                            <>
                                <span className="text-slate-600">→</span>
                                <span className="text-amber-400 font-bold">
                                    {assignedPosition}
                                </span>
                            </>
                        )}
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                        Energia: {player.energy}% • Moral: {player.moral}%
                    </div>
                </div>

                <PositionPenaltyBadge
                    player={player}
                    assignedPosition={assignedPosition}
                />
            </div>

            {showTooltip && isOutOfPosition && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 w-64 p-3 bg-slate-950 border border-amber-500/50 rounded-lg shadow-2xl animate-in fade-in zoom-in duration-200">
                    <div className="flex items-start gap-2">
                        <span className="text-amber-500 text-xl">⚠️</span>
                        <div className="flex-1">
                            <div className="font-bold text-amber-400 text-sm mb-1">
                                Alerta de Posição
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">
                                {getPenaltyMessage()}
                            </p>
                        </div>
                    </div>
                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-8 border-transparent border-t-amber-500/50" />
                </div>
            )}
        </div>
    );
}