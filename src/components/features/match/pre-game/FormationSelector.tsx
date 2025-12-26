import type { Formation } from "../../../../domain/models";

interface FormationSelectorProps {
    formation: Formation;
    onChange: (formation: Formation) => void;
}

const FORMATIONS: Formation[] = [
    "4-4-2", "4-3-3", "3-5-2", "4-2-3-1",
    "5-3-2", "3-4-3", "4-1-4-1", "4-5-1",
];

export function FormationSelector({ formation, onChange }: FormationSelectorProps) {
    return (
        <div className="mb-6">
            <label className="block text-sm font-medium text-slate-400 mb-3">
                Formação Tática
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {FORMATIONS.map((f) => (
                    <button
                        key={f}
                        onClick={() => onChange(f)}
                        className={`
                            px-4 py-3 rounded-lg font-bold text-lg transition-all
                            ${formation === f
                                ? "bg-primary text-white ring-2 ring-primary-50"
                                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                            }
                        `}
                    >
                        {f}
                    </button>
                ))}
            </div>
        </div>
    );
}