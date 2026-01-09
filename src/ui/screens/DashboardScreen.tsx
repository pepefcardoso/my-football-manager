import React from "react";
import { useGameStore } from "../../state/useGameStore";
import { useUIStore } from "../../state/useUIStore";
import { formatMoney, formatDate, formatDateTime } from "../../core/utils/formatters";
import { Button } from "../components/Button";
import { ClubBadge } from "../components/ClubBadge";
import { Play, Calendar, TrendingUp, Trophy, AlertCircle } from "lucide-react";
import { executeGameDay } from "../../core/systems/GameLoopSystem";
import {
    selectUserClubId,
    selectCurrentDate,
    selectClubById,
    selectClubFinances,
    selectDashboardNextMatchInfo
} from "../../state/selectors";

export const DashboardScreen: React.FC = () => {
    const { advanceDay, saveGame, meta } = useGameStore();
    const { setView, startProcessing, stopProcessing, isProcessing } = useUIStore();

    const userClubId = useGameStore(selectUserClubId);
    const currentDate = useGameStore(selectCurrentDate);

    const userClub = useGameStore(selectClubById(userClubId));
    const userFinances = useGameStore(selectClubFinances(userClubId));

    const nextMatchInfo = useGameStore(selectDashboardNextMatchInfo);

    const handleAdvanceDay = async () => {
        if (isProcessing) return;
        try {
            await executeGameDay({
                saveName: meta.saveName,
                onProgress: (message, type) => startProcessing(message, type),
                onAdvance: advanceDay,
                onSave: saveGame
            });
            stopProcessing(1000);
        } catch (error) {
            console.error(error);
            stopProcessing();
            alert(`Erro: ${error instanceof Error ? error.message : "Desconhecido"}`);
        }
    };

    if (!userClub || !userFinances) return <div className="p-8">Carregando dados do clube...</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-background-secondary p-6 rounded-lg border border-background-tertiary shadow-lg">
                <div className="flex items-center space-x-4 mb-4 md:mb-0">
                    <div className="w-16 h-16 rounded-full bg-background border-2 p-1" style={{ borderColor: userClub.primaryColor }}>
                        <ClubBadge badgeId={userClub.badgeId} clubName={userClub.name} className="w-full h-full" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-text-primary">{userClub.name}</h1>
                        <div className="text-sm text-text-secondary flex items-center space-x-2">
                            <Calendar size={14} />
                            <span>{formatDate(currentDate)}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center space-x-4">
                    <div className="text-right mr-4 hidden md:block">
                        <div className="text-xs text-text-muted uppercase tracking-wider">Próximo Evento</div>
                        <div className="text-sm font-medium text-text-primary">
                            {nextMatchInfo ? "Dia de Jogo" : "Treino"}
                        </div>
                    </div>
                    <Button
                        size="lg"
                        icon={Play}
                        onClick={handleAdvanceDay}
                        disabled={isProcessing}
                        className="shadow-lg shadow-primary/20"
                    >
                        {isProcessing ? "Processando..." : "Avançar Dia"}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                <div className="bg-background-secondary p-5 rounded-lg border border-background-tertiary shadow-md flex flex-col">
                    <div className="flex items-center justify-between mb-4 border-b border-background-tertiary pb-2">
                        <h3 className="font-bold text-text-secondary uppercase text-xs tracking-wider flex items-center">
                            <Trophy size={14} className="mr-2" /> Próxima Partida
                        </h3>
                        {nextMatchInfo && (
                            <span className="text-xs px-2 py-0.5 rounded bg-background text-text-muted">
                                {nextMatchInfo.locationLabel}
                            </span>
                        )}
                    </div>

                    {nextMatchInfo ? (
                        <div className="flex-1 flex flex-col justify-center items-center text-center space-y-2">
                            <div className="text-sm text-text-muted">Contra</div>
                            <div className="text-xl font-bold text-text-primary truncate w-full">
                                {nextMatchInfo.opponentName}
                            </div>
                            <div className="text-sm text-primary font-mono bg-primary/10 px-3 py-1 rounded">
                                {formatDateTime(nextMatchInfo.datetime)}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col justify-center items-center text-text-muted">
                            <AlertCircle size={24} className="mb-2 opacity-50" />
                            <span>Sem jogos agendados</span>
                        </div>
                    )}

                    <div className="mt-4 pt-2 border-t border-background-tertiary">
                        <Button
                            variant="secondary"
                            size="sm"
                            className="w-full"
                            onClick={() => setView("MATCH_PREPARATION")}
                            disabled={!nextMatchInfo || isProcessing}
                        >
                            Preparar Equipa
                        </Button>
                    </div>
                </div>

                <div className="bg-background-secondary p-5 rounded-lg border border-background-tertiary shadow-md">
                    <div className="flex items-center justify-between mb-4 border-b border-background-tertiary pb-2">
                        <h3 className="font-bold text-text-secondary uppercase text-xs tracking-wider flex items-center">
                            <Trophy size={14} className="mr-2" /> Status do Clube
                        </h3>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-text-secondary">Reputação</span>
                                <span className="text-text-primary font-mono">{userClub.reputation}</span>
                            </div>
                            <div className="h-2 bg-background-tertiary rounded-full overflow-hidden">
                                <div className="h-full bg-primary transition-all duration-500" style={{ width: `${(userClub.fanBaseCurrent / userClub.fanBaseMax) * 100}%` }} />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-text-secondary">Torcida</span>
                                <span className="text-text-primary font-mono">{(userClub.fanBaseCurrent / 1000).toFixed(1)}k</span>
                            </div>
                            <div className="h-2 bg-background-tertiary rounded-full overflow-hidden">
                                <div className="h-full bg-primary transition-all duration-500" style={{ width: `${(userClub.fanBaseCurrent / userClub.fanBaseMax) * 100}%` }} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-background-secondary p-5 rounded-lg border border-background-tertiary shadow-md">
                    <div className="flex items-center justify-between mb-4 border-b border-background-tertiary pb-2">
                        <h3 className="font-bold text-text-secondary uppercase text-xs tracking-wider flex items-center">
                            <TrendingUp size={14} className="mr-2" /> Finanças
                        </h3>
                    </div>
                    <div className="flex flex-col justify-center h-32 space-y-1">
                        <span className="text-sm text-text-muted">Saldo Atual</span>
                        <span className={`text-2xl font-mono font-bold ${userFinances.balanceCurrent >= 0 ? 'text-status-success' : 'text-status-danger'}`}>
                            {formatMoney(userFinances.balanceCurrent)}
                        </span>
                        <div className="pt-4 flex justify-between items-center text-xs">
                            <span className="text-text-muted">Dívida:</span>
                            <span className="text-status-warning font-mono">{formatMoney(userFinances.debtHistorical)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};