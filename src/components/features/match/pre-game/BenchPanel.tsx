import type { Player } from "../../../../domain/models";

interface BenchPanelProps {
    bench: Player[];
    availablePlayers: Player[];
    onDragStart: (player: Player, sourceType: "bench") => void;
}

export function BenchPanel({ bench, availablePlayers, onDragStart }: BenchPanelProps) {
    return (
        <div className="flex-1 p-6 overflow-y-auto">
            <h3 className="text-lg font-bold mb-4 text-emerald-400">
                🪑 Banco de Reservas ({bench.length}/7)
            </h3>

            <div className="space-y-2 mb-6">
                {bench.map((player) => (
                    <div
                        key={player.id}
                        draggable
                        onDragStart={() => onDragStart(player, "bench")}
                        className="bg-slate-800 p-3 rounded-lg cursor-move hover:bg-slate-700 transition-colors border border-slate-700"
                    >
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="font-medium text-white">
                                    {player.firstName} {player.lastName}
                                </div>
                                <div className="text-xs text-slate-400">
                                    {player.position} • OVR {player.overall}
                                </div>
                            </div>
                            <div className="text-emerald-400 font-bold text-lg">
                                {player.overall}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {availablePlayers.length > 0 && (
                <>
                    <h3 className="text-lg font-bold mb-4 text-slate-400">
                        📋 Jogadores Disponíveis
                    </h3>
                    <div className="space-y-2">
                        {availablePlayers.map((player) => (
                            <div
                                key={player.id}
                                draggable
                                onDragStart={() => onDragStart(player, "bench")}
                                className="bg-slate-900 p-3 rounded-lg cursor-move hover:bg-slate-800 transition-colors border border-slate-800"
                            >
                                <div className="flex justify-between items-center">
                                    <div>
                                        <div className="font-medium text-slate-300">
                                            {player.firstName} {player.lastName}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {player.position} • OVR {player.overall}
                                        </div>
                                    </div>
                                    <div className="text-slate-400 font-bold">
                                        {player.overall}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}