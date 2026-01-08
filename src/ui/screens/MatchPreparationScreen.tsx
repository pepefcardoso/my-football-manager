import React, { useState, useMemo, useEffect } from "react";
import { useGameStore } from "../../state/useGameStore";
import { useUIStore } from "../../state/useUIStore";
import { buildTeamContext, simulateSingleMatch } from "../../core/systems/MatchSystem";
import { TacticsSystem } from "../../core/systems/TacticsSystem";
import { calculateOverall, formatPosition, getAttributeColorClass } from "../../core/utils/playerUtils";
import { Button } from "../components/Button";
import { Skeleton } from "../components/Skeleton";
import { EmptyState } from "../components/EmptyState";
import { ArrowLeft, Play, Shirt, RefreshCw, CalendarX } from "lucide-react";

const PlayerListSkeleton = () => (
    <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between p-2 border border-background-tertiary rounded bg-background-secondary/50">
                <div className="flex items-center space-x-3 w-full">
                    <Skeleton className="w-8 h-5" />
                    <div className="space-y-1 flex-1">
                        <Skeleton className="w-3/4 h-4" />
                        <Skeleton className="w-1/2 h-3" />
                    </div>
                </div>
            </div>
        ))}
    </div>
);

export const MatchPreparationScreen: React.FC = () => {
    const { meta, setState } = useGameStore();
    const { matches } = useGameStore(s => s.matches);
    const { contracts } = useGameStore(s => s.market);
    const { players, playerStates } = useGameStore(s => s.people);
    const { clubs } = useGameStore(s => s.clubs);
    const { setView } = useUIStore();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 500);
        return () => clearTimeout(timer);
    }, []);

    const nextMatch = useMemo(() => {
        if (!meta.userClubId) return null;
        const allMatches = Object.values(matches);
        return allMatches
            .filter(m => m.status === "SCHEDULED" && (m.homeClubId === meta.userClubId || m.awayClubId === meta.userClubId))
            .sort((a, b) => a.datetime - b.datetime)[0];
    }, [matches, meta.userClubId]);

    const opponentId = nextMatch ? (nextMatch.homeClubId === meta.userClubId ? nextMatch.awayClubId : nextMatch.homeClubId) : null;
    const opponent = opponentId ? clubs[opponentId] : null;

    const initialLineup = useMemo(() => {
        return TacticsSystem.suggestOptimalLineup(
            meta.userClubId,
            players,
            contracts
        );
    }, [meta.userClubId, players, contracts]);

    const [lineup, setLineup] = useState(initialLineup);

    useEffect(() => {
        setLineup(initialLineup);
    }, [initialLineup]);

    const { starters, bench, reserves } = lineup;

    const handleAutoPick = () => {
        const optimized = TacticsSystem.suggestOptimalLineup(
            meta.userClubId,
            players,
            contracts
        );
        setLineup(optimized);
    };

    const movePlayer = (playerId: string, target: 'starter' | 'bench' | 'reserve') => {
        const newStarters = starters.filter(id => id !== playerId);
        const newBench = bench.filter(id => id !== playerId);
        const newReserves = reserves.filter(id => id !== playerId);

        if (target === 'starter') {
            if (newStarters.length >= 11) {
                const playerOrigin = starters.includes(playerId) ? 'starter' : bench.includes(playerId) ? 'bench' : 'reserve';
                if (playerOrigin !== 'starter') {
                    const removedId = newStarters.pop();
                    if (removedId) {
                        if (playerOrigin === 'bench') newBench.push(removedId);
                        else newReserves.push(removedId);
                    }
                }
            }
            newStarters.push(playerId);
        } else if (target === 'bench') {
            newBench.push(playerId);
        } else {
            newReserves.push(playerId);
        }
        setLineup({ starters: newStarters, bench: newBench, reserves: newReserves });
    };

    const handlePlayMatch = () => {
        if (!nextMatch || !meta.userClubId) return;
        if (starters.length !== 11) {
            alert("Você precisa selecionar exatamente 11 titulares!");
            return;
        }

        setState(state => {
            const userContext = buildTeamContext(state, meta.userClubId!, {
                startingXI: starters,
                bench: bench
            });
            const opponentId = nextMatch.homeClubId === meta.userClubId ? nextMatch.awayClubId : nextMatch.homeClubId;
            const opponentContext = buildTeamContext(state, opponentId);

            simulateSingleMatch(state, state.matches.matches[nextMatch.id],
                nextMatch.homeClubId === meta.userClubId ? userContext : opponentContext,
                nextMatch.homeClubId === meta.userClubId ? opponentContext : userContext
            );
        });
        setView("MATCH_LIVE");
    };

    const PlayerRow = ({ id, actionLabel, onAction }: { id: string, actionLabel: string, onAction: () => void }) => {
        const player = players[id];
        const state = playerStates[id];
        if (!player) return null;
        const ovr = calculateOverall(player);

        return (
            <div className="flex items-center justify-between p-2 bg-background border border-background-tertiary rounded mb-1 hover:border-primary/50 transition-colors group">
                <div className="flex items-center space-x-3">
                    <span className="w-8 text-xs font-bold text-text-secondary bg-background-tertiary px-1 rounded text-center">
                        {formatPosition(player.primaryPositionId)}
                    </span>
                    <div>
                        <div className="text-sm font-medium text-text-primary group-hover:text-primary transition-colors">{player.name}</div>
                        <div className="text-xs text-text-muted flex space-x-2">
                            <span>OVR: <span className={getAttributeColorClass(ovr)}>{ovr}</span></span>
                            <span>Cond: <span className={state?.fitness < 70 ? 'text-status-danger' : 'text-text-secondary'}>{state?.fitness}%</span></span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={onAction}
                    className="text-xs bg-background-tertiary text-text-secondary hover:bg-primary hover:text-white px-2 py-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                >
                    {actionLabel}
                </button>
            </div>
        );
    };

    if (!nextMatch || !opponent) {
        return (
            <div className="h-full flex flex-col">
                <div className="flex-none p-6 border-b border-background-tertiary">
                    <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => setView("DASHBOARD")}>Voltar</Button>
                </div>
                <div className="flex-1 flex items-center justify-center">
                    <EmptyState
                        icon={CalendarX}
                        title="Sem Jogos Agendados"
                        description="Você não tem partidas marcadas para os próximos dias. Avance o calendário."
                        actionLabel="Ir para Calendário"
                        onAction={() => setView("CALENDAR")}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col animate-in fade-in duration-300">
            <div className="flex justify-between items-center p-6 bg-background-secondary border-b border-background-tertiary shadow-sm z-10">
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => setView("DASHBOARD")}>Voltar</Button>
                    <div>
                        <h1 className="text-xl font-bold text-text-primary">Preparação de Jogo</h1>
                        <p className="text-sm text-text-secondary">vs {opponent.name} ({nextMatch.homeClubId === meta.userClubId ? 'Casa' : 'Fora'})</p>
                    </div>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="text-right mr-4">
                        <div className="text-xs text-text-muted uppercase tracking-wider">Titulares</div>
                        <div className={`text-2xl font-mono font-bold ${starters.length === 11 ? 'text-status-success' : 'text-status-danger'}`}>
                            {starters.length}/11
                        </div>
                    </div>
                    <Button
                        size="lg"
                        icon={Play}
                        onClick={handlePlayMatch}
                        disabled={starters.length !== 11 || isLoading}
                        className="shadow-lg shadow-primary/20"
                    >
                        Iniciar Partida
                    </Button>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 overflow-hidden bg-background">

                <div className="bg-background-secondary rounded-lg border border-background-tertiary flex flex-col h-full overflow-hidden shadow-sm">
                    <div className="p-3 border-b border-background-tertiary bg-primary/5 flex justify-between items-center">
                        <h3 className="font-bold text-primary flex items-center uppercase text-xs tracking-wider"><Shirt size={14} className="mr-2" /> Titulares</h3>
                        {!isLoading && <span className="text-xs text-text-muted">{starters.length} selecionados</span>}
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                        {isLoading ? <PlayerListSkeleton /> : (
                            <>
                                {starters.length === 0 && <div className="text-center text-text-muted py-8 text-sm italic">Nenhum jogador selecionado</div>}
                                {starters.map(id => (
                                    <PlayerRow key={id} id={id} actionLabel="Mover p/ Banco" onAction={() => movePlayer(id, 'bench')} />
                                ))}
                            </>
                        )}
                    </div>
                </div>

                <div className="bg-background-secondary rounded-lg border border-background-tertiary flex flex-col h-full overflow-hidden shadow-sm">
                    <div className="p-3 border-b border-background-tertiary bg-background-tertiary/20 flex justify-between items-center">
                        <h3 className="font-bold text-text-secondary uppercase text-xs tracking-wider">Banco de Reservas</h3>
                        {!isLoading && <span className="text-xs text-text-muted">{bench.length} / 7</span>}
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                        {isLoading ? <PlayerListSkeleton /> : (
                            <>
                                {bench.map(id => (
                                    <PlayerRow key={id} id={id} actionLabel="Tornar Titular" onAction={() => movePlayer(id, 'starter')} />
                                ))}
                                {bench.length === 0 && <div className="text-center text-text-muted py-8 text-xs italic">Banco vazio</div>}
                            </>
                        )}
                    </div>
                </div>

                <div className="bg-background-secondary rounded-lg border border-background-tertiary flex flex-col h-full overflow-hidden shadow-sm">
                    <div className="p-3 border-b border-background-tertiary bg-background-tertiary/20 flex justify-between items-center">
                        <h3 className="font-bold text-text-muted uppercase text-xs tracking-wider">Não Relacionados</h3>
                        <button
                            className="text-xs text-primary hover:text-primary-hover hover:underline flex items-center transition-colors font-medium"
                            onClick={handleAutoPick}
                            title="Restaurar melhor escalação automática"
                            disabled={isLoading}
                        >
                            <RefreshCw size={12} className="mr-1" /> Auto-seleção
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                        {isLoading ? <PlayerListSkeleton /> : (
                            <>
                                {reserves.map(id => (
                                    <PlayerRow key={id} id={id} actionLabel="Relacionar" onAction={() => movePlayer(id, 'bench')} />
                                ))}
                                {reserves.length === 0 && <div className="text-center text-text-muted py-8 text-xs italic">Todos os jogadores relacionados</div>}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};