import { MatchState } from "../../../domain/enums";

interface MatchScoreboardProps {
    homeTeamName: string;
    awayTeamName: string;
    homeScore: number;
    awayScore: number;
    currentMinute: number;
    state: MatchState;
    isLoading: boolean;
    error: string | null;
    onPause: () => void;
    onResume: () => void;
    onSimulateToEnd: () => void;
    onReset: () => void;
}

export function MatchScoreboard({
    homeTeamName,
    awayTeamName,
    homeScore,
    awayScore,
    currentMinute,
    state,
    isLoading,
    error,
    onPause,
    onResume,
    onSimulateToEnd,
    onReset
}: MatchScoreboardProps) {
    return (
        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800 mb-6">
            <div className="flex items-center justify-between mb-4">
                <div className="text-center flex-1">
                    <h3 className="text-lg font-semibold mb-2">{homeTeamName}</h3>
                    <div className="text-5xl font-bold">{homeScore}</div>
                </div>

                <div className="px-8">
                    <div className="text-2xl font-bold text-slate-500">VS</div>
                    <div className="text-sm text-slate-400 mt-2">
                        {currentMinute}'
                    </div>
                </div>

                <div className="text-center flex-1">
                    <h3 className="text-lg font-semibold mb-2">{awayTeamName}</h3>
                    <div className="text-5xl font-bold">{awayScore}</div>
                </div>
            </div>

            <div className="flex gap-3 justify-center">
                {state === MatchState.PLAYING && (
                    <button
                        onClick={onPause}
                        className="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 rounded-lg font-medium transition-colors"
                    >
                        ⏸ Pausar
                    </button>
                )}

                {state === MatchState.PAUSED && (
                    <button
                        onClick={onResume}
                        className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-medium transition-colors"
                    >
                        ▶ Continuar
                    </button>
                )}

                {state !== MatchState.FINISHED && (
                    <button
                        onClick={onSimulateToEnd}
                        disabled={isLoading}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        ⏩ Simular Até o Fim
                    </button>
                )}

                {state === MatchState.FINISHED && (
                    <button
                        onClick={onReset}
                        className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors"
                    >
                        🔄 Nova Simulação
                    </button>
                )}
            </div>

            {state === MatchState.FINISHED && (
                <div className="mt-4 text-center">
                    <div className="text-emerald-400 font-bold text-lg">
                        🏁 FIM DE JOGO
                    </div>
                </div>
            )}

            {isLoading && (
                <div className="mt-4 text-center text-slate-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
                    <p className="mt-2">Processando...</p>
                </div>
            )}

            {error && (
                <div className="mt-4 text-center text-red-400">
                    ⚠️ {error}
                </div>
            )}
        </div>
    );
}