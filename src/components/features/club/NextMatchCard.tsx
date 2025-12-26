import { TeamLogo } from "../../common/TeamLogo";
import type { ExtendedMatchInfo } from "../../pages/club/types";
import type { Team } from "../../../domain/models";

interface NextMatchCardProps {
    match: ExtendedMatchInfo | null;
    team: Team;
    formStreak: string[];
    onViewDetails: () => void;
}

export function NextMatchCard({ match, team, formStreak, onViewDetails }: NextMatchCardProps) {
    if (!match) {
        return (
            <div className="col-span-1 md:col-span-12 lg:col-span-8 row-span-2 bg-slate-900 rounded-2xl border border-slate-800 p-8 shadow-2xl flex flex-col items-center justify-center text-slate-500">
                <span className="text-4xl mb-4">💤</span>
                <p className="text-lg font-medium">Sem jogos agendados em breve.</p>
            </div>
        );
    }

    return (
        <div
            className="col-span-1 md:col-span-12 lg:col-span-8 row-span-2 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 rounded-2xl border p-8 shadow-2xl relative overflow-hidden group transition-all"
            style={{ borderColor: 'var(--team-primary-20)' }}
        >
            <div className="relative z-10 h-full flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-6">
                    <span className="text-3xl">⚽</span>
                    <div>
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Próximo Desafio</h3>
                        <p className="text-xs font-mono text-emerald-400">{match.competitionName}</p>
                    </div>
                </div>

                <div className="flex items-center justify-between mb-6">
                    <div className="text-center flex-1 flex flex-col items-center">
                        <TeamLogo team={team} className="w-20 h-20 mx-auto rounded-2xl shadow-lg" />
                        <div className="text-sm text-slate-400 mt-2 font-bold">{team.shortName}</div>
                    </div>

                    <div className="px-8 text-center">
                        <div className="text-5xl font-black text-slate-700 mb-2 select-none">VS</div>
                        <div className={`inline-block px-4 py-1 rounded-full text-xs font-bold ${match.location === "HOME" ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-500/20 text-blue-400"}`}>
                            {match.location === "HOME" ? "🏠 EM CASA" : "✈️ FORA"}
                        </div>
                    </div>

                    <div className="text-center flex-1 flex flex-col items-center">
                        <TeamLogo team={match.opponent} className="w-20 h-20 mx-auto rounded-2xl shadow-lg" />
                        <div className="text-sm text-slate-400 mt-2 font-bold">{match.opponentShortName}</div>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-slate-800">
                    <div>
                        <div className="text-xs text-slate-500 mb-1">Data</div>
                        <div className="text-lg font-bold text-white font-mono">
                            {new Date(match.date).toLocaleDateString("pt-PT", { day: "2-digit", month: "long" })}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 mr-2 hidden md:inline">Forma Recente:</span>
                        {formStreak.map((result, i) => (
                            <span
                                key={i}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${result === "W" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                                        result === "D" ? "bg-slate-700 text-slate-400 border border-slate-600" :
                                            "bg-red-500/20 text-red-400 border border-red-500/30"
                                    }`}
                                title={result === "W" ? "Vitória" : result === "D" ? "Empate" : "Derrota"}
                            >
                                {result}
                            </span>
                        ))}
                        {formStreak.length === 0 && <span className="text-slate-600 text-xs">--</span>}
                    </div>

                    <button
                        onClick={onViewDetails}
                        className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition-colors text-sm"
                    >
                        Ver Detalhes
                    </button>
                </div>
            </div>
        </div>
    );
}