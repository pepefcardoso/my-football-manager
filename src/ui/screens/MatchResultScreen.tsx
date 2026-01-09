import React, { useMemo, useState } from "react";
import { useGameStore } from "../../state/useGameStore";
import { useUIStore } from "../../state/useUIStore";
import { formatDate } from "../../core/utils/formatters";
import { Button } from "../components/Button";
import { ClubBadge } from "../components/ClubBadge";
import {
    Trophy, ArrowRight, Activity, Shield,
    AlertTriangle, BarChart2, Star
} from "lucide-react";

const StatBar: React.FC<{ label: string; homeValue: number; awayValue: number }> = ({ label, homeValue, awayValue }) => {
    const total = homeValue + awayValue || 1;
    const homePercent = Math.round((homeValue / total) * 100);
    const awayPercent = Math.round((awayValue / total) * 100);

    return (
        <div className="mb-3">
            <div className="flex justify-between text-xs text-text-secondary mb-1">
                <span className="font-bold text-text-primary">{homeValue}</span>
                <span className="uppercase tracking-wider">{label}</span>
                <span className="font-bold text-text-primary">{awayValue}</span>
            </div>
            <div className="h-2 bg-background-tertiary rounded-full overflow-hidden flex">
                <div className="bg-primary transition-all duration-1000" style={{ width: `${homePercent}%` }} />
                <div className="bg-status-danger transition-all duration-1000" style={{ width: `${awayPercent}%` }} />
            </div>
        </div>
    );
};

