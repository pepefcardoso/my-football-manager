import { useCurrentDate } from "../../store/useGameStore";
import type { Team } from "../../domain/models";
import { LoadingSpinner } from "../common/Loading";
import { useMatchNavigation } from "../../hooks/ui/useMatchNavigation";
import { useMatchData } from "../../hooks/data/useMatchData";
import { MatchCalendar } from "../features/match/MatchCalendar";
import { PreMatchScreen, type PreMatchLineup } from "../features/match/pre-game/PreMatchScreen";
import { MatchViewer } from "../features/match/MatchViewer";

interface MatchesPageProps {
    teamId: number;
    teams: Team[];
}

function MatchesPage({ teamId, teams: initialTeams }: MatchesPageProps) {
    const currentDate = useCurrentDate();

    const {
        matches,
        competitions,
        allTeams,
        loading,
        refreshData
    } = useMatchData(teamId, initialTeams);

    const {
        view,
        selectedMatch,
        navigateToPreMatch,
        navigateToMatch,
        backToCalendar
    } = useMatchNavigation();

    const handleConfirmLineup = (_lineup: PreMatchLineup) => {
        navigateToMatch();
    };

    const handleBackToCalendar = async () => {
        backToCalendar();
        await refreshData();
    };

    if (selectedMatch && view === 'pre-match') {
        const homeTeam = allTeams.find((t) => t.id === selectedMatch.homeTeamId);
        const awayTeam = allTeams.find((t) => t.id === selectedMatch.awayTeamId);

        if (!homeTeam || !awayTeam) return <div className="p-8 text-white">Erro: Times não encontrados</div>;

        return (
            <PreMatchScreen
                matchId={selectedMatch.id}
                homeTeam={homeTeam}
                awayTeam={awayTeam}
                userTeamId={teamId}
                onConfirm={handleConfirmLineup}
                onCancel={backToCalendar}
            />
        );
    }

    if (selectedMatch && view === 'match') {
        const homeTeam = allTeams.find((t) => t.id === selectedMatch.homeTeamId);
        const awayTeam = allTeams.find((t) => t.id === selectedMatch.awayTeamId);

        return (
            <div className="h-full flex flex-col animate-in fade-in duration-300">
                <div className="bg-slate-900 p-4 border-b border-slate-800 flex justify-between items-center shadow-lg z-10">
                    <button
                        onClick={handleBackToCalendar}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm text-slate-200 flex items-center gap-2 transition-colors border border-slate-700"
                    >
                        ← Voltar ao Calendário
                    </button>
                    <h2 className="text-lg font-bold text-white tracking-wide">
                        {homeTeam?.name} vs {awayTeam?.name}
                    </h2>
                    <div className="w-24"></div>
                </div>

                <MatchViewer
                    matchId={selectedMatch.id}
                    homeTeamName={homeTeam?.name || "Casa"}
                    awayTeamName={awayTeam?.name || "Fora"}
                    homeTeamId={selectedMatch.homeTeamId!}
                    awayTeamId={selectedMatch.awayTeamId!}
                />
            </div>
        );
    }

    return (
        <div className="p-8 pb-20">
            <header className="mb-8 border-b border-slate-800 pb-4">
                <div className="flex justify-between items-end">
                    <div>
                        <h2 className="text-3xl font-light text-white mb-1">Calendário de Jogos</h2>
                        <p className="text-slate-400 text-sm">Temporada Atual • {new Date(currentDate).getFullYear()}</p>
                    </div>
                    <div className="text-right">
                        <div className="text-xs uppercase font-bold text-slate-500 mb-1">Hoje é</div>
                        <div className="text-emerald-400 font-mono font-bold bg-emerald-950/30 px-3 py-1 rounded border border-emerald-500/30">
                            {new Date(currentDate).toLocaleDateString("pt-PT")}
                        </div>
                    </div>
                </div>
            </header>

            {loading ? (
                <LoadingSpinner size="lg" centered={true} className="py-20" />
            ) : (
                <MatchCalendar
                    matches={matches}
                    teams={allTeams}
                    competitions={competitions}
                    userTeamId={teamId}
                    currentDate={currentDate}
                    onSelectMatch={navigateToPreMatch}
                />
            )}
        </div>
    );
}

export default MatchesPage;