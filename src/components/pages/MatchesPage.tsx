import { useEffect, useState } from "react";
import Badge from "../common/Badge";
import { MatchViewer } from "../features/match/MatchViewer";
import type { Match, Team } from "../../domain/models";
import { Logger } from "../../lib/Logger";

const logger = new Logger("MatchesPage");

function MatchesPage({ teamId, teams }: { teamId: number; teams: Team[] }) {
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

    useEffect(() => {
        const loadMatches = async () => {
            setLoading(true);
            try {
                const state = await window.electronAPI.getGameState();
                if (state && state.currentSeasonId) {
                    const data = await window.electronAPI.getMatches(teamId, state.currentSeasonId);
                    setMatches(data);
                }
            } catch (error) {
                logger.error("Erro ao carregar partidas:", error);
            } finally {
                setLoading(false);
            }
        };
        loadMatches();
    }, [teamId]);

    if (selectedMatch) {
        const homeTeam = teams.find((t) => t.id === selectedMatch.homeTeamId);
        const awayTeam = teams.find((t) => t.id === selectedMatch.awayTeamId);

        return (
            <div className="h-full flex flex-col">
                <div className="bg-slate-900 p-4 border-b border-slate-800 flex justify-between items-center">
                    <button
                        onClick={() => setSelectedMatch(null)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm text-slate-200 flex items-center gap-2 transition-colors"
                    >
                        ← Voltar à Lista
                    </button>
                    <h2 className="text-lg font-semibold text-white">Simulação de Partida</h2>
                    <div className="w-24"></div>
                </div>

                <MatchViewer
                    matchId={selectedMatch.id}
                    homeTeamName={homeTeam?.name || "Casa"}
                    awayTeamName={awayTeam?.name || "Fora"}
                />
            </div>
        );
    }

    return (
        <div className="p-8">
            <header className="mb-6">
                <h2 className="text-3xl font-light text-white mb-1">Próximas Partidas</h2>
                <p className="text-slate-400 text-sm">Calendário da Temporada</p>
            </header>

            {loading ? (
                <div className="flex justify-center p-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                </div>
            ) : (
                <div className="space-y-3">
                    {matches.length === 0 && <p className="text-slate-500">Nenhuma partida encontrada.</p>}

                    {matches.map((match) => {
                        const isHome = match.homeTeamId === teamId;
                        const opponentId = isHome ? match.awayTeamId : match.homeTeamId;
                        const opponent = teams.find((t) => t.id === opponentId);

                        const homeScore = match.homeScore || 0;
                        const awayScore = match.awayScore || 0;
                        let resultVariant: "success" | "danger" | "neutral" = "neutral";
                        let resultText = "EMPATE";

                        if (match.isPlayed) {
                            if (homeScore === awayScore) {
                                resultVariant = "neutral";
                                resultText = "EMPATE";
                            } else if (isHome) {
                                resultVariant = homeScore > awayScore ? "success" : "danger";
                                resultText = homeScore > awayScore ? "VITÓRIA" : "DERROTA";
                            } else {
                                resultVariant = awayScore > homeScore ? "success" : "danger";
                                resultText = awayScore > homeScore ? "VITÓRIA" : "DERROTA";
                            }
                        }

                        return (
                            <div
                                key={match.id}
                                className="bg-slate-900 border border-slate-800 p-4 rounded-lg flex items-center justify-between hover:border-slate-700 transition-colors"
                            >
                                <div className="flex items-center gap-4 w-1/3">
                                    <div className="text-slate-400 text-sm font-mono w-16">
                                        {new Date(match.date).toLocaleDateString("pt-PT", { day: "2-digit", month: "short" })}
                                    </div>
                                    <div className="font-medium text-slate-200">
                                        {isHome ? (
                                            <span><span className="text-emerald-400 font-bold mr-2">C</span> vs {opponent?.name}</span>
                                        ) : (
                                            <span><span className="text-yellow-400 font-bold mr-2">F</span> @ {opponent?.name}</span>
                                        )}
                                    </div>
                                </div>

                                <div className="font-bold text-xl text-slate-300">
                                    {match.isPlayed ? (
                                        <span>{match.homeScore} - {match.awayScore}</span>
                                    ) : (
                                        <span className="text-slate-600">- : -</span>
                                    )}
                                </div>

                                <div className="w-1/3 flex justify-end">
                                    {!match.isPlayed ? (
                                        <button
                                            onClick={() => setSelectedMatch(match)}
                                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded transition-colors shadow-lg shadow-emerald-900/20"
                                        >
                                            Jogar
                                        </button>
                                    ) : (
                                        <Badge variant={resultVariant}>
                                            {resultText}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default MatchesPage;