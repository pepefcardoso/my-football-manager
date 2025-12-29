import type { Team } from "../../domain/models";
import { EmptyState } from "../common/EmptyState";
import { TeamLogo } from "../common/TeamLogo"; //

function MenuPage({
    teams,
    loading,
    onLoadTeams,
    onSelectTeam,
}: {
    teams: Team[];
    loading: boolean;
    onLoadTeams: () => void;
    onSelectTeam: (team: Team) => void;
}) {
    return (
        <div className="p-8 pb-20">
            <header className="mb-8">
                <h2 className="text-4xl font-light mb-2 text-white">Bem-vindo ao Football Manager</h2>
                <p className="text-slate-400">Escolha seu clube e comece sua jornada</p>
            </header>

            {teams.length === 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl mt-8">
                    <EmptyState
                        icon={<span className="text-4xl">🛡️</span>}
                        title="Base de Dados"
                        description="Carregue a lista oficial de clubes para escolher a sua equipa e iniciar a carreira."
                        action={{
                            label: loading ? "A carregar..." : "Carregar Clubes",
                            onClick: onLoadTeams
                        }}
                        className="py-12"
                    />
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
                {teams.map((team) => (
                    <button
                        key={team.id}
                        onClick={() => onSelectTeam(team)}
                        className="relative p-6 rounded-xl bg-slate-900 border border-slate-800 transition-all duration-300 text-left group hover:-translate-y-1 overflow-hidden"
                        style={{ ['--hover-color']: team.primaryColor || '#10b981' } as React.CSSProperties}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-[var(--hover-color)] to-transparent opacity-0 group-hover:opacity-10 transition-opacity duration-500" />
                        <div className="absolute bottom-0 left-0 w-full h-1 bg-[var(--hover-color)] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />

                        <div className="relative z-10 flex items-center gap-5 mb-4">
                            <div className="relative">
                                <TeamLogo
                                    team={team}
                                    className="w-16 h-16 text-xl shadow-lg rounded-xl"
                                />
                            </div>

                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-lg text-white group-hover:text-[var(--hover-color)] transition-colors truncate">
                                    {team.name}
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-950 px-2 py-0.5 rounded">
                                        Rep: {team.reputation}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="relative z-10 pt-4 border-t border-slate-800/50 flex justify-between items-end">
                            <div>
                                <p className="text-xs text-slate-500 uppercase font-bold">Orçamento</p>
                                <p className={`font-mono font-medium ${team.budget < 0 ? 'text-red-400' : 'text-slate-300'}`}>
                                    €{new Intl.NumberFormat('pt-PT', { notation: "compact", maximumFractionDigits: 1 }).format(team.budget)}
                                </p>
                            </div>
                            {team.isHuman && (
                                <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded">
                                    Controlado
                                </span>
                            )}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}

export default MenuPage;