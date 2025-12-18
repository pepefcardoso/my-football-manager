import type { Player } from "../../../../domain/models";

interface PositionPenaltyBadgeProps {
    player: Player;
    assignedPosition?: string;
    className?: string;
}

export function PositionPenaltyBadge({
    player,
    assignedPosition,
    className = "",
}: PositionPenaltyBadgeProps) {
    if (!assignedPosition || assignedPosition === player.position) {
        return (
            <div
                className={`inline-flex items-center px-2 py-1 rounded bg-emerald-500/20 border border-emerald-500/30 ${className}`}
            >
                <span className="text-sm font-bold text-emerald-400">
                    {player.overall}
                </span>
            </div>
        );
    }

    const penaltyMap: Record<string, Record<string, number>> = {
        GK: { DF: 0.5, MF: 0.1, FW: 0.05 },
        DF: { DF: 1.0, MF: 0.7, FW: 0.4 },
        MF: { DF: 0.7, MF: 1.0, FW: 0.7 },
        FW: { DF: 0.3, MF: 0.6, FW: 1.0 },
    };

    const penalty =
        penaltyMap[player.position]?.[assignedPosition] ?? 0.5;
    const effectiveOverall = Math.round(player.overall * penalty);
    const difference = player.overall - effectiveOverall;

    if (difference <= 2) {
        return (
            <div
                className={`inline-flex items-center px-2 py-1 rounded bg-yellow-500/20 border border-yellow-500/30 ${className}`}
                title={`Leve penalidade fora de posição (-${difference})`}
            >
                <span className="text-sm font-bold text-yellow-400">
                    {effectiveOverall}
                </span>
                <span className="text-xs text-yellow-500 ml-1">⚠️</span>
            </div>
        );
    }

    return (
        <div
            className={`inline-flex items-center px-2 py-1 rounded bg-red-500/20 border border-red-500/30 ${className}`}
            title={`Forte penalidade fora de posição! (-${difference})`}
        >
            <span className="text-sm font-bold text-red-400 line-through">
                {player.overall}
            </span>
            <span className="text-sm font-bold text-red-300 ml-1">
                {effectiveOverall}
            </span>
            <span className="text-xs text-red-500 ml-1">❌</span>
        </div>
    );
}