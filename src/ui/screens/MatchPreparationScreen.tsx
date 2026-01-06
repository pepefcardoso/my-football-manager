import React, { useState, useMemo } from "react";
import { useGameStore } from "../../state/useGameStore";
import { useUIStore } from "../../state/useUIStore";
import { buildTeamContext, simulateSingleMatch } from "../../core/systems/MatchSystem";
import { calculateOverall, formatPosition, getAttributeColorClass } from "../../core/utils/playerUtils";
import { Button } from "../components/Button";
import { ArrowLeft, Play, Shirt, RefreshCw } from "lucide-react";

export const MatchPreparationScreen: React.FC = () => {
    const { meta, matches, contracts, players, playerStates, clubs, setState } = useGameStore();
    const { setView } = useUIStore();

    const nextMatch = useMemo(() => {
        if (!meta.userClubId) return null;
        const allMatches = Object.values(matches);
        return allMatches
            .filter(m => m.status === "SCHEDULED" && (m.homeClubId === meta.userClubId || m.awayClubId === meta.userClubId))
            .sort((a, b) => a.datetime - b.datetime)[0];
    }, [matches, meta.userClubId]);

    const opponentId = nextMatch ? (nextMatch.homeClubId === meta.userClubId ? nextMatch.awayClubId : nextMatch.homeClubId) : null;
    const opponent = opponentId ? clubs[opponentId] : null;

    const getSuggestedLineup = () => {
        if (!meta.userClubId) return { starters: [], bench: [], reserves: [] };

        const clubPlayerIds = Object.values(contracts)
            .filter(c => c.clubId === meta.userClubId && c.active)
            .map(c => c.playerId);

        const mockState = {
            clubs, contracts, players, teamTactics: {}, meta
        } as any;

        const context = buildTeamContext(mockState, meta.userClubId);

        const starters = context.startingXI.map(p => p.id);
        const bench = context.bench.map(p => p.id);

        const usedIds = new Set([...starters, ...bench]);
        const reserves = clubPlayerIds.filter(id => !usedIds.has(id));

        return { starters, bench, reserves };
    };

    const [lineup, setLineup] = useState(getSuggestedLineup);
    const { starters, bench, reserves } = lineup;

    const handleAutoPick = () => {
        setLineup(getSuggestedLineup());
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

            simulateSingleMatch(state, state.matches[nextMatch.id],
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
            <div className="flex items-center justify-between p-2 bg-background border border-background-tertiary rounded mb-1 hover:border-primary/50 transition-colors">
                <div className="flex items-center space-x-3">
                    <span className="w-8 text-xs font-bold text-text-secondary bg-background-tertiary px-1 rounded text-center">
                        {formatPosition(player.primaryPositionId)}
                    </span>
                    <div>
                        <div className="text-sm font-medium text-text-primary">{player.name}</div>
                        <div className="text-xs text-text-muted flex space-x-2">
                            <span>OVR: <span className={getAttributeColorClass(ovr)}>{ovr}</span></span>
                            <span>Cond: {state?.fitness}%</span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={onAction}
                    className="text-xs bg-background-tertiary hover:bg-primary hover:text-white px-2 py-1 rounded transition-colors"
                >
                    {actionLabel}
                </button>
            </div>
        );
    };

    if (!nextMatch || !opponent) return <div className="p-8">Nenhuma partida agendada.</div>;

    return (
        <div className="h-full flex flex-col animate-in fade-in duration-300">
            <div className="flex justify-between items-center p-6 bg-background-secondary border-b border-background-tertiary">
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => setView("DASHBOARD")}>Voltar</Button>
                    <div>
                        <h1 className="text-xl font-bold text-text-primary">Preparação de Jogo</h1>
                        <p className="text-sm text-text-secondary">vs {opponent.name} ({nextMatch.homeClubId === meta.userClubId ? 'Casa' : 'Fora'})</p>
                    </div>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="text-right mr-4">
                        <div className="text-xs text-text-muted">Titulares</div>
                        <div className={`text-lg font-bold ${starters.length === 11 ? 'text-status-success' : 'text-status-danger'}`}>
                            {starters.length}/11
                        </div>
                    </div>
                    <Button
                        size="lg"
                        icon={Play}
                        onClick={handlePlayMatch}
                        disabled={starters.length !== 11}
                        className="shadow-lg shadow-primary/20"
                    >
                        Iniciar Partida
                    </Button>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 overflow-hidden">
                <div className="bg-background-secondary rounded-lg border border-background-tertiary flex flex-col h-full overflow-hidden">
                    <div className="p-3 border-b border-background-tertiary bg-primary/10 flex justify-between items-center">
                        <h3 className="font-bold text-primary flex items-center"><Shirt size={16} className="mr-2" /> Titulares</h3>
                        <span className="text-xs text-text-muted">{starters.length} selecionados</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                        {starters.length === 0 && <div className="text-center text-text-muted py-8">Nenhum jogador selecionado</div>}
                        {starters.map(id => (
                            <PlayerRow key={id} id={id} actionLabel="Mover para Banco" onAction={() => movePlayer(id, 'bench')} />
                        ))}
                    </div>
                </div>

                <div className="bg-background-secondary rounded-lg border border-background-tertiary flex flex-col h-full overflow-hidden">
                    <div className="p-3 border-b border-background-tertiary bg-background-tertiary/20 flex justify-between items-center">
                        <h3 className="font-bold text-text-secondary">Banco de Reservas</h3>
                        <span className="text-xs text-text-muted">{bench.length} / 7</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                        {bench.map(id => (
                            <PlayerRow key={id} id={id} actionLabel="Tornar Titular" onAction={() => movePlayer(id, 'starter')} />
                        ))}
                        {bench.length === 0 && <div className="text-center text-text-muted py-8 text-xs">Banco vazio</div>}
                    </div>
                </div>

                <div className="bg-background-secondary rounded-lg border border-background-tertiary flex flex-col h-full overflow-hidden">
                    <div className="p-3 border-b border-background-tertiary bg-background-tertiary/20 flex justify-between items-center">
                        <h3 className="font-bold text-text-muted">Não Relacionados</h3>
                        <button
                            className="text-xs text-primary hover:underline flex items-center transition-colors"
                            onClick={handleAutoPick}
                        >
                            <RefreshCw size={12} className="mr-1" /> Auto-completar
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                        {reserves.map(id => (
                            <PlayerRow key={id} id={id} actionLabel="Relacionar" onAction={() => movePlayer(id, 'bench')} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};