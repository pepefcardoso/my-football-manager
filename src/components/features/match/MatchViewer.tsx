import { useMatchSimulation } from "../../../hooks/useMatchSimulation";
import { MatchScoreboard } from "./MatchScoreboard";
import { MatchEvents } from "./MatchEvents";

interface MatchViewerProps {
  matchId: number;
  homeTeamName: string;
  awayTeamName: string;
}


export function MatchViewer({
  matchId,
  homeTeamName,
  awayTeamName,
}: MatchViewerProps) {
  const {
    simulation,
    startMatch,
    pauseMatch,
    resumeMatch,
    simulateToEnd,
    reset,
  } = useMatchSimulation();

  const handleStart = () => {
    startMatch(matchId);
  };

  if (!simulation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-8">
        <div className="bg-slate-900 rounded-lg p-8 border border-slate-800 max-w-2xl w-full">
          <h2 className="text-2xl font-bold mb-4">
            {homeTeamName} vs {awayTeamName}
          </h2>
          <button
            type="button"
            onClick={handleStart}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            aria-label={`Iniciar partida entre ${homeTeamName} e ${awayTeamName}`}
          >
            Iniciar Partida
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <MatchScoreboard
        homeTeamName={homeTeamName}
        awayTeamName={awayTeamName}
        homeScore={simulation.homeScore}
        awayScore={simulation.awayScore}
        currentMinute={simulation.currentMinute}
        state={simulation.state}
        isLoading={simulation.isLoading}
        error={simulation.error}
        onPause={pauseMatch}
        onResume={resumeMatch}
        onSimulateToEnd={simulateToEnd}
        onReset={reset}
      />

      <MatchEvents events={simulation.events} />
    </div>
  );
}
