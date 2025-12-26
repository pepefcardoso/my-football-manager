import { useState } from "react";
import type { TacticsConfig } from "../../../../domain/models";
import { LoadingOverlay } from "../../../common/Loading";

interface InGameTacticsPanelProps {
    matchId: number;
    isHome: boolean;
    currentTactics: TacticsConfig;
    onUpdate: (tactics: Partial<TacticsConfig>) => Promise<void>;
    onSubstitution: () => void;
    disabled?: boolean;
}

export function InGameTacticsPanel({
    currentTactics,
    onUpdate,
    onSubstitution,
    disabled = false,
}: InGameTacticsPanelProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedTab, setSelectedTab] = useState<"quick" | "advanced">("quick");

    const handleQuickChange = async (
        key: keyof TacticsConfig,
        value: TacticsConfig[keyof TacticsConfig]
    ) => {
        if (disabled || isLoading) return;

        setIsLoading(true);
        try {
            await onUpdate({ [key]: value });
        } finally {
            setIsLoading(false);
        }
    };

    const quickTactics = [
        {
            label: "🛡️ Defender",
            tactics: { mentality: "defensive", marking: "zonal" },
            description: "Fechar o jogo e segurar o resultado",
        },
        {
            label: "⚖️ Equilibrado",
            tactics: { mentality: "normal", style: "balanced" },
            description: "Tática balanceada",
        },
        {
            label: "⚔️ Atacar",
            tactics: { mentality: "attacking", style: "pressing" },
            description: "Pressionar e buscar o gol",
        },
        {
            label: "🔥 All-In",
            tactics: { mentality: "ultra_attacking", marking: "pressing_high" },
            description: "Tudo ou nada!",
        },
    ];

    return (
        <>
            {!isExpanded && (
                <button
                    onClick={() => setIsExpanded(true)}
                    disabled={disabled}
                    className="fixed right-6 bottom-24 bg-emerald-600 hover:bg-emerald-500 text-white p-4 rounded-full shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-110 z-50"
                    title="Abrir Controles Táticos"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path d="M12 2v20M2 12h20" />
                    </svg>
                </button>
            )}

            {isExpanded && (
                <div className="fixed right-0 top-0 bottom-0 w-96 bg-slate-900 border-l border-slate-800 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
                    <div className="bg-slate-950 border-b border-slate-800 p-4 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-white">⚙️ Controles Táticos</h3>
                        <button
                            onClick={() => setIsExpanded(false)}
                            className="text-slate-400 hover:text-white transition-colors"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <path d="M18 6 6 18M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="flex border-b border-slate-800">
                        <button
                            onClick={() => setSelectedTab("quick")}
                            className={`flex-1 py-3 font-medium transition-colors ${selectedTab === "quick"
                                ? "text-emerald-400 border-b-2 border-emerald-400"
                                : "text-slate-400 hover:text-slate-300"
                                }`}
                        >
                            Táticas Rápidas
                        </button>
                        <button
                            onClick={() => setSelectedTab("advanced")}
                            className={`flex-1 py-3 font-medium transition-colors ${selectedTab === "advanced"
                                ? "text-emerald-400 border-b-2 border-emerald-400"
                                : "text-slate-400 hover:text-slate-300"
                                }`}
                        >
                            Avançado
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4">
                        {selectedTab === "quick" && (
                            <div className="space-y-3">
                                {quickTactics.map((preset, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleQuickChange("mentality", preset.tactics.mentality as any)}
                                        disabled={disabled || isLoading}
                                        className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg p-4 text-left transition-all disabled:opacity-50"
                                    >
                                        <div className="font-bold text-white mb-1">
                                            {preset.label}
                                        </div>
                                        <div className="text-sm text-slate-400">
                                            {preset.description}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {selectedTab === "advanced" && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">
                                        Mentalidade
                                    </label>
                                    <select
                                        value={currentTactics.mentality}
                                        onChange={(e) =>
                                            handleQuickChange("mentality", e.target.value as any)
                                        }
                                        disabled={disabled || isLoading}
                                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white disabled:opacity-50"
                                    >
                                        <option value="ultra_defensive">Ultra Defensivo</option>
                                        <option value="defensive">Defensivo</option>
                                        <option value="normal">Normal</option>
                                        <option value="attacking">Atacante</option>
                                        <option value="ultra_attacking">Ultra Atacante</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">
                                        Estilo
                                    </label>
                                    <select
                                        value={currentTactics.style}
                                        onChange={(e) => handleQuickChange("style", e.target.value as any)}
                                        disabled={disabled || isLoading}
                                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white disabled:opacity-50"
                                    >
                                        <option value="possession">Posse de Bola</option>
                                        <option value="counter_attack">Contra-Ataque</option>
                                        <option value="balanced">Equilibrado</option>
                                        <option value="long_ball">Bola Longa</option>
                                        <option value="pressing">Pressão</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">
                                        Marcação
                                    </label>
                                    <select
                                        value={currentTactics.marking}
                                        onChange={(e) => handleQuickChange("marking", e.target.value as any)}
                                        disabled={disabled || isLoading}
                                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white disabled:opacity-50"
                                    >
                                        <option value="man_to_man">Homem a Homem</option>
                                        <option value="zonal">Zonal</option>
                                        <option value="mixed">Mista</option>
                                        <option value="pressing_high">Pressão Alta</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">
                                        Passes
                                    </label>
                                    <select
                                        value={currentTactics.passingDirectness}
                                        onChange={(e) => handleQuickChange("passingDirectness", e.target.value as any)}
                                        disabled={disabled || isLoading}
                                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white disabled:opacity-50"
                                    >
                                        <option value="short">Curtos</option>
                                        <option value="mixed">Mistos</option>
                                        <option value="direct">Diretos</option>
                                        <option value="long">Longos</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-slate-800 space-y-2">
                        <button
                            onClick={onSubstitution}
                            disabled={disabled || isLoading}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-bold disabled:opacity-50 transition-colors"
                        >
                            🔄 Realizar Substituição
                        </button>
                    </div>

                    {isLoading && <LoadingOverlay message="" />}
                </div>
            )}
        </>
    );
}