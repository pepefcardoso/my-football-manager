import { useState } from "react";
import type { ScoutingSlot } from "../../../domain/models";
import { Modal } from "../../common/Modal";

interface ScoutingConfigModalProps {
    slotNumber: number;
    onSave: (config: ScoutingSlot['filters']) => void;
    onClose: () => void;
}

export function ScoutingConfigModal({ slotNumber, onSave, onClose }: ScoutingConfigModalProps) {
    const [filters, setFilters] = useState<ScoutingSlot['filters']>({
        country: "Global",
        position: "FW",
        ageGroup: "young",
        contractStatus: "any",
        minOverall: 60,
    });

    const handleSubmit = () => {
        onSave(filters);
    };

    const footerButtons = (
        <>
            <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
                Cancelar
            </button>
            <button
                type="button"
                onClick={handleSubmit}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded transition-colors shadow-lg shadow-emerald-900/20"
            >
                Iniciar Busca
            </button>
        </>
    );

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title={`Configurar Slot #${slotNumber}`}
            subtitle="Defina os critérios para o olheiro buscar talentos."
            size="sm"
            footer={footerButtons}
        >
            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Posição Foco</label>
                    <select
                        className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-shadow"
                        value={filters.position}
                        onChange={e => setFilters({ ...filters, position: e.target.value })}
                    >
                        <option value="GK">Guarda-Redes (GK)</option>
                        <option value="DF">Defesa (DF)</option>
                        <option value="MF">Meio-Campo (MF)</option>
                        <option value="FW">Ataque (FW)</option>
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Região / País</label>
                    <select
                        className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-shadow"
                        value={filters.country}
                        onChange={e => setFilters({ ...filters, country: e.target.value })}
                    >
                        <option value="Global">Global (Mundo Todo)</option>
                        <option value="BRA">Brasil</option>
                        <option value="ARG">Argentina</option>
                        <option value="ESP">Espanha</option>
                        <option value="ENG">Inglaterra</option>
                        <option value="FRA">França</option>
                        <option value="ITA">Itália</option>
                        <option value="GER">Alemanha</option>
                        <option value="POR">Portugal</option>
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Faixa Etária</label>
                    <select
                        className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-shadow"
                        value={filters.ageGroup}
                        onChange={e => setFilters({ ...filters, ageGroup: e.target.value as any })}
                    >
                        <option value="young">Jovens Promessas (&lt; 23 anos)</option>
                        <option value="prime">Auge (24-29 anos)</option>
                        <option value="veteran">Veteranos (&gt; 30 anos)</option>
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Overall Mínimo</label>
                    <div className="flex items-center gap-3">
                        <input
                            type="range"
                            min="50"
                            max="90"
                            value={filters.minOverall || 60}
                            onChange={e => setFilters({ ...filters, minOverall: parseInt(e.target.value) })}
                            className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-white font-mono bg-slate-800 px-2 py-1 rounded border border-slate-700 text-xs">
                            {filters.minOverall || 60}
                        </span>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Situação Contratual</label>
                    <select
                        className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white outline-none transition-shadow focus:ring-2 focus:ring-emerald-500"
                        value={filters.contractStatus}
                        onChange={e => setFilters({ ...filters, contractStatus: e.target.value as any })}
                    >
                        <option value="any">Qualquer Situação</option>
                        <option value="free_agent">Apenas Agentes Livres</option>
                    </select>
                </div>
            </div>
        </Modal>
    );
}