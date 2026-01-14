import React, { useMemo, useEffect } from "react";
import { useGameStore } from "../../state/useGameStore";
import { useUIStore } from "../../state/useUIStore";
import { calculateOverall, formatPosition, getAttributeColorClass } from "../../core/utils/playerUtils";
import { Button } from "../components/Button";
import { Skeleton } from "../components/Skeleton";
import { EmptyState } from "../components/EmptyState";
import { ArrowLeft, Play, Shirt, RefreshCw, CalendarX } from "lucide-react";
import { selectClubById } from "../../state/selectors";

const PlayerListSkeleton = () => (
    <div className="space-y-2 animate-pulse">
        {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center justify-between p-2 border border-white/5 rounded bg-white/5">
                <div className="flex items-center space-x-3 w-full">
                    <Skeleton className="w-8 h-5" />
                    <div className="space-y-1 flex-1">
                        <Skeleton className="w-3/4 h-3" />
                        <Skeleton className="w-1/2 h-2" />
                    </div>
                </div>
            </div>
        ))}
    </div>
);

const PlayerRow = React.memo(({ id, actionLabel, onAction }: { id: string, actionLabel: string, onAction: () => void }) => {
    const player = useGameStore(s => s.people.players[id]);
    const state = useGameStore(s => s.people.playerStates[id]);

    if (!player) return null;
    const ovr = calculateOverall(player);

    return (
        <div className="flex items-center justify-between p-2 bg-background border border-background-tertiary rounded mb-1 hover:border-primary/50 transition-colors duration-200 group">
            <div className="flex items-center space-x-3">
                <span className="w-8 text-xs font-bold text-text-secondary bg-background-tertiary px-1 rounded text-center">
                    {formatPosition(player.primaryPositionId)}
                </span>
                <div>
                    <div className="text-sm font-medium text-text-primary group-hover:text-primary transition-colors">{player.name}</div>
                    <div className="text-xs text-text-muted flex space-x-2">
                        <span>OVR: <span className={getAttributeColorClass(ovr)}>{ovr}</span></span>
                        <span>Cond: <span className={state?.fitness < 70 ? 'text-status-danger' : 'text-text-secondary'}>{state?.fitness ?? 100}%</span></span>
                    </div>
                </div>
            </div>
            <button
                onClick={onAction}
                className="text-xs bg-background-tertiary text-text-secondary hover:bg-primary hover:text-white px-2 py-1 rounded transition-colors duration-200 opacity-0 group-hover:opacity-100"
            >
                {actionLabel}
            </button>
        </div>
    );
});

PlayerRow.displayName = "PlayerRow";