export const MatchResultScreen: React.FC = () => {
    const { meta } = useGameStore();
    const { matches, events, playerStats } = useGameStore(s => s.matches);
    const { clubs } = useGameStore(s => s.clubs);
    const { players } = useGameStore(s => s.people);
    const { setView } = useUIStore();
    const [tab, setTab] = useState<'HOME' | 'AWAY'>('HOME');

    const match = useMemo(() => {
        if (!meta.userClubId) return null;
        const userMatches = Object.values(matches).filter(
            m => (m.homeClubId === meta.userClubId || m.awayClubId === meta.userClubId) && m.status === "FINISHED"
        );
        return userMatches.sort((a, b) => b.datetime - a.datetime)[0];
    }, [matches, meta.userClubId]);

    const homeClub = match ? clubs[match.homeClubId] : undefined;
    const awayClub = match ? clubs[match.awayClubId] : undefined;
    const isUserHome = match && meta.userClubId ? match.homeClubId === meta.userClubId : false;

    const matchEvents = useMemo(() => match ? (events[match.id] || []) : [], [events, match]);

    const stats = useMemo(() => match ? Object.values(playerStats).filter(s => s.matchId === match.id) : [], [playerStats, match]);

    const mvpStat = useMemo(() => stats.length ? stats.reduce((prev, current) => (prev.rating > current.rating) ? prev : current, stats[0]) : null, [stats]);
    const mvpPlayer = useMemo(() => mvpStat ? players[mvpStat.playerId] : null, [mvpStat, players]);

    const injuries = useMemo(() => matchEvents.filter(e => e.type === "INJURY"), [matchEvents]);

    const teamStats = useMemo(() => {
        if (!homeClub || !awayClub) return {
            home: { shots: 0, shotsOnTarget: 0, fouls: 0, yellows: 0, ratingAvg: "0.0" },
            away: { shots: 0, shotsOnTarget: 0, fouls: 0, yellows: 0, ratingAvg: "0.0" }
        };

        const calculate = (clubId: string) => {
            const clubStats = stats.filter(s => s.clubId === clubId);
            return {
                shots: clubStats.reduce((acc, s) => acc + s.shotsOnTarget + s.shotsOffTarget, 0),
                shotsOnTarget: clubStats.reduce((acc, s) => acc + s.shotsOnTarget, 0),
                fouls: clubStats.reduce((acc, s) => acc + s.foulsCommitted, 0),
                yellows: clubStats.reduce((acc, s) => acc + s.yellowCards, 0),
                ratingAvg: clubStats.length ? (clubStats.reduce((acc, s) => acc + s.rating, 0) / clubStats.length).toFixed(1) : "0.0"
            };
        };
        return {
            home: calculate(homeClub.id),
            away: calculate(awayClub.id)
        };
    }, [stats, homeClub, awayClub]);

    const activeStats = useMemo(() => {
        if (!homeClub || !awayClub) return [];
        return stats
            .filter(s => s.clubId === (tab === 'HOME' ? homeClub.id : awayClub.id))
            .sort((a, b) => b.rating - a.rating);
    }, [stats, tab, homeClub, awayClub]);

    if (!match || !meta.userClubId || !homeClub || !awayClub) {
        return (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
                <p className="text-text-muted">Nenhum resultado recente encontrado.</p>
                <Button onClick={() => setView("DASHBOARD")}>Ir para Dashboard</Button>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-background animate-in fade-in duration-500 overflow-hidden">

            <div className="flex-none bg-background-secondary border-b border-background-tertiary p-6 shadow-lg relative z-10">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <div className="flex flex-col items-center w-1/3">
                        <div className="w-20 h-20 rounded-full bg-white p-1 border-4 mb-2 shadow-xl" style={{ borderColor: homeClub.primaryColor }}>
                            <ClubBadge
                                badgeId={homeClub.badgeId}
                                clubName={homeClub.name}
                                className="w-full h-full"
                            />
                        </div>
                        <h2 className="text-xl font-bold text-text-primary text-center leading-tight">{homeClub.name}</h2>
                        {isUserHome && <span className="text-xs bg-primary px-2 py-0.5 rounded text-white mt-1">VOCÊ</span>}
                    </div>

                    <div className="flex flex-col items-center">
                        <div className="bg-background px-8 py-4 rounded-xl border border-background-tertiary shadow-inner">
                            <span className="text-5xl font-mono font-bold text-text-primary tracking-widest">
                                {match.homeGoals} - {match.awayGoals}
                            </span>
                        </div>
                        <span className="text-text-muted text-sm mt-2 uppercase tracking-wide">Fim de Jogo</span>
                        <span className="text-text-secondary text-xs">{formatDate(match.datetime)}</span>
                    </div>

                    <div className="flex flex-col items-center w-1/3">
                        <div className="w-20 h-20 rounded-full bg-white p-1 border-4 mb-2 shadow-xl" style={{ borderColor: awayClub.primaryColor }}>
                            <ClubBadge
                                badgeId={awayClub.badgeId}
                                clubName={awayClub.name}
                                className="w-full h-full"
                            />
                        </div>
                        <h2 className="text-xl font-bold text-text-primary text-center leading-tight">{awayClub.name}</h2>
                        {!isUserHome && <span className="text-xs bg-primary px-2 py-0.5 rounded text-white mt-1">VOCÊ</span>}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">

                    <div className="lg:col-span-5 space-y-6">

                        {mvpPlayer && (
                            <div className="bg-gradient-to-br from-yellow-900/20 to-background-secondary p-4 rounded-lg border border-yellow-500/30 flex items-center shadow-md">
                                <div className="p-3 bg-yellow-500/20 rounded-full mr-4 text-yellow-500">
                                    <Star size={24} fill="currentColor" />
                                </div>
                                <div>
                                    <div className="text-xs text-yellow-500 font-bold uppercase tracking-wider">Homem do Jogo</div>
                                    <div className="text-lg font-bold text-text-primary">{mvpPlayer.name}</div>
                                    <div className="text-sm text-text-secondary">Nota: <span className="text-white font-bold">{mvpStat?.rating.toFixed(1)}</span></div>
                                </div>
                            </div>
                        )}

                        <div className="bg-background-secondary p-5 rounded-lg border border-background-tertiary">
                            <div className="flex items-center mb-4 text-text-secondary uppercase text-xs font-bold tracking-wider">
                                <BarChart2 size={16} className="mr-2" /> Estatísticas
                            </div>
                            <StatBar label="Chutes (Total)" homeValue={teamStats.home.shots} awayValue={teamStats.away.shots} />
                            <StatBar label="No Alvo" homeValue={teamStats.home.shotsOnTarget} awayValue={teamStats.away.shotsOnTarget} />
                            <StatBar label="Faltas" homeValue={teamStats.home.fouls} awayValue={teamStats.away.fouls} />
                            <StatBar label="Cartões Amarelos" homeValue={teamStats.home.yellows} awayValue={teamStats.away.yellows} />
                            <StatBar label="Nota Média" homeValue={parseFloat(teamStats.home.ratingAvg)} awayValue={parseFloat(teamStats.away.ratingAvg)} />
                        </div>

                        <div className="bg-background-secondary p-5 rounded-lg border border-background-tertiary">
                            <div className="flex items-center mb-4 text-text-secondary uppercase text-xs font-bold tracking-wider">
                                <Activity size={16} className="mr-2" /> Eventos Chave
                            </div>
                            <div className="space-y-3 relative">
                                <div className="absolute left-4 top-2 bottom-2 w-px bg-background-tertiary"></div>
                                {matchEvents.filter(e => ['GOAL', 'CARD_RED', 'INJURY'].includes(e.type)).length === 0 && (
                                    <div className="text-text-muted text-sm text-center py-2">Jogo sem incidentes maiores.</div>
                                )}
                                {matchEvents.filter(e => ['GOAL', 'CARD_RED', 'INJURY'].includes(e.type)).sort((a, b) => a.minute - b.minute).map(event => (
                                    <div key={event.id} className="flex items-start relative pl-8">
                                        <div className="absolute left-2 top-1 w-4 h-4 rounded-full bg-background border-2 border-background-tertiary z-10"></div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <span className="font-mono text-primary font-bold">{event.minute}'</span>
                                                {event.type === 'GOAL' && <Trophy size={14} className="text-status-success" />}
                                                {event.type === 'CARD_RED' && <Shield size={14} className="text-status-danger" />}
                                                {event.type === 'INJURY' && <AlertTriangle size={14} className="text-status-warning" />}
                                            </div>
                                            <div className="text-sm font-medium text-text-primary">
                                                {players[event.playerId]?.name || "Desconhecido"}
                                            </div>
                                            <div className="text-xs text-text-secondary">{event.description}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {injuries.length > 0 && (
                            <div className="bg-status-danger/10 border border-status-danger/30 p-4 rounded-lg animate-in slide-in-from-bottom-2">
                                <div className="flex items-center text-status-danger font-bold mb-2">
                                    <AlertTriangle size={18} className="mr-2" /> Departamento Médico
                                </div>
                                {injuries.map(inj => (
                                    <div key={inj.id} className="text-sm text-text-primary mb-1 last:mb-0">
                                        <span className="font-bold">{players[inj.playerId]?.name}:</span> {inj.description}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-7 flex flex-col bg-background-secondary rounded-lg border border-background-tertiary overflow-hidden shadow-sm">
                        <div className="flex border-b border-background-tertiary">
                            <button
                                onClick={() => setTab('HOME')}
                                className={`flex-1 py-3 text-sm font-bold uppercase tracking-wide transition-colors duration-200 ...`}
                            >
                                {homeClub.name}
                            </button>
                            <button
                                onClick={() => setTab('AWAY')}
                                className={`flex-1 py-3 text-sm font-bold uppercase tracking-wide transition-colors ${tab === 'AWAY' ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-text-secondary hover:bg-background-tertiary/50'}`}
                            >
                                {awayClub.name}
                            </button>
                        </div>

                        <div className="flex-1 overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="bg-background-tertiary/50 text-text-secondary text-xs uppercase">
                                        <th className="p-3 w-8">Pos</th>
                                        <th className="p-3">Jogador</th>
                                        <th className="p-3 text-center w-12" title="Gols">G</th>
                                        <th className="p-3 text-center w-12" title="Assistências">A</th>
                                        <th className="p-3 text-center w-12" title="Chutes">SH</th>
                                        <th className="p-3 text-center w-12" title="Passes">P%</th>
                                        <th className="p-3 text-center w-16 font-bold text-text-primary">Nota</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-background-tertiary/30">
                                    {activeStats.map(stat => {
                                        const player = players[stat.playerId];
                                        if (!player) return null;

                                        let ratingColor = "text-text-secondary";
                                        if (stat.rating >= 8.0) ratingColor = "text-status-success font-bold";
                                        else if (stat.rating >= 7.0) ratingColor = "text-blue-400 font-medium";
                                        else if (stat.rating < 6.0) ratingColor = "text-status-danger";

                                        return (
                                            <tr key={stat.id} className="hover:bg-background-tertiary/20 transition-colors duration-200">
                                                <td className="p-3 text-text-muted text-xs font-mono">{stat.positionPlayedId}</td>
                                                <td className="p-3 font-medium flex items-center">
                                                    {player.name}
                                                    {stat.goals > 0 && <Trophy size={12} className="ml-2 text-status-success" />}
                                                    {stat.redCard && <div className="w-2 h-3 bg-red-500 ml-2 rounded-[1px]" />}
                                                    {stat.yellowCards > 0 && <div className="w-2 h-3 bg-yellow-500 ml-2 rounded-[1px]" />}
                                                </td>
                                                <td className={`p-3 text-center ${stat.goals > 0 ? 'text-text-primary font-bold' : 'text-text-muted'}`}>{stat.goals}</td>
                                                <td className={`p-3 text-center ${stat.assists > 0 ? 'text-text-primary font-bold' : 'text-text-muted'}`}>{stat.assists}</td>
                                                <td className="p-3 text-center text-text-secondary">{stat.shotsOnTarget + stat.shotsOffTarget}</td>
                                                <td className="p-3 text-center text-text-secondary">--</td>
                                                <td className={`p-3 text-center text-lg ${ratingColor}`}>{stat.rating.toFixed(1)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>

            <div className="p-4 border-t border-background-tertiary bg-background-secondary flex justify-end">
                <Button size="lg" icon={ArrowRight} onClick={() => setView("DASHBOARD")}>
                    Continuar
                </Button>
            </div>
        </div>
    );
};