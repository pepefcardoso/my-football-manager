import { useState, useCallback } from "react";

interface TrainingControlProps {
  currentFocus: string;
  onUpdate: () => void;
}

interface FocusOption {
  id: string;
  label: string;
  icon: string;
  description?: string;
}

const FOCUS_OPTIONS: readonly FocusOption[] = [
  {
    id: "technical",
    label: "Técnico",
    icon: "⚽",
    description: "Melhora técnica individual e fundamentos",
  },
  {
    id: "tactical",
    label: "Tático",
    icon: "📋",
    description: "Trabalho de posicionamento e leitura de jogo",
  },
  {
    id: "physical",
    label: "Físico",
    icon: "💪",
    description: "Condicionamento físico e resistência",
  },
  {
    id: "rest",
    label: "Descanso",
    icon: "🛌",
    description: "Recuperação e regeneração",
  },
] as const;

function TrainingControl({ currentFocus, onUpdate }: TrainingControlProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFocusChange = useCallback(
    async (focus: string) => {
      if (saving || focus === currentFocus) return;

      setSaving(true);
      setError(null);

      try {
        const success = await window.electronAPI.updateTrainingFocus(focus);

        if (success) {
          onUpdate();
        } else {
          setError("Não foi possível atualizar o foco do treino.");
        }
      } catch (err) {
        console.error("Erro ao atualizar foco de treino:", err);
        setError("Erro ao atualizar. Tente novamente.");
      } finally {
        setSaving(false);
      }
    },
    [saving, currentFocus, onUpdate]
  );

  return (
    <section
      className="bg-slate-900 rounded-lg p-6 border border-slate-800 mt-6"
      aria-labelledby="training-focus-heading"
    >
      <div className="flex items-center justify-between mb-4">
        <h3
          id="training-focus-heading"
          className="text-sm font-medium text-slate-400"
        >
          Foco do Treino (Próximo Dia)
        </h3>
        {saving && (
          <span
            className="text-xs text-emerald-400 flex items-center gap-2"
            role="status"
            aria-live="polite"
          >
            <span className="inline-block w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            A guardar...
          </span>
        )}
      </div>

      {error && (
        <div
          className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm"
          role="alert"
          aria-live="assertive"
        >
          {error}
        </div>
      )}

      <div
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
        role="radiogroup"
        aria-label="Opções de foco de treino"
      >
        {FOCUS_OPTIONS.map((option) => {
          const isSelected = currentFocus === option.id;
          const isDisabled = saving;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleFocusChange(option.id)}
              disabled={isDisabled}
              role="radio"
              aria-checked={isSelected}
              aria-label={`${option.label}: ${option.description}`}
              title={option.description}
              className={`
                                p-3 rounded-lg border flex flex-col items-center gap-2 
                                transition-all duration-200
                                disabled:opacity-50 disabled:cursor-not-allowed
                                focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900
                                ${
                                  isSelected
                                    ? "bg-emerald-600/20 border-emerald-500 text-white ring-2 ring-emerald-500/50 shadow-lg shadow-emerald-500/20"
                                    : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:border-slate-600"
                                }
                            `}
            >
              <span className="text-2xl" aria-hidden="true">
                {option.icon}
              </span>
              <span className="text-sm font-medium">{option.label}</span>
              {isSelected && (
                <span className="sr-only" aria-live="polite">
                  Selecionado
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-800">
        <p className="text-xs text-slate-500">
          {FOCUS_OPTIONS.find((opt) => opt.id === currentFocus)?.description ||
            "Selecione um foco para o treino de amanhã"}
        </p>
      </div>
    </section>
  );
}

export default TrainingControl;
