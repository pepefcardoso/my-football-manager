import { TeamLogo } from "../../common/TeamLogo";
import { BrandButton } from "../../common/BrandButton";
import type { Team } from "../../../domain/models";

interface ClubHeaderProps {
    team: Team;
    currentDate: string;
    isProcessing: boolean;
    onAdvanceOne: () => void;
    onSimulate: () => void;
    onStop: () => void;
}

export function ClubHeader({ team, currentDate, isProcessing, onAdvanceOne, onSimulate, onStop }: ClubHeaderProps) {
    const displayDate = new Date(currentDate).toLocaleDateString('pt-PT', {
        day: '2-digit', month: 'long', year: 'numeric'
    });

    return (
        <header className="mb-8 flex justify-between items-center relative">
            <div
                className="absolute -top-20 -left-20 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
                style={{ backgroundColor: team.primaryColor }}
            />

            <div className="flex items-center gap-6 relative z-10">
                <div className="relative group">
                    <TeamLogo team={team} className="w-24 h-24 text-4xl rounded-2xl" />
                </div>
                <div>
                    <h1 className="text-5xl font-black text-white tracking-tight leading-none drop-shadow-sm">
                        {team.name}
                    </h1>
                    <div className="flex items-center gap-3 mt-2">
                        <span className="h-1.5 w-12 rounded-full" style={{ backgroundColor: team.secondaryColor || '#fff' }} />
                        <span className="text-slate-400 text-sm font-medium tracking-wide uppercase">
                            Reputação: {team.reputation}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex flex-col items-end gap-3 relative z-10">
                <div className="text-slate-300 font-mono bg-slate-900/80 backdrop-blur-sm px-6 py-2 rounded-xl border border-slate-800 text-sm shadow-lg">
                    📅 {displayDate}
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={onAdvanceOne}
                        disabled={isProcessing}
                        className="px-6 py-3 rounded-xl font-bold text-sm text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all disabled:opacity-50 shadow-lg"
                    >
                        +1 Dia
                    </button>

                    {isProcessing ? (
                        <button
                            onClick={onStop}
                            className="px-8 py-3 rounded-xl font-bold text-sm text-white bg-red-600 hover:bg-red-500 transition-all shadow-lg flex items-center gap-2"
                        >
                            <span>⏸ Parar</span>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        </button>
                    ) : (
                        <BrandButton onClick={onSimulate}>
                            <div className="flex items-center gap-2">
                                <span>▶ Continuar</span>
                            </div>
                        </BrandButton>
                    )}
                </div>
            </div>
        </header>
    );
}