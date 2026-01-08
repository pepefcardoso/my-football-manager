import React from "react";
import { Trophy } from "lucide-react";
import { CompetitionView } from "../../hooks/useCompetitionData";

interface CompetitionHeaderProps {
  name: string;
  activeView: CompetitionView;
  onViewChange: (view: CompetitionView) => void;
}

export const CompetitionHeader: React.FC<CompetitionHeaderProps> = ({
  name,
  activeView,
  onViewChange,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between bg-background-secondary p-6 rounded-lg border border-background-tertiary shadow-sm flex-none">
      <div className="flex items-center mb-4 md:mb-0">
        <div className="p-3 bg-primary/10 rounded-full mr-4 text-primary">
          <Trophy size={32} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{name}</h1>
          <p className="text-text-secondary text-sm">Temporada Atual</p>
        </div>
      </div>

      <div className="flex space-x-2 bg-background-tertiary/30 p-1 rounded-lg">
        {(["TABLE", "RESULTS"] as const).map((view) => (
          <button
            key={view}
            onClick={() => onViewChange(view)}
            className={`px-4 py-2 rounded text-sm font-medium transition-all ${
              activeView === view
                ? "bg-primary text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary hover:bg-white/5"
            }`}
          >
            {view === "TABLE" ? "Classificação" : "Resultados"}
          </button>
        ))}
      </div>
    </div>
  );
};