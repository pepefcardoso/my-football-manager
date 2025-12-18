import type { Player } from "../../../../domain/models";
import { PlayerCardWithPenalty } from "./PlayerCardWithPenalty";

interface PlayerDragItemProps {
    player: Player;
    role: string;
    sourceType: "field" | "bench";
    index?: number;
    isDragged: boolean;
    onDragStart: (player: Player, sourceType: "field" | "bench", index?: number) => void;
}

export function PlayerDragItem({
    player,
    role,
    sourceType,
    index,
    isDragged,
    onDragStart,
}: PlayerDragItemProps) {

    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart(player, sourceType, index);
    };

    return (
        <div
            draggable
            onDragStart={handleDragStart}
            className={`
        w-full h-full transition-opacity duration-200 cursor-move
        ${isDragged ? "opacity-50 scale-95" : "opacity-100 hover:scale-105"}
      `}
        >
            <PlayerCardWithPenalty
                player={player}
                assignedPosition={role}
                selected={isDragged}
                draggable={false}
            />
        </div>
    );
}