export const MatchPreparationScreen: React.FC = () => {
    const {
        meta,
        playMatch,
        autoPickLineup,
        movePlayerInLineup
    } = useGameStore();

    const matchesDomain = useGameStore(s => s.matches);
    const tempLineup = useGameStore(s => s.matches.tempLineup);
    const { setView, activeMatchId } = useUIStore();

    const currentMatch = useMemo(() => {
        if (activeMatchId && matchesDomain.matches[activeMatchId]) {
            return matchesDomain.matches[activeMatchId];
        }
        if (!meta.userClubId) return null;

        return Object.values(matchesDomain.matches)
            .filter(m => m.status === "SCHEDULED" && (m.homeClubId === meta.userClubId || m.awayClubId === meta.userClubId))
            .sort((a, b) => a.datetime - b.datetime)[0];
    }, [matchesDomain.matches, meta.userClubId, activeMatchId]);

    const opponent = useGameStore(selectClubById(
        currentMatch
            ? (currentMatch.homeClubId === meta.userClubId ? currentMatch.awayClubId : currentMatch.homeClubId)
            : null
    ));

    useEffect(() => {
        if (meta.userClubId && !tempLineup) {
            autoPickLineup();
        }
    }, [meta.userClubId, tempLineup, autoPickLineup]);

    const handlePlayMatch = () => {
        if (!currentMatch) return;

        if (tempLineup && tempLineup.starters.length !== 11) {
            alert("Você precisa selecionar exatamente 11 titulares!");
            return;
        }

        try {
            playMatch(currentMatch.id);
            setView("MATCH_LIVE", currentMatch.id);
        } catch (error) {
            console.error("Falha ao iniciar partida:", error);
        }
    };

    if (!currentMatch || !opponent) {
        return (
            <div className="h-full flex flex-col">
                <div className="flex-none p-6 border-b border-background-tertiary">
                    <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => setView("DASHBOARD")}>Voltar</Button>
                </div>
                <div className="flex-1 flex items-center justify-center">
                    <EmptyState
                        icon={CalendarX}
                        title="Sem Jogos Agendados"
                        description="Você não tem partidas marcadas para os próximos dias."
                        actionLabel="Ir para Calendário"
                        onAction={() => setView("CALENDAR")}
                    />
                </div>
            </div>
        );
    }

    if (!tempLineup) {
        return (
            <div className="h-full flex flex-col animate-in fade-in duration-300">
                <div className="p-6 border-b border-background-tertiary">
                    <Skeleton className="w-48 h-8" />
                </div>
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
                    <PlayerListSkeleton />
                </div>
            </div>
        );
    }

    const isReady = tempLineup.starters.length === 11;

    return (
        <div className="h-full flex flex-col animate-in fade-in duration-300">
            <div className="flex justify-between items-center p-6 bg-background-secondary border-b border-background-tertiary shadow-sm z-10">
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => setView("DASHBOARD")}>Voltar</Button>
                    <div>
                        <h1 className="text-xl font-bold text-text-primary">Preparação de Jogo</h1>
                        <p className="text-sm text-text-secondary">vs {opponent.name} ({currentMatch.homeClubId === meta.userClubId ? 'Casa' : 'Fora'})</p>
                    </div>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="text-right mr-4">
                        <div className="text-xs text-text-muted uppercase tracking-wider">Titulares</div>
                        <div className={`text-2xl font-mono font-bold ${isReady ? 'text-status-success' : 'text-status-danger'}`}>
                            {tempLineup.starters.length}/11
                        </div>
                    </div>
                    <Button
                        size="lg"
                        icon={Play}
                        onClick={handlePlayMatch}
                        disabled={!isReady}
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
                        <span className="text-xs text-text-muted">{tempLineup.starters.length} selecionados</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                        {tempLineup.starters.map(id => (
                            <PlayerRow
                                key={id}
                                id={id}
                                actionLabel="Mover p/ Banco"
                                onAction={() => movePlayerInLineup(id, 'bench')}
                            />
                        ))}
                    </div>
                </div>

                <div className="bg-background-secondary rounded-lg border border-background-tertiary flex flex-col h-full overflow-hidden shadow-sm">
                    <div className="p-3 border-b border-background-tertiary bg-background-tertiary/20 flex justify-between items-center">
                        <h3 className="font-bold text-text-secondary uppercase text-xs tracking-wider">Banco de Reservas</h3>
                        <span className="text-xs text-text-muted">{tempLineup.bench.length} / 7</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                        {tempLineup.bench.map(id => (
                            <PlayerRow
                                key={id}
                                id={id}
                                actionLabel="Tornar Titular"
                                onAction={() => movePlayerInLineup(id, 'starters')}
                            />
                        ))}
                    </div>
                </div>

                <div className="bg-background-secondary rounded-lg border border-background-tertiary flex flex-col h-full overflow-hidden shadow-sm">
                    <div className="p-3 border-b border-background-tertiary bg-background-tertiary/20 flex justify-between items-center">
                        <h3 className="font-bold text-text-muted uppercase text-xs tracking-wider">Não Relacionados</h3>
                        <button
                            className="text-xs text-primary hover:text-primary-hover hover:underline flex items-center transition-colors font-medium"
                            onClick={() => autoPickLineup()}
                            title="Restaurar melhor escalação automática"
                        >
                            <RefreshCw size={12} className="mr-1" /> Auto-seleção
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                        {tempLineup.reserves.map(id => (
                            <PlayerRow
                                key={id}
                                id={id}
                                actionLabel="Relacionar"
                                onAction={() => movePlayerInLineup(id, 'bench')}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};