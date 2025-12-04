import { useState } from "react";

function TrainingControl({ currentFocus, onUpdate }: { currentFocus: string, onUpdate: () => void }) {
    const [saving, setSaving] = useState(false);

    const handleFocusChange = async (focus: string) => {
        setSaving(true);
        await window.electronAPI.updateTrainingFocus(focus);
        onUpdate();
        setSaving(false);
    };

    const focusOptions = [
        { id: "technical", label: "Técnico", icon: "⚽" },
        { id: "tactical", label: "Tático", icon: "📋" },
        { id: "physical", label: "Físico", icon: "💪" },
        { id: "rest", label: "Descanso", icon: "🛌" },
    ];

    return (
        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800 mt-6">
            <h3 className="text-sm font-medium text-slate-400 mb-4">Foco do Treino (Próximo Dia)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {focusOptions.map((opt) => (
                    <button
                        key={opt.id}
                        onClick={() => handleFocusChange(opt.id)}
                        disabled={saving}
                        className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${currentFocus === opt.id
                            ? "bg-emerald-600/20 border-emerald-500 text-white"
                            : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
                            }`}
                    >
                        <span className="text-2xl">{opt.icon}</span>
                        <span className="text-sm font-medium">{opt.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

export default TrainingControl;