import type { Team } from "../../domain/types";

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
        <div className="p-8">
            <header className="mb-8">
                <h2 className="text-4xl font-light mb-2">Bem-vindo ao Football Manager</h2>
                <p className="text-slate-400">Escolha seu clube e comece sua jornada</p>
            </header>

            {teams.length === 0 && (
                <button
                    onClick={onLoadTeams}
                    disabled={loading}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                    {loading ? "A carregar..." : "Carregar Clubes"}
                </button>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                {teams.map((team) => (
                    <button
                        key={team.id}
                        onClick={() => onSelectTeam(team)}
                        className="p-6 rounded-lg bg-slate-900 border border-slate-800 hover:border-emerald-500 transition-all text-left group"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div
                                className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl shadow-lg"
                                style={{ backgroundColor: team.primaryColor || "#333" }}
                            >
                                {team.shortName}
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-lg group-hover:text-emerald-400 transition-colors">
                                    {team.name}
                                </h3>
                                <p className="text-sm text-slate-500">Rep: {team.reputation}</p>
                            </div>
                        </div>
                        <div className="text-sm text-slate-400">
                            Orçamento: €{((team.budget || 0) / 1000000).toFixed(1)}M
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}

export default MenuPage;