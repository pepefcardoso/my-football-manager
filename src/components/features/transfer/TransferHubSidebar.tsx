import { useState } from "react";
import { useScoutingNetwork } from "../../../hooks/transfer/useScoutingNetwork";
import { ScoutingSlotCard } from "../scouting/ScoutingSlotCard";
import { ScoutingConfigModal } from "../scouting/ScoutingConfigModal";

interface TransferHubSidebarProps {
    teamId: number;
}

export function TransferHubSidebar({ teamId }: TransferHubSidebarProps) {
    const [configuringSlot, setConfiguringSlot] = useState<number | null>(null);
    const { slots, saveSlotConfig, stopSlot } = useScoutingNetwork(teamId);

    return (
        <>
            {configuringSlot !== null && (
                <ScoutingConfigModal
                    slotNumber={configuringSlot}
                    onSave={(filters) => {
                        saveSlotConfig(configuringSlot, filters, slots);
                        setConfiguringSlot(null);
                    }}
                    onClose={() => setConfiguringSlot(null)}
                />
            )}

            <aside className="w-1/4 min-w-[300px] border-r border-slate-800 p-6 overflow-y-auto bg-slate-950/50 h-full">
                <h2 className="text-xl font-light mb-6 flex items-center gap-2 text-white">
                    <span className="text-2xl">📡</span> Rede de Olheiros
                </h2>

                <div className="space-y-4">
                    {slots.length > 0 ? (
                        slots.map((slot) => (
                            <ScoutingSlotCard
                                key={slot.slotNumber}
                                slot={slot}
                                onConfigure={setConfiguringSlot}
                                onStop={(slotNum) => stopSlot(slotNum, slots)}
                            />
                        ))
                    ) : (
                        <div className="text-slate-500 text-sm text-center">A carregar slots...</div>
                    )}
                </div>

                <div className="mt-8 p-4 bg-blue-900/10 border border-blue-900/30 rounded text-xs text-blue-200">
                    <p className="font-bold mb-1">ℹ️ Dica de Scouting</p>
                    <p>Olheiros com melhores atributos encontram jogadores mais rápido e com mais precisão.</p>
                </div>
            </aside>
        </>
    );
}