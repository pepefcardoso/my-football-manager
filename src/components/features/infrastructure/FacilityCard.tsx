import React, { useState } from "react";

interface FacilityCardProps {
    type: string;
    title: string;
    icon: string;
    level: number;
    description: string;
    bonusText: string;
    upgradeCost: number;
    isMaxLevel: boolean;
    isLoading: boolean;
    canAfford: boolean;
    onUpgrade: (amount?: number) => void;
    onDowngrade: () => void;
    unitCost?: number;
}

export const FacilityCard: React.FC<FacilityCardProps> = ({
    type,
    title,
    icon,
    level,
    description,
    bonusText,
    upgradeCost: initialUpgradeCost,
    isMaxLevel,
    isLoading,
    canAfford: initialCanAfford,
    onUpgrade,
    onDowngrade,
    unitCost
}) => {
    const isStadiumCapacity = type === "stadium_capacity";
    const [expansionAmount, setExpansionAmount] = useState<number>(1000);

    const dynamicCost = (isStadiumCapacity && unitCost)
        ? expansionAmount * unitCost
        : initialUpgradeCost;

    const isDisabled = isLoading || !initialCanAfford;

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 flex flex-col justify-between hover:border-slate-700 transition-colors">
            <div>
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl bg-slate-800 p-2 rounded-lg">{icon}</span>
                        <div>
                            <h3 className="text-lg font-bold text-white leading-tight">{title}</h3>
                            <p className="text-xs text-slate-500 mt-1">{description}</p>
                        </div>
                    </div>

                    {isStadiumCapacity ? (
                        <span className="bg-emerald-900/30 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded text-xs font-mono font-bold">
                            {level.toLocaleString()} Lugares
                        </span>
                    ) : (
                        <span className="bg-slate-800 text-slate-300 px-2 py-1 rounded text-xs font-mono">
                            Nv. {level}
                        </span>
                    )}
                </div>

                <div className="mb-6 bg-slate-950/50 p-3 rounded border border-slate-800/50">
                    <p className="text-xs text-slate-400 mb-1 uppercase tracking-wider font-semibold">Próximo Nível:</p>
                    <p className="text-emerald-400 font-medium text-sm">{bonusText}</p>
                </div>

                {isStadiumCapacity && !isMaxLevel && (
                    <div className="mb-4">
                        <label className="text-xs text-slate-400 mb-1 block">Quantidade de Assentos:</label>
                        <div className="flex gap-2">
                            <input
                                type="number"
                                min="100"
                                step="100"
                                value={expansionAmount}
                                onChange={(e) => setExpansionAmount(Math.max(100, parseInt(e.target.value) || 0))}
                                className="bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white text-sm w-full focus:outline-none focus:border-emerald-500 font-mono"
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-1 text-right">
                            Estimativa: ~{Math.ceil(expansionAmount / 2000 * 10)} dias
                        </p>
                    </div>
                )}
            </div>

            <div className="space-y-3 mt-auto">
                {!isMaxLevel ? (
                    <button
                        onClick={() => onUpgrade(isStadiumCapacity ? expansionAmount : 1)}
                        disabled={isDisabled}
                        className={`w-full py-3 rounded text-sm font-bold transition-all flex justify-between px-4 items-center group ${isDisabled
                                ? "bg-slate-800 text-slate-500 cursor-not-allowed opacity-75"
                                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20"
                            }`}
                    >
                        <span>{isStadiumCapacity ? "Expandir" : "Melhorar"}</span>
                        <span className={`px-2 py-0.5 rounded font-mono ${isDisabled ? 'bg-black/10' : 'bg-black/20 text-emerald-50 group-hover:bg-black/30'}`}>
                            €{dynamicCost.toLocaleString()}
                        </span>
                    </button>
                ) : (
                    <div className="w-full py-2.5 bg-slate-800 text-emerald-500 text-center text-sm font-bold rounded border border-emerald-500/30">
                        Nível Máximo
                    </div>
                )}

                {!isStadiumCapacity && level > 0 && (
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