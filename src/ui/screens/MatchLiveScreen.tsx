import React, { useMemo, useRef, useEffect } from "react";
import { useGameStore } from "../../state/useGameStore";
import { useUIStore } from "../../state/useUIStore";
import { useSafeMatchReplay } from "../hooks/useSafeMatchReplay";
import { Button } from "../components/Button";
import { ClubBadge } from "../components/ClubBadge";
import { DynamicPitchView } from "../components/DynamicPitchView";
import {
    Play, Pause, SkipForward, ArrowLeft, Clock,
    Activity, Shield, MessageSquare, AlertCircle, BarChart2, RefreshCw
} from "lucide-react";
import { MatchEvent } from "../../core/models/match";
import {
    selectLiveMatchStats,
    selectMatchEventsUntilMinute
} from "../../state/selectors";

interface EventRowProps {
    event: MatchEvent;
    isHome: boolean;
    playerName: string;
}

const EventRow: React.FC<EventRowProps> = ({ event, isHome, playerName }) => {
    let icon = <Activity size={16} />;
    let colorClass = "text-text-secondary";

    switch (event.type) {
        case "GOAL":
            icon = <Activity size={16} />;
            colorClass = "text-status-success font-bold";
            break;
        case "CARD_YELLOW":
            icon = <Shield size={16} />;
            colorClass = "text-status-warning";
            break;
        case "CARD_RED":
            icon = <AlertCircle size={16} />;
            colorClass = "text-status-danger font-bold";
            break;
        default:
            icon = <Activity size={16} />;
            break;
    }

    return (
        <div className={`flex items-center p-3 rounded mb-2 border border-background-tertiary animate-in slide-in-from-top-2 ${isHome ? 'bg-background-secondary flex-row' : 'bg-background-secondary flex-row-reverse text-right'}`}>
            <div className="w-12 text-center font-mono text-sm font-bold text-text-muted border-r border-background-tertiary px-2">
                {event.minute}'
            </div>
            <div className={`flex-1 px-3 ${isHome ? 'text-left' : 'text-right'}`}>
                <div className={`text-sm ${colorClass} flex items-center ${isHome ? 'flex-row' : 'flex-row-reverse'}`}>
                    {icon}
                    <span className="mx-2">{event.type === 'GOAL' ? 'GOL!' : event.type.replace('CARD_', 'CARTÃO ')}</span>
                </div>
                <div className="text-text-primary font-medium text-sm">
                    {playerName}
                </div>
                <div className="text-xs text-text-muted">{event.description}</div>
            </div>
        </div>
    );
};

