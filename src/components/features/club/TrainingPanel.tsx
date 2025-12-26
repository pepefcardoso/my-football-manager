import { TrainingFocus } from "../../../domain/enums";

interface TrainingPanelProps {
    currentFocus: string | null | undefined;
    onUpdate: (focus: string) => void;
}

export function TrainingPanel({ currentFocus, onUpdate }: TrainingPanelProps) {
    const trainingOptions = [
        { id: TrainingFocus.TECHNICAL, label: "⚽ Técnico", color: "emerald" },
        { id: TrainingFocus.TACTICAL, label: "📋 Tático", color: "blue" },
        { id: TrainingFocus.PHYSICAL, label: "💪 Físico", color: "orange" },
        { id: TrainingFocus.REST, label: "🛌 Descanso", color: "indigo" },
    ];

    return (
        <div className="col-span-1 md:col-span-12 lg:col-span-4 bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-6">
                <span className="text-2xl">🏋️</span>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Foco Treino</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {trainingOptions.map((option) => {
                    const isActive = currentFocus === option.id;
                    return (
                        <button
                            key={option.id}
                            onClick={() => onUpdate(option.id)}
                            className={`
                                p-4 rounded-xl border transition-all text-xs font-bold flex flex-col items-center justify-center gap-2 h-24 relative
                                ${isActive
                                    ? `bg-${option.color}-600/20 border-${option.color}-500 text-white shadow-lg`
                                    : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800"
                                }
                            `}
                        >
                            <span className="text-2xl">{option.label.split(" ")[0]}</span>
                            <span>{option.label.split(" ")[1]}</span>
                            {isActive && <span className="w-2 h-2 rounded-full bg-emerald-500 absolute top-2 right-2 shadow-glow"></span>}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}