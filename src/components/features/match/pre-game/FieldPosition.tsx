import { useCallback } from "react";
import type { Player } from "../../../../domain/models";
import { PlayerDragItem } from "./PlayerDragItem";

interface FieldPositionProps {
    top: number;
    left: number;
    role: string;
    player: Player | null;
    index: number;
    isTargetActive: boolean;
    onDrop: (targetType: "field", index: number) => void;
    onDragStart: (player: Player, sourceType: "field", index: number) => void;
    draggedPlayerId?: number;
}

export function FieldPosition({
    top,
    left,
    role,
    player,
    index,
    isTargetActive,
    onDrop,
    onDragStart,
    draggedPlayerId,
}: FieldPositionProps) {

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        onDrop("field", index);
    }, [index, onDrop]);

    const handleDragStartAdapter = useCallback((p: Player, s: "field" | "bench", i?: number) => {
        if (s === "field" && typeof i === "number") {
            onDragStart(p, s, i);
        }
    }, [onDragStart]);

    const isBeingDragged = player?.id === draggedPlayerId;

    return (
        <div
            className="absolute w-32 h-24 -translate-x-1/2 -translate-y-1/2 transition-all duration-300"
            style={{ top: `${top}%`, left: `${left}%` }}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {player ? (
                <PlayerDragItem
                    player={player}
                    role={role}
                    sourceType="field"
                    index={index}
                    isDragged={isBeingDragged}
                    onDragStart={handleDragStartAdapter}
                />
            ) : (
                <div
                    className={`
                        w-full h-full rounded-lg border-2 border-dashed flex items-center justify-center
                        transition-all backdrop-blur-sm select-none
                        ${isTargetActive
                            ? "border-emerald-400 bg-emerald-500/30 animate-pulse shadow-[0_0_15px_rgba(52,211,153,0.3)]"
                            : "border-emerald-700/50 bg-black/20 text-emerald-700"
                        }
                    `}
                >
                    <span className={`
                        font-bold text-xl drop-shadow-md transition-colors
                        ${isTargetActive ? "text-emerald-100" : "text-emerald-200/50"}
                    `}>
                        {role}
                    </span>
                </div>
            )}
        </div>
    );
}