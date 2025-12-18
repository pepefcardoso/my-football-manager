import type { Player, Formation } from "../../../../domain/models";
import { FORMATION_LAYOUTS, DEFAULT_LAYOUT } from "../../../../domain/tactics/formationLayouts";
import { FieldPosition } from "./FieldPosition";

interface FieldViewProps {
    formation: Formation;
    starters: (Player | null)[];
    onDragStart: (player: Player, sourceType: "field", index: number) => void;
    onDrop: (targetType: "field", index: number) => void;
    draggedPlayer: { player: Player; sourceType: string } | null;
}

export function FieldView({
    formation,
    starters,
    onDragStart,
    onDrop,
    draggedPlayer
}: FieldViewProps) {

    const layout = FORMATION_LAYOUTS[formation] || DEFAULT_LAYOUT;
    const isDragging = draggedPlayer !== null;

    return (
        <div className="relative flex-1 bg-emerald-800 rounded-lg overflow-hidden shadow-2xl border-4 border-emerald-900 m-4 select-none">
            <div className="absolute inset-0 opacity-30 pointer-events-none">
                <div
                    className="w-full h-full"
                    style={{
                        backgroundImage: "linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.2) 50%)",
                        backgroundSize: "100% 10%"
                    }}
                />
                <div className="absolute top-0 left-0 right-0 h-px bg-white/40"></div>
                <div className="absolute bottom-0 left-0 right-0 h-px bg-white/40"></div>
                <div className="absolute top-0 bottom-0 left-0 w-px bg-white/40"></div>
                <div className="absolute top-0 bottom-0 right-0 w-px bg-white/40"></div>
                <div className="absolute top-1/2 left-0 right-0 h-px bg-white/40"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-white/40 rounded-full"></div>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-24 border border-white/40 border-b-0"></div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 border border-white/40 border-t-0"></div>
            </div>

            {layout.map((pos, index) => (
                <FieldPosition
                    key={index}
                    index={index}
                    top={pos.top}
                    left={pos.left}
                    role={pos.role}
                    player={starters[index]}
                    isTargetActive={isDragging}
                    onDrop={onDrop}
                    onDragStart={onDragStart}
                    draggedPlayerId={draggedPlayer?.player.id}
                />
            ))}
        </div>
    );
}