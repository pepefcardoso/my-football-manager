import { useMatchSimulation } from "../hooks/useMatchSimulation";
import { MatchState } from "../engine/MatchEngine";

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
    const { simulation, startMatch, pauseMatch, resumeMatch, simulateToEnd, reset } =
        useMatchSimulation();

    const handleStart = () => {
        startMatch(matchId);
    };

    const handleSimulateToEnd = () => {
        simulateToEnd();
    };

    if (!simulation) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-8">
                <div className="bg-slate-900 rounded-lg p-8 border border-slate-800 max-w-2xl w-full">
                    <h2 className="text-2xl font-bold mb-4">
                        {homeTeamName} vs {awayTeamName}
                    </h2>
                    <button
                        onClick={handleStart}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-medium transition-colors"
                    >
                        Iniciar Partida
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white p-8">
            <div className="bg-slate-900 rounded-lg p-6 border border-slate-800 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="text-center flex-1">
                        <h3 className="text-lg font-semibold mb-2">{homeTeamName}</h3>
                        <div className="text-5xl font-bold">{simulation.homeScore}</div>
                    </div>

                    <div className="px-8">
                        <div className="text-2xl font-bold text-slate-500">VS</div>
                        <div className="text-sm text-slate-400 mt-2">
                            {simulation.currentMinute}'
                        </div>
                    </div>

                    <div className="text-center flex-1">
                        <h3 className="text-lg font-semibold mb-2">{awayTeamName}</h3>
                        <div className="text-5xl font-bold">{simulation.awayScore}</div>
                    </div>
                </div>

                <div className="flex gap-3 justify-center">
                    {simulation.state === MatchState.PLAYING && (
                        <button
                            onClick={pauseMatch}
                            className="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 rounded-lg font-medium transition-colors"
                        >
                            ⏸ Pausar
                        </button>
                    )}

                    {simulation.state === MatchState.PAUSED && (
                        <button
                            onClick={resumeMatch}
                            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-medium transition-colors"
                        >
                            ▶ Continuar
                        </button>
                    )}

                    {simulation.state !== MatchState.FINISHED && (
                        <button
                            onClick={handleSimulateToEnd}
                            disabled={simulation.isLoading}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            ⏩ Simular Até o Fim
                        </button>
                    )}

                    {simulation.state === MatchState.FINISHED && (
                        <button
                            onClick={reset}
                            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors"
                        >
                            🔄 Nova Simulação
                        </button>
                    )}
                </div>

                {simulation.state === MatchState.FINISHED && (
                    <div className="mt-4 text-center">
                        <div className="text-emerald-400 font-bold text-lg">
                            🏁 FIM DE JOGO
                        </div>
                    </div>
                )}

                {simulation.isLoading && (
                    <div className="mt-4 text-center text-slate-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
                        <p className="mt-2">Processando...</p>
                    </div>
                )}

                {simulation.error && (
                    <div className="mt-4 text-center text-red-400">
                        ⚠️ {simulation.error}
                    </div>
                )}
            </div>

            <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
                <h3 className="text-xl font-semibold mb-4">📋 Narrativa da Partida</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {simulation.events.length === 0 ? (
                        <p className="text-slate-500 italic">Aguardando eventos...</p>
                    ) : (
                        simulation.events.map((event, index) => (
                            <div
                                key={index}
                                className={`p-3 rounded-lg border ${getEventStyle(event.type)}`}
                            >
                                <div className="flex items-start gap-3">
                                    <span className="text-slate-400 font-mono text-sm">
                                        {event.minute}'
                                    </span>
                                    <span className="flex-1">{event.description}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

function getEventStyle(eventType: string): string {
    switch (eventType) {
        case "goal":
            return "bg-emerald-500/20 border-emerald-500/50 text-emerald-100";
        case "yellow_card":
            return "bg-yellow-500/20 border-yellow-500/50 text-yellow-100";
        case "red_card":
            return "bg-red-500/20 border-red-500/50 text-red-100";
        case "injury":
            return "bg-orange-500/20 border-orange-500/50 text-orange-100";
        case "save":
            return "bg-blue-500/20 border-blue-500/50 text-blue-100";
        default:
            return "bg-slate-800 border-slate-700 text-slate-300";
    }
}