import { useState } from "react";
import { useMatchSimulation } from "../../../hooks/useMatchSimulation";
import { MatchScoreboard } from "./MatchScoreboard";
import { MatchEvents } from "./MatchEvents";
import { InGameTacticsPanel } from "./pre-game/InGameTacticsPanel";
import { SubstitutionModal } from "./pre-game/SubstitutionModal";
import type { TacticsConfig } from "../../../domain/models";
import { useGameStore } from "../../../store/useGameStore";
import { Logger } from "../../../lib/Logger";

const logger = new Logger("MatchViewer");

interface MatchViewerProps {
  matchId: number;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamId: number;
  awayTeamId: number;
}

export function MatchViewer({
  matchId,
  homeTeamName,
  awayTeamName,
  homeTeamId,
  awayTeamId,
}: MatchViewerProps) {
  const {
    simulation,
    startMatch,
    pauseMatch,
    resumeMatch,
    simulateToEnd,
    reset,
    speed,
    setSpeed,
  } = useMatchSimulation();

  const userTeam = useGameStore((state) => state.userTeam);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);

  const [currentTactics, setCurrentTactics] = useState<TacticsConfig>({
    style: "balanced",
    marking: "man_to_man",
    mentality: "normal",
    passingDirectness: "mixed"
  });

  const isUserHome = userTeam?.id === homeTeamId;
  const isUserAway = userTeam?.id === awayTeamId;
  const isUserPlaying = isUserHome || isUserAway;

  const canControl = isUserPlaying && simulation?.state !== "finished";

  const handleStart = () => {
    startMatch(matchId);
  };

  const handleTacticsUpdate = async (newTactics: Partial<TacticsConfig>) => {
    if (!isUserPlaying) return;

    try {
      const result = await window.electronAPI.match.updateLiveTactics(
        matchId,
        isUserHome,
        newTactics
      );

      if (result.success) {
        setCurrentTactics(prev => ({ ...prev, ...newTactics }));
        logger.info("Táticas atualizadas com sucesso via UI");
      } else {
        alert(`Erro ao atualizar táticas: ${result.message}`);
      }
    } catch (error) {
      logger.error("Erro crítico ao atualizar táticas:", error);
    }
  };

  const handleOpenSubstitution = () => {
    if (simulation?.state === "playing") {
      pauseMatch();
    }
    setIsSubModalOpen(true);
  };

  const handleConfirmSubstitution = async (playerOutId: number, playerInId: number) => {
    const result = await window.electronAPI.match.substitutePlayer(
      matchId,
      isUserHome,
      playerOutId,
      playerInId
    );

    if (result.success) {
      setIsSubModalOpen(false);
    } else {
      throw new Error(result.message);
    }
  };

  if (!simulation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-8 animate-in fade-in">
        <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800 max-w-2xl w-full shadow-2xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black mb-2 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              DIA DE JOGO
            </h2>
            <div className="text-xl text-slate-300 flex items-center justify-center gap-4">
              <span className="font-bold">{homeTeamName}</span>
              <span className="text-slate-600 text-sm">VS</span>
              <span className="font-bold">{awayTeamName}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleStart}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold text-lg transition-all transform hover:scale-[1.02] shadow-lg shadow-emerald-900/20"
          >
            ⚽ Iniciar Partida
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-950 text-white flex flex-col overflow-hidden relative">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <MatchScoreboard
          homeTeamName={homeTeamName}
          awayTeamName={awayTeamName}
          homeScore={simulation.homeScore}
          awayScore={simulation.awayScore}
          currentMinute={simulation.currentMinute}
          state={simulation.state as any}
          isLoading={simulation.isLoading}
          error={simulation.error}
          speed={speed}
          onSpeedChange={setSpeed}
          onPause={pauseMatch}
          onResume={resumeMatch}
          onSimulateToEnd={simulateToEnd}
          onReset={reset}
        />

        <MatchEvents events={simulation.events} />
      </div>

      {canControl && (
        <InGameTacticsPanel
          matchId={matchId}
          isHome={isUserHome}
          currentTactics={currentTactics}
          onUpdate={handleTacticsUpdate}
          onSubstitution={handleOpenSubstitution}
          disabled={simulation.state === "finished"}
        />
      )}

      {isSubModalOpen && userTeam && (
        <SubstitutionModal
          matchId={matchId}
          teamId={userTeam.id}
          isHome={isUserHome}
          onClose={() => setIsSubModalOpen(false)}
          onConfirm={handleConfirmSubstitution}
        />
      )}
    </div>
  );
}