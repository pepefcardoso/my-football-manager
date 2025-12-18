import type { TacticsConfig } from "../../../../domain/models";

interface TacticsPanelProps {
    tactics: TacticsConfig;
    onChange: (tactics: TacticsConfig) => void;
}

export function TacticsPanel({ tactics, onChange }: TacticsPanelProps) {

    const handleChange = (key: keyof TacticsConfig, value: string) => {
        onChange({
            ...tactics,
            [key]: value,
        });
    };

    return (
        <div className="p-6 border-b border-slate-800 bg-slate-900/50">
            <h3 className="text-lg font-bold mb-4 text-emerald-400 flex items-center gap-2">
                <span>⚙️</span> Instruções Táticas
            </h3>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                        Mentalidade
                    </label>
                    <select
                        value={tactics.mentality}
                        onChange={(e) => handleChange("mentality", e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                    >
                        <option value="ultra_defensive">🛡️ Ultra Defensivo</option>
                        <option value="defensive">🛡️ Defensivo</option>
                        <option value="normal">⚖️ Equilibrado</option>
                        <option value="attacking">⚔️ Atacante</option>
                        <option value="ultra_attacking">🔥 Ultra Atacante</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                        Estilo de Jogo
                    </label>
                    <select
                        value={tactics.style}
                        onChange={(e) => handleChange("style", e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                    >
                        <option value="balanced">⚖️ Padrão</option>
                        <option value="possession">⚽ Posse de Bola</option>
                        <option value="counter_attack">⚡ Contra-Ataque</option>
                        <option value="long_ball">🚀 Bola Longa</option>
                        <option value="pressing">😤 Pressão Alta</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                        Sistema de Marcação
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => handleChange("marking", "man_to_man")}
                            className={`p-2 rounded text-xs font-bold border ${tactics.marking === "man_to_man"
                                    ? "bg-emerald-600 border-emerald-500 text-white"
                                    : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
                                }`}
                        >
                            Individual
                        </button>
                        <button
                            onClick={() => handleChange("marking", "zonal")}
                            className={`p-2 rounded text-xs font-bold border ${tactics.marking === "zonal"
                                    ? "bg-emerald-600 border-emerald-500 text-white"
                                    : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
                                }`}
                        >
                            Zonal
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                        Estilo de Passes
                    </label>
                    <select
                        value={tactics.passingDirectness}
                        onChange={(e) => handleChange("passingDirectness", e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                    >
                        <option value="short">Curtos</option>
                        <option value="mixed">Mistos</option>
                        <option value="direct">Diretos</option>
                        <option value="long">Longos</option>
                    </select>
                </div>
            </div>

            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-xs text-blue-300">
                    💡 Dica: Mentalidade ofensiva consome mais energia dos jogadores.
                </p>
            </div>
        </div>
    );
}