export const MatchLiveScreen: React.FC = () => {
    const { matches, playerStats } = useGameStore(s => s.matches);
    const { clubs } = useGameStore(s => s.clubs);
    const { players } = useGameStore(s => s.people);
    const { setView, activeMatchId } = useUIStore();

    const scrollRef = useRef<HTMLDivElement>(null);

    const currentMatch = useMemo(() => {
        if (activeMatchId && matches[activeMatchId]) {
            return matches[activeMatchId];
        }
        return null;
    }, [matches, activeMatchId]);

    const {
        currentMinute,
        isPlaying,
        speed,
        error,
        actions
    } = useSafeMatchReplay({
        matchId: currentMatch?.id || "",
        homeClubId: currentMatch?.homeClubId || "",
        awayClubId: currentMatch?.awayClubId || "",
        events: []
    });

    const liveStats = useGameStore(state =>
        currentMatch ? selectLiveMatchStats(state, currentMatch.id, currentMinute) : null
    );

    const visibleEvents = useGameStore(state =>
        currentMatch ? selectMatchEventsUntilMinute(state, currentMatch.id, currentMinute) : []
    );

    const homeClub = currentMatch ? clubs[currentMatch.homeClubId] : null;
    const awayClub = currentMatch ? clubs[currentMatch.awayClubId] : null;

    // TODO: Num futuro refactor, mover para selectMatchLineups(matchId)
    const { homeStarters, awayStarters } = useMemo(() => {
        if (!currentMatch) return { homeStarters: [], awayStarters: [] };
        const allStats = Object.values(playerStats).filter(s => s.matchId === currentMatch.id && s.isStarter);
        return {
            homeStarters: allStats.filter(s => s.clubId === currentMatch.homeClubId),
            awayStarters: allStats.filter(s => s.clubId === currentMatch.awayClubId)
        };
    }, [currentMatch, playerStats]);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
    }, [visibleEvents.length]);

    if (!currentMatch || !homeClub || !awayClub || !liveStats) {
        return <div className="p-8 text-center text-text-muted">Carregando dados da partida...</div>;
    }

    const { score, stats } = liveStats;

    return (
        <div className="h-full flex flex-col bg-background animate-in fade-in duration-500 relative">

            {error && (
                <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-background-secondary border border-status-danger p-6 rounded-lg shadow-2xl max-w-md w-full text-center">
                        <AlertCircle size={48} className="mx-auto text-status-danger mb-4" />
                        <h3 className="text-lg font-bold text-text-primary mb-2">Erro na Simulação</h3>
                        <p className="text-sm text-text-secondary mb-6">{error}</p>
                        <div className="flex gap-4 justify-center">
                            <Button variant="secondary" icon={RefreshCw} onClick={actions.retry}>
                                Tentar Continuar
                            </Button>
                            <Button variant="primary" icon={SkipForward} onClick={() => setView("MATCH_RESULT")}>
                                Pular para Resultados
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <header className="flex-none bg-background-secondary border-b border-background-tertiary p-4 shadow-lg z-10">
                <div className="flex justify-between items-center max-w-5xl mx-auto">
                    <div className="flex items-center space-x-4 w-1/3">
                        <div className="w-16 h-16 rounded-full bg-white p-1 border-2" style={{ borderColor: homeClub.primaryColor }}>
                            <ClubBadge badgeId={homeClub.badgeId} clubName={homeClub.name} className="w-full h-full" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-text-primary">{homeClub.name}</h2>
                            <p className="text-sm text-text-secondary">Mandante</p>
                        </div>
                    </div>
                    <div className="flex flex-col items-center w-1/3">
                        <div className="bg-black/40 rounded-lg px-6 py-2 border border-background-tertiary mb-2 backdrop-blur-sm">
                            <span className="text-4xl font-mono font-bold text-white tracking-widest">
                                {score.home} - {score.away}
                            </span>
                        </div>
                        <div className="flex items-center space-x-2 text-primary font-mono text-lg font-bold">
                            <Clock size={18} />
                            <span className={currentMinute > 90 ? "animate-pulse text-status-warning" : ""}>
                                {currentMinute > 90 ? `90+${currentMinute - 90}` : currentMinute}'
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center justify-end space-x-4 w-1/3">
                        <div className="text-right">
                            <h2 className="text-xl font-bold text-text-primary">{awayClub.name}</h2>
                            <p className="text-sm text-text-secondary">Visitante</p>
                        </div>
                        <div className="w-16 h-16 rounded-full bg-white p-1 border-2" style={{ borderColor: awayClub.primaryColor }}>
                            <ClubBadge badgeId={awayClub.badgeId} clubName={awayClub.name} className="w-full h-full" />
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex-none bg-background border-b border-background-tertiary p-2 flex justify-center space-x-2">
                <Button variant="secondary" size="sm" icon={isPlaying ? Pause : Play} onClick={actions.togglePlay} disabled={!!error || currentMinute >= 94}>
                    {isPlaying ? "Pausar" : "Continuar"}
                </Button>
                <div className="h-8 w-px bg-background-tertiary mx-2"></div>
                {[1, 2, 4].map(s => (
                    <Button key={s} variant={speed === s ? "primary" : "ghost"} size="sm" onClick={() => actions.setSpeed(s)} disabled={!!error}>
                        {s}x
                    </Button>
                ))}
                <div className="h-8 w-px bg-background-tertiary mx-2"></div>
                <Button variant="danger" size="sm" icon={SkipForward} onClick={actions.skipToFinish} disabled={!!error || currentMinute >= 94}>
                    Final
                </Button>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 overflow-hidden max-w-7xl mx-auto w-full">

                <div className="lg:col-span-4 flex flex-col space-y-4">
                    <div className="bg-background-secondary p-4 rounded-lg border border-background-tertiary shadow-lg">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">Em Campo</h3>
                            <span className="text-xs text-text-muted">Titulares</span>
                        </div>
                        <DynamicPitchView
                            homeStats={homeStarters}
                            awayStats={awayStarters}
                            players={players}
                            homeColor={homeClub.primaryColor}
                            awayColor={awayClub.primaryColor}
                        />
                    </div>

                    <div className="bg-background-secondary p-4 rounded-lg border border-background-tertiary flex-1">
                        <div className="flex items-center mb-4 border-b border-background-tertiary pb-2">
                            <BarChart2 size={16} className="mr-2 text-text-secondary" />
                            <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">Estatísticas</h3>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-xs text-text-muted mb-1">
                                    <span>{stats.homePossession}%</span>
                                    <span>Posse (Est.)</span>
                                    <span>{stats.awayPossession}%</span>
                                </div>
                                <div className="h-2 bg-background-tertiary rounded-full overflow-hidden flex">
                                    <div className="bg-primary h-full" style={{ width: `${stats.homePossession}%` }}></div>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 text-center text-sm items-center">
                                <div className="font-bold text-xl">{stats.homeShots}</div>
                                <div className="text-text-muted text-xs uppercase">Chutes</div>
                                <div className="font-bold text-xl">{stats.awayShots}</div>
                            </div>
                            <div className="grid grid-cols-3 text-center text-sm items-center">
                                <div className="font-bold text-xl text-status-warning">{stats.homeCards}</div>
                                <div className="text-text-muted text-xs uppercase">Cartões</div>
                                <div className="font-bold text-xl text-status-warning">{stats.awayCards}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-5 flex flex-col h-full bg-background-secondary rounded-lg border border-background-tertiary shadow-lg overflow-hidden">
                    <div className="p-4 border-b border-background-tertiary bg-background-tertiary/20 flex justify-between items-center">
                        <h3 className="font-bold text-text-primary flex items-center">
                            <MessageSquare size={16} className="mr-2" /> Narração
                        </h3>
                        {currentMinute < 94 ? (
                            <span className="text-xs text-text-muted animate-pulse flex items-center"><div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div> AO VIVO</span>
                        ) : (
                            <span className="text-xs text-text-muted">FINALIZADO</span>
                        )}
                    </div>
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2 flex flex-col-reverse">
                        {visibleEvents.length === 0 && <div className="text-center text-text-muted py-10 italic">A partida está prestes a começar...</div>}
                        {visibleEvents.map((event) => (
                            <EventRow key={event.id} event={event} isHome={event.clubId === homeClub.id} playerName={players[event.playerId]?.name || "Desconhecido"} />
                        ))}
                    </div>
                </div>

                <div className="lg:col-span-3 flex flex-col space-y-4">
                    <div className="bg-background-secondary p-4 rounded-lg border border-background-tertiary h-full flex flex-col justify-center items-center text-center">
                        {currentMinute >= 94 ? (
                            <div className="space-y-4 animate-in zoom-in duration-300">
                                <h2 className="text-2xl font-bold text-text-primary">Fim de Jogo</h2>
                                <Button size="lg" icon={ArrowLeft} onClick={() => setView("MATCH_RESULT")}>Ver Resultados</Button>
                            </div>
                        ) : (
                            <div className="text-text-muted opacity-50">
                                <Activity size={48} className="mx-auto mb-2" />
                                <p>Simulando...</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};