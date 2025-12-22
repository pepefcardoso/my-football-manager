import React from "react";

interface FacilityCardProps {
    title: string;
    icon: string;
    level: number;
    description: string;
    bonusText: string;
    upgradeCost: number;
    isMaxLevel: boolean;
    isLoading: boolean;
    canAfford: boolean;
    onUpgrade: () => void;
    onDowngrade: () => void;
}

export const FacilityCard: React.FC<FacilityCardProps> = ({
    title,
    icon,
    level,
    description,
    bonusText,
    upgradeCost,
    isMaxLevel,
    isLoading,
    canAfford,
    onUpgrade,
    onDowngrade
}) => {
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 flex flex-col justify-between">
            <div>
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">{icon}</span>
                        <div>
                            <h3 className="text-lg font-semibold text-white">{title}</h3>
                            <p className="text-xs text-slate-500">{description}</p>
                        </div>
                    </div>
                    <span className="bg-slate-800 text-slate-300 px-2 py-1 rounded text-xs font-mono">
                        Lv. {level}
                    </span>
                </div>

                <div className="mb-6">
                    <p className="text-sm text-slate-400 mb-1">Bônus Atual:</p>
                    <p className="text-emerald-400 font-medium text-sm">{bonusText}</p>
                </div>
            </div>

            <div className="space-y-3">
                {!isMaxLevel ? (
                    <button
                        onClick={onUpgrade}
                        disabled={isLoading || !canAfford}
                        className={`w-full py-2.5 rounded text-sm font-bold transition-all flex justify-between px-4 ${canAfford
                                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20"
                                : "bg-slate-800 text-slate-500 cursor-not-allowed"
                            }`}
                    >
                        <span>Melhorar</span>
                        <span>€{upgradeCost.toLocaleString()}</span>
                    </button>
                ) : (
                    <div className="w-full py-2.5 bg-slate-800 text-emerald-500 text-center text-sm font-bold rounded border border-emerald-500/30">
                        Nível Máximo
                    </div>
                )}

                {level > 0 && (
                    <button
                        onClick={() => {
                            if (confirm("Reduzir nível? Isso economizará manutenção mas perderá bônus imediatamente.")) {
                                onDowngrade();
                            }
                        }}
                        disabled={isLoading}
                        className="w-full py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded transition-colors"
                    >
                        Reduzir Nível (Downgrade)
                    </button>
                )}
            </div>
        </div>
    );
};