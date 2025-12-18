import type { Player } from "../../../../domain/models";
import { calculatePositionPenalty } from "../../../../domain/logic/penaltyCalculator";

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
    const role = assignedPosition || player.position;
    const { penaltyValue, effectiveOverall, severity } = calculatePositionPenalty(player, role);

    if (severity === "none") {
        return (
            <div className={`inline-flex items-center px-2 py-1 rounded bg-emerald-500/20 border border-emerald-500/30 ${className}`}>
                <span className="text-sm font-bold text-emerald-400">
                    {effectiveOverall}
                </span>
            </div>
        );
    }

    const colors = {
        low: "text-blue-400 bg-blue-500/20 border-blue-500/30",
        medium: "text-yellow-400 bg-yellow-500/20 border-yellow-500/30",
        high: "text-orange-400 bg-orange-500/20 border-orange-500/30",
        critical: "text-red-400 bg-red-500/20 border-red-500/30",
    };

    const style = colors[severity];
    const icon = severity === "critical" || severity === "high" ? "❌" : "⚠️";

    return (
        <div
            className={`inline-flex items-center px-2 py-1 rounded border gap-2 ${style} ${className}`}
            title={`Penalidade: -${penaltyValue} pontos no Overall`}
        >
            <span className="text-xs line-through opacity-60">
                {player.overall}
            </span>
            <span className="text-sm font-bold">
                {effectiveOverall}
            </span>
            <span className="text-xs">{icon}</span>
        </div>
    );
}