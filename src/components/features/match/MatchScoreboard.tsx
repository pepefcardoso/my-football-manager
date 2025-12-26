import { MatchState } from "../../../domain/enums";
import { LoadingSpinner } from "../../common/Loading";

interface MatchScoreboardProps {
    homeTeamName: string;
    awayTeamName: string;
    homeScore: number;
    awayScore: number;
    currentMinute: number;
    state: MatchState;
    isLoading: boolean;
    error: string | null;
    speed: number;
    onSpeedChange: (speed: number) => void;
    onPause: () => void;
    onResume: () => void;
    onSimulateToEnd: () => void;
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
    speed,
    onSpeedChange,
    onPause,
    onResume,
    onSimulateToEnd,
}: MatchScoreboardProps) {
    const isPlaying = state === MatchState.PLAYING;
    const isPaused = state === MatchState.PAUSED;
    const isFinished = state === MatchState.FINISHED;

    return (
        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800 mb-6 shadow-xl">

            <div className="flex items-center justify-between mb-8">
                <div className="text-center flex-1">
                    <h3 className="text-xl font-light text-slate-300 mb-2 uppercase tracking-wide">{homeTeamName}</h3>
                    <div className="text-6xl font-black text-white tracking-tighter">{homeScore}</div>
                </div>

                <div className="px-8 flex flex-col items-center">
                    <div className="text-sm font-bold text-slate-500 mb-2 uppercase tracking-widest">Tempo de Jogo</div>
                    <div className={`text-4xl font-mono font-bold px-6 py-2 rounded-lg border border-slate-800 ${isFinished ? "text-slate-500 bg-slate-950" : "text-emerald-400 bg-slate-950/50"}`}>
                        {currentMinute}'
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                        {isFinished ? "ENCERRADO" : isPaused ? "PAUSADO" : "EM ANDAMENTO"}
                    </div>
                </div>

                <div className="text-center flex-1">
                    <h3 className="text-xl font-light text-slate-300 mb-2 uppercase tracking-wide">{awayTeamName}</h3>
                    <div className="text-6xl font-black text-white tracking-tighter">{awayScore}</div>
                </div>
            </div>

            {!isFinished && (
                <div className="flex flex-col md:flex-row gap-4 justify-center items-center bg-slate-950/30 p-4 rounded-xl border border-slate-800/50">
                    <div className="flex gap-2">
                        {isPlaying && (
                            <button
                                onClick={onPause}
                                className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold transition-all shadow-lg hover:shadow-amber-500/20 flex items-center gap-2"
                            >
                                <span>⏸</span> Pausar
                            </button>
                        )}

                        {isPaused && (
                            <button
                                onClick={onResume}
                                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition-all shadow-lg hover:shadow-emerald-500/20 flex items-center gap-2"
                            >
                                <span>▶</span> Continuar
                            </button>
                        )}

                        <button
                            onClick={onSimulateToEnd}
                            disabled={isLoading}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-blue-500/20 flex items-center gap-2"
                        >
                            <span>⏩</span> Resultado Rápido
                        </button>
                    </div>

                    <div className="hidden md:block w-px h-8 bg-slate-700 mx-2"></div>

                    <div className="flex items-center gap-2 bg-slate-800/50 p-1 rounded-lg border border-slate-700">
                        <span className="text-xs text-slate-400 font-bold px-2 uppercase">Velocidade:</span>
                        {[1, 2, 4].map((spd) => (
                            <button
                                key={spd}
                                onClick={() => onSpeedChange(spd)}
                                className={`
                                    w-8 h-8 rounded flex items-center justify-center text-xs font-bold transition-all
                                    ${speed === spd
                                        ? "bg-emerald-500 text-white shadow shadow-emerald-500/20"
                                        : "text-slate-400 hover:bg-slate-700 hover:text-white"
                                    }
                                `}
                                title={`Velocidade ${spd}x`}
                            >
                                {spd}x
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {isFinished && (
                <div className="text-center mt-4 p-4 bg-slate-800/30 rounded-lg border border-slate-800">
                    <p className="text-slate-400">A partida foi encerrada. Utilize o botão "Voltar" no topo para retornar ao calendário.</p>
                </div>
            )}

            {isLoading && (
                <LoadingSpinner
                    size="sm"
                    text="Processando simulação..."
                    centered={false}
                    className="mt-4"
                />
            )}

            {error && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-center text-red-400 text-sm">
                    ⚠️ {error}
                </div>
            )}
        </div>
    );
}