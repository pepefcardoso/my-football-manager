import React, { useMemo } from "react";
import { useGameStore } from "../../state/useGameStore";
import { useUIStore } from "../../state/useUIStore";
import { Calendar, MapPin, Trophy, Shield, Star, Clock } from "lucide-react";
import { Button } from "../components/Button";

export const CalendarScreen: React.FC = () => {
    const { meta, matches, clubs, competitions, competitionGroups, competitionFases, competitionSeasons } = useGameStore();
    const { setView } = useUIStore();
    const userClubId = meta.userClubId;

    const upcomingMatches = useMemo(() => {
        if (!userClubId) return [];

        const allMatches = Object.values(matches);

        const userMatches = allMatches.filter(
            (m) =>
                (m.homeClubId === userClubId || m.awayClubId === userClubId) &&
                m.status === "SCHEDULED" &&
                m.datetime >= meta.currentDate
        );

        return userMatches.sort((a, b) => a.datetime - b.datetime).slice(0, 10);
    }, [matches, userClubId, meta.currentDate]);

    const formatDate = (timestamp: number) => {
        return new Intl.DateTimeFormat('pt-BR', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(timestamp));
    };

    const getCompetitionName = (match: any) => {
        const group = competitionGroups[match.competitionGroupId];
        if (!group) return "Amistoso";
        const fase = competitionFases[group.competitionFaseId];
        const compSeason = competitionSeasons[fase.competitionSeasonId];
        const comp = competitions[compSeason.competitionId];
        return comp.nickname || comp.name;
    };

    const getMatchImportance = (match: any, opponent: any) => {
        if (!opponent) return null;
        if (opponent.reputation > 8000) return { label: "Clássico", color: "text-status-warning", icon: Star };
        if (opponent.reputation > 6000) return { label: "Difícil", color: "text-text-primary", icon: Shield };
        return null;
    };

    if (!userClubId) return null;

    return (
        <div className="space-y-6 animate-in fade-in duration-300 h-full flex flex-col">
            <div className="flex items-center justify-between bg-background-secondary p-6 rounded-lg border border-background-tertiary shadow-sm flex-none">
                <div className="flex items-center space-x-4">
                    <div className="p-3 bg-primary/10 rounded-full text-primary">
                        <Calendar size={32} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-text-primary">Calendário</h1>
                        <p className="text-text-secondary text-sm">Próximos compromissos</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4 scroll-smooth">
                {upcomingMatches.length === 0 ? (
                    <div className="text-center p-12 text-text-muted bg-background-secondary rounded-lg border border-background-tertiary border-dashed">
                        <Calendar size={48} className="mx-auto mb-4 opacity-20" />
                        <p>Nenhuma partida agendada para os próximos dias.</p>
                    </div>
                ) : (
                    upcomingMatches.map((match, index) => {
                        const isHome = match.homeClubId === userClubId;
                        const opponentId = isHome ? match.awayClubId : match.homeClubId;
                        const opponent = clubs[opponentId] || { name: 'Desconhecido', nickname: '??', reputation: 0, badgePath: null };
                        const isNextMatch = index === 0;
                        const importance = getMatchImportance(match, opponent);
                        const ImportanceIcon = importance?.icon ?? null;

                        return (
                            <div
                                key={match.id}
                                className={`
                                    relative flex flex-col md:flex-row items-center justify-between p-5 rounded-lg border transition-all duration-200
                                    ${isNextMatch
                                        ? 'bg-background-secondary border-primary shadow-[0_0_15px_rgba(59,130,246,0.1)] scale-[1.01]'
                                        : 'bg-background-secondary border-background-tertiary hover:border-text-muted/30'
                                    }
                                `}
                            >
                                {isNextMatch && (
                                    <div className="absolute -top-3 left-6 px-3 py-1 bg-primary text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm">
                                        Próxima Partida
                                    </div>
                                )}

                                <div className="flex flex-col md:w-1/4 mb-4 md:mb-0 text-center md:text-left">
                                    <div className="flex items-center justify-center md:justify-start text-text-secondary text-xs font-bold uppercase tracking-wider mb-1">
                                        <Trophy size={12} className="mr-1" />
                                        {getCompetitionName(match)}
                                    </div>
                                    <div className="text-text-primary font-mono font-medium flex items-center justify-center md:justify-start">
                                        <Clock size={14} className="mr-2 text-primary" />
                                        {formatDate(match.datetime)}
                                    </div>
                                    <div className="text-xs text-text-muted mt-1 flex items-center justify-center md:justify-start">
                                        <MapPin size={12} className="mr-1" />
                                        {isHome ? 'Casa' : 'Fora'} • {isHome ? clubs[userClubId].name : opponent.name}
                                    </div>
                                </div>

                                <div className="flex-1 flex items-center justify-center space-x-6 w-full md:w-auto border-t md:border-t-0 border-b md:border-b-0 border-background-tertiary py-4 md:py-0 my-2 md:my-0 bg-background/30 md:bg-transparent rounded md:rounded-none">
                                    <div className="text-right hidden md:block w-1/3">
                                        <div className="font-bold text-text-primary text-lg">{isHome ? clubs[userClubId].name : opponent.name}</div>
                                        {isHome && <div className="text-xs text-primary font-bold">VOCÊ</div>}
                                    </div>

                                    <div className="flex items-center space-x-4">
                                        <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center bg-background ${isHome ? 'border-primary' : 'border-background-tertiary'}`}>
                                            {isHome && clubs[userClubId].badgePath ? <img src={clubs[userClubId].badgePath} className="w-8 h-8 object-contain" alt="badge" /> : <span className="font-bold">{(clubs[userClubId].nickname || '').substring(0, 2)}</span>}
                                        </div>

                                        <span className="font-mono text-xl text-text-muted font-bold">VS</span>

                                        <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center bg-background ${!isHome ? 'border-primary' : 'border-background-tertiary'}`}>
                                            {!isHome && opponent.badgePath ? <img src={opponent.badgePath} className="w-8 h-8 object-contain" alt="badge" /> : <span className="font-bold">{(opponent.nickname || '').substring(0, 2)}</span>}
                                        </div>
                                    </div>

                                    <div className="text-left hidden md:block w-1/3">
                                        <div className="font-bold text-text-primary text-lg">{!isHome ? clubs[userClubId].name : opponent.name}</div>
                                        {!isHome && <div className="text-xs text-primary font-bold">VOCÊ</div>}
                                    </div>
                                </div>

                                <div className="flex flex-col items-center md:items-end md:w-1/4 mt-4 md:mt-0 space-y-2">
                                    {importance && (
                                        <div className={`flex items-center text-xs font-bold uppercase tracking-wider ${importance.color} bg-background-tertiary/50 px-2 py-1 rounded`}>
                                            {ImportanceIcon ? <ImportanceIcon size={12} className="mr-1" /> : null}
                                            {importance.label}
                                        </div>
                                    )}

                                    {isNextMatch ? (
                                        <Button size="sm" onClick={() => setView("MATCH_PREPARATION")}>
                                            Preparar Equipa
                                        </Button>
                                    ) : (
                                        <span className="text-xs text-text-muted bg-background-tertiary px-2 py-1 rounded">
                                            Agendado
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
