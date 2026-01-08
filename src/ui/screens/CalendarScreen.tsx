import React, { useMemo, useState, useRef } from "react";
import { useGameStore } from "../../state/useGameStore";
import { useUIStore } from "../../state/useUIStore";
import { Calendar, MapPin, Trophy, Shield, Star, Clock, FastForward, CheckCircle } from "lucide-react";
import { Button } from "../components/Button";
import { ClubBadge } from "../components/ClubBadge";
import { simulationSystem } from "../../core/systems/SimulationSystem";

export const CalendarScreen: React.FC = () => {
    const { meta, advanceDay } = useGameStore();
    const { matches } = useGameStore(s => s.matches);
    const { clubs } = useGameStore(s => s.clubs);
    const { competitions, groups, fases, competitionSeasons } = useGameStore(s => s.competitions);
    const { setView } = useUIStore();
    const userClubId = meta.userClubId;

    const [isSimulating, setIsSimulating] = useState(false);
    const [simulatedDays, setSimulatedDays] = useState(0);
    const [simulationLogs, setSimulationLogs] = useState<string[]>([]);
    const [showSummary, setShowSummary] = useState(false);

    const stopSimulationRef = useRef(false);

    const nextMatchTarget = useMemo(() => {
        if (!userClubId) return null;
        const allMatches = Object.values(matches);
        const futureMatches = allMatches.filter(
            (m) =>
                m.status === "SCHEDULED" &&
                (m.homeClubId === userClubId || m.awayClubId === userClubId) &&
                m.datetime > meta.currentDate
        ).sort((a, b) => a.datetime - b.datetime);

        return futureMatches[0] || null;
    }, [matches, userClubId, meta.currentDate]);

    const startSimulation = async () => {
        if (!nextMatchTarget) return;

        setIsSimulating(true);
        setShowSummary(false);
        setSimulatedDays(0);
        setSimulationLogs([]);
        stopSimulationRef.current = false;

        const targetDate = new Date(nextMatchTarget.datetime).setHours(0, 0, 0, 0);

        await simulationSystem.simulateUntilDate(
            meta.currentDate,
            targetDate,
            {
                advanceDayFn: () => advanceDay(),
                shouldStop: () => stopSimulationRef.current,
                onProgress: (days, newLogs) => {
                    setSimulatedDays(days);
                    if (newLogs.length > 0) {
                        setSimulationLogs(prev => [...prev, ...newLogs]);
                    }
                }
            }
        );

        setIsSimulating(false);
        setShowSummary(true);
    };

    const cancelSimulation = () => {
        stopSimulationRef.current = true;
        simulationSystem.cancel();
    };

    const formatDate = (timestamp: number) => {
        return new Intl.DateTimeFormat('pt-BR', {
            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        }).format(new Date(timestamp));
    };

    const getCompetitionName = (match: any) => {
        const group = groups[match.competitionGroupId];
        if (!group) return "Amistoso";
        const fase = fases[group.competitionFaseId];
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

    if (!userClubId) return null;

    return (
        <div className="space-y-6 animate-in fade-in duration-300 h-full flex flex-col relative">

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

                {nextMatchTarget && (
                    <Button
                        variant="primary"
                        icon={FastForward}
                        onClick={startSimulation}
                        disabled={isSimulating}
                        className="shadow-lg shadow-primary/20"
                    >
                        Simular até Próximo Jogo
                    </Button>
                )}
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
                        const opponent = clubs[opponentId] || { name: 'Desconhecido', nickname: '??', reputation: 0, badgeId: undefined };
                        const isNextMatch = index === 0;
                        const importance = getMatchImportance(match, opponent);
                        const ImportanceIcon = importance?.icon ?? null;
                        const homeTeam = clubs[match.homeClubId];
                        const awayTeam = clubs[match.awayClubId];

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
                                        <div className="font-bold text-text-primary text-lg">{homeTeam.name}</div>
                                        {isHome && <div className="text-xs text-primary font-bold">VOCÊ</div>}
                                    </div>

                                    <div className="flex items-center space-x-4">
                                        <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center bg-background ${isHome ? 'border-primary' : 'border-background-tertiary'}`}>
                                            <ClubBadge
                                                badgeId={homeTeam.badgeId}
                                                clubName={homeTeam.name}
                                                className="w-8 h-8"
                                                size="md"
                                            />
                                        </div>

                                        <span className="font-mono text-xl text-text-muted font-bold">VS</span>

                                        <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center bg-background ${!isHome ? 'border-primary' : 'border-background-tertiary'}`}>
                                            <ClubBadge
                                                badgeId={awayTeam.badgeId}
                                                clubName={awayTeam.name}
                                                className="w-8 h-8"
                                                size="md"
                                            />
                                        </div>
                                    </div>

                                    <div className="text-left hidden md:block w-1/3">
                                        <div className="font-bold text-text-primary text-lg">{awayTeam.name}</div>
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

            {isSimulating && (
                <div className="absolute inset-0 z-50 bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-300">
                    <div className="bg-background-secondary p-8 rounded-xl border border-background-tertiary shadow-2xl max-w-md w-full text-center">
                        <div className="mb-6 relative">
                            <div className="w-16 h-16 rounded-full border-4 border-background-tertiary border-t-primary animate-spin mx-auto"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-xs font-mono font-bold">{simulatedDays}d</span>
                            </div>
                        </div>

                        <h2 className="text-xl font-bold text-text-primary mb-2">Simulando...</h2>
                        <p className="text-text-secondary mb-6">
                            Avançando até {nextMatchTarget ? formatDate(nextMatchTarget.datetime) : 'próximo evento'}
                        </p>

                        <div className="bg-background p-3 rounded border border-background-tertiary mb-6 h-32 overflow-y-auto text-left custom-scrollbar">
                            <div className="space-y-1">
                                {simulationLogs.length === 0 && <span className="text-xs text-text-muted italic">Processando rotinas diárias...</span>}
                                {simulationLogs.slice(-5).map((log, i) => (
                                    <div key={i} className="text-xs text-text-secondary border-b border-background-tertiary/30 last:border-0 pb-1">
                                        {log}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Button variant="danger" onClick={cancelSimulation} className="w-full">
                            Cancelar
                        </Button>
                    </div>
                </div>
            )}

            {showSummary && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-background-secondary border border-background-tertiary rounded-lg shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-background-tertiary flex justify-between items-center bg-background/50">
                            <h3 className="text-lg font-bold text-text-primary flex items-center">
                                <CheckCircle className="mr-2 text-status-success" size={20} />
                                Simulação Concluída
                            </h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex justify-between items-center bg-background p-3 rounded border border-background-tertiary">
                                <span className="text-text-secondary">Dias Simulados</span>
                                <span className="font-mono font-bold text-xl text-primary">{simulatedDays}</span>
                            </div>

                            <div>
                                <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Resumo de Eventos</h4>
                                {simulationLogs.length > 0 ? (
                                    <div className="bg-background p-3 rounded border border-background-tertiary max-h-40 overflow-y-auto custom-scrollbar">
                                        {simulationLogs.map((log, i) => (
                                            <div key={i} className="text-xs text-text-muted mb-1 last:mb-0">
                                                {log}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-text-muted italic">Nenhum evento importante ocorreu.</p>
                                )}
                            </div>

                            <div className="text-xs text-center text-text-secondary bg-primary/5 p-2 rounded">
                                O time está descansado e pronto para a partida.
                            </div>
                        </div>
                        <div className="p-4 bg-background/50 border-t border-background-tertiary flex justify-end">
                            <Button onClick={() => { setShowSummary(false); setView("MATCH_PREPARATION"); }}>
                                Fechar e Preparar Time
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};