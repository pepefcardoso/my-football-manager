import { useCallback } from "react";
import type { Player, Formation } from "../../../../domain/models";
import { PlayerCardWithPenalty } from "./PlayerCardWithPenalty";

interface FieldViewProps {
    formation: Formation;
    starters: (Player | null)[];
    onDragStart: (player: Player, sourceType: "field", index: number) => void;
    onDrop: (targetType: "field", index: number) => void;
    draggedPlayer: { player: Player; sourceType: string } | null;
}

const FORMATION_LAYOUTS: Record<string, { top: number; left: number; role: string }[]> = {
    "4-4-2": [
        { top: 88, left: 50, role: "GK" },
        { top: 70, left: 15, role: "DF" }, { top: 70, left: 38, role: "DF" }, { top: 70, left: 62, role: "DF" }, { top: 70, left: 85, role: "DF" },
        { top: 45, left: 15, role: "MF" }, { top: 45, left: 38, role: "MF" }, { top: 45, left: 62, role: "MF" }, { top: 45, left: 85, role: "MF" },
        { top: 20, left: 35, role: "FW" }, { top: 20, left: 65, role: "FW" },
    ],
    "4-3-3": [
        { top: 88, left: 50, role: "GK" },
        { top: 70, left: 15, role: "DF" }, { top: 70, left: 38, role: "DF" }, { top: 70, left: 62, role: "DF" }, { top: 70, left: 85, role: "DF" },
        { top: 45, left: 30, role: "MF" }, { top: 45, left: 50, role: "MF" }, { top: 45, left: 70, role: "MF" },
        { top: 20, left: 20, role: "FW" }, { top: 20, left: 50, role: "FW" }, { top: 20, left: 80, role: "FW" },
    ],
    "3-5-2": [
        { top: 88, left: 50, role: "GK" },
        { top: 70, left: 25, role: "DF" }, { top: 70, left: 50, role: "DF" }, { top: 70, left: 75, role: "DF" },
        { top: 45, left: 10, role: "MF" }, { top: 45, left: 30, role: "MF" }, { top: 45, left: 50, role: "MF" }, { top: 45, left: 70, role: "MF" }, { top: 45, left: 90, role: "MF" },
        { top: 20, left: 35, role: "FW" }, { top: 20, left: 65, role: "FW" },
    ],
    "default": [
        { top: 88, left: 50, role: "GK" },
        { top: 70, left: 15, role: "DF" }, { top: 70, left: 38, role: "DF" }, { top: 70, left: 62, role: "DF" }, { top: 70, left: 85, role: "DF" },
        { top: 45, left: 15, role: "MF" }, { top: 45, left: 38, role: "MF" }, { top: 45, left: 62, role: "MF" }, { top: 45, left: 85, role: "MF" },
        { top: 20, left: 35, role: "FW" }, { top: 20, left: 65, role: "FW" },
    ]
};

export function FieldView({ formation, starters, onDragStart, onDrop, draggedPlayer }: FieldViewProps) {
    const layout = FORMATION_LAYOUTS[formation] || FORMATION_LAYOUTS["default"];

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
    }, []);

    return (
        <div className="relative flex-1 bg-emerald-800 rounded-lg overflow-hidden shadow-inner border-4 border-emerald-900 m-4">
            <div className="absolute inset-0 opacity-30 pointer-events-none">
                <div className="w-full h-full" style={{ backgroundImage: "linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.1) 50%)", backgroundSize: "100% 10%" }}></div>
                <div className="absolute top-0 left-0 right-0 h-px bg-white/50"></div>
                <div className="absolute bottom-0 left-0 right-0 h-px bg-white/50"></div>
                <div className="absolute top-0 bottom-0 left-0 w-px bg-white/50"></div>
                <div className="absolute top-0 bottom-0 right-0 w-px bg-white/50"></div>
                <div className="absolute top-1/2 left-0 right-0 h-px bg-white/50"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-white/50 rounded-full"></div>

                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-1/6 border border-white/50 border-b-0"></div>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/4 h-[8%] border border-white/50 border-b-0"></div>
            </div>

            {layout.map((pos, index) => {
                const player = starters[index];
                const isTarget = draggedPlayer !== null;

                return (
                    <div
                        key={index}
                        className="absolute w-32 h-24 -translate-x-1/2 -translate-y-1/2 transition-all duration-300"
                        style={{ top: `${pos.top}%`, left: `${pos.left}%` }}
                        onDragOver={handleDragOver}
                        onDrop={() => onDrop("field", index)}
                    >
                        {player ? (
                            <PlayerCardWithPenalty
                                player={player}
                                assignedPosition={pos.role}
                                draggable
                                onDragStart={() => onDragStart(player, "field", index)}
                                selected={draggedPlayer?.player.id === player.id}
                            />
                        ) : (
                            <div
                                className={`
                  w-full h-full rounded-lg border-2 border-dashed flex items-center justify-center
                  transition-colors
                  ${isTarget ? "border-emerald-400 bg-emerald-500/20 animate-pulse" : "border-emerald-700/50 bg-black/10"}
                `}
                            >
                                <span className="text-emerald-200/50 font-bold text-xl">{pos.role}</span>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}