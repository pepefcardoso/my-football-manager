import { useEffect, useState, useCallback } from "react";
import { Logger } from "../../lib/Logger";
import { useGameStore } from "../../store/useGameStore";
import type { Team, ScoutingSlot, Player } from "../../domain/models";
import { ScoutingSlotCard } from "../features/scouting/ScoutingSlotCard";
import { SearchResultsGrid } from "../features/scouting/SearchResultsGrid";
import { TransferProposalModal } from "../features/transfer/TransferProposalModal";
import { useTransferStore } from "../../store/useTransferStore";
import { TransferStatus } from "../../domain/enums";
import Badge from "../common/Badge";
import { formatCurrency } from "../../utils/formatters";

const logger = new Logger("TransferHubPage");

type HubTab = "results" | "market" | "negotiations" | "history";

interface TransferHubPageProps {
    teamId: number;
}

function TransferHubPage({ teamId }: TransferHubPageProps) {
    const [activeTab, setActiveTab] = useState<HubTab>("results");
    const [team, setTeam] = useState<Team | null>(null);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
    const { userTeam, currentDate } = useGameStore();
    const [currentSeasonId, setCurrentSeasonId] = useState<number>(1);
    const { receivedProposals, sentProposals, fetchProposals } = useTransferStore();

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const gameState = await window.electronAPI.game.getGameState();
            if (gameState?.currentSeasonId) {
                setCurrentSeasonId(gameState.currentSeasonId);
            }

            const teamsData = await window.electronAPI.team.getTeams();
            const myTeam = teamsData.find(t => t.id === teamId) || null;
            setTeam(myTeam);

            await fetchProposals(teamId);

            const scoutingList = await window.electronAPI.scouting.getScoutingList(teamId);

            const viewPromises = scoutingList.map(async (report) => {
                return await window.electronAPI.scouting.getScoutedPlayer(report.playerId, teamId);
            });
            const views = await Promise.all(viewPromises);
            setSearchResults(views.filter(v => v !== null));

        } catch (error) {
            logger.error("Erro ao carregar dados do Hub:", error);
        } finally {
            setLoading(false);
        }
    }, [teamId, fetchProposals]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleConfigureSlot = async (slotNumber: number) => {
        if (!team) return;

        const newSlots = (team.scoutingSlots || []).map(s => {
            if (s.slotNumber === slotNumber) {
                return {
                    ...s,
                    isActive: true,
                    filters: {
                        position: "FW",
                        ageGroup: "young",
                        country: "Global"
                    },
                    stats: { playersFound: 0, lastRunDate: null }
                } as ScoutingSlot;
            }
            return s;
        });

        try {
            const success = await window.electronAPI.scouting.updateSlots(teamId, newSlots);
            if (success) {
                logger.info(`Slot ${slotNumber} ativado com sucesso.`);
                loadData();
            }
        } catch (error) {
            logger.error("Erro ao salvar configuração do slot:", error);
        }
    };

    const handleStopSlot = async (slotNumber: number) => {
        if (!team) return;

        const newSlots = (team.scoutingSlots || []).map(s => {
            if (s.slotNumber === slotNumber) {
                return { ...s, isActive: false };
            }
            return s;
        });

        try {
            await window.electronAPI.scouting.updateSlots(teamId, newSlots);
            loadData();
        } catch (error) {
            logger.error("Erro ao parar slot:", error);
        }
    };

    const renderNegotiations = () => {
        const activeSent = sentProposals.filter(p => p.status !== TransferStatus.COMPLETED);
        const activeReceived = receivedProposals.filter(p => p.status !== TransferStatus.COMPLETED);

        return (
            <div className="space-y-8">
                <section>
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        📤 Minhas Ofertas <span className="text-sm font-normal text-slate-500">({activeSent.length})</span>
                    </h3>
                    {activeSent.length === 0 && <p className="text-slate-500 text-sm">Nenhuma oferta enviada.</p>}
                    <div className="space-y-3">
                        {activeSent.map(prop => (
                            <div key={prop.id} className="bg-slate-900 border border-slate-800 p-4 rounded flex justify-between items-center hover:border-slate-700 transition-colors">
                                <div>
                                    <div className="font-bold text-white">{(prop as any).player?.lastName}</div>
                                    <div className="text-xs text-slate-400">
                                        Oferta: <span className="text-emerald-400">{formatCurrency(prop.fee)}</span> • Time: {(prop as any).toTeam?.shortName || "Agente Livre"}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <Badge variant={prop.status === TransferStatus.ACCEPTED ? 'success' : prop.status === TransferStatus.REJECTED ? 'danger' : 'warning'}>
                                        {prop.status}
                                    </Badge>
                                    <div className="text-[10px] text-slate-500 mt-1">
                                        Prazo: {new Date(prop.responseDeadline).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section>
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        📥 Propostas Recebidas <span className="text-sm font-normal text-slate-500">({activeReceived.length})</span>
                    </h3>
                    {activeReceived.length === 0 && <p className="text-slate-500 text-sm">Nenhuma proposta recebida.</p>}
                    <div className="space-y-3">
                        {activeReceived.map(prop => (
                            <div key={prop.id} className="bg-slate-900 border border-blue-900/30 p-4 rounded flex justify-between items-center hover:border-blue-500/50 transition-colors">
                                <div>
                                    <div className="font-bold text-white">{(prop as any).player?.lastName}</div>
                                    <div className="text-xs text-slate-400">
                                        De: <span className="text-white">{(prop as any).fromTeam?.name}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <div className="font-mono text-emerald-400 font-bold">{formatCurrency(prop.fee)}</div>
                                        <div className="text-[10px] text-slate-500">Salário: {formatCurrency(prop.wageOffer)}</div>
                                    </div>
                                    <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded transition-colors">
                                        Responder
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        );
    };

    return (
        <div className="flex h-full bg-slate-950 text-white overflow-hidden">
            <aside className="w-1/4 min-w-[300px] border-r border-slate-800 p-6 overflow-y-auto bg-slate-950/50">
                <h2 className="text-xl font-light mb-6 flex items-center gap-2">
                    <span className="text-2xl">📡</span> Scouting Network
                </h2>

                <div className="space-y-4">
                    {team?.scoutingSlots?.map((slot) => (
                        <ScoutingSlotCard
                            key={slot.slotNumber}
                            slot={slot}
                            onConfigure={handleConfigureSlot}
                            onStop={handleStopSlot}
                        />
                    ))}
                    {(!team?.scoutingSlots || team.scoutingSlots.length === 0) && (
                        <div className="text-slate-500 text-sm text-center">
                            Carregando slots...
                        </div>
                    )}
                </div>
            </aside>

            <main className="flex-1 flex flex-col min-w-0 bg-slate-950">
                <header className="border-b border-slate-800 px-8 pt-8 pb-0">
                    <div className="flex justify-between items-end mb-6">
                        <h1 className="text-3xl font-bold tracking-tight">Transfer Hub</h1>
                        <div className="text-right">
                            <p className="text-xs text-slate-500">Orçamento Disponível</p>
                            <p className="text-xl font-mono text-emerald-400">{formatCurrency(userTeam?.budget || 0)}</p>
                        </div>
                    </div>

                    <nav className="flex gap-6">
                        <button
                            onClick={() => setActiveTab("results")}
                            className={`pb-4 text-sm font-medium border-b-2 transition-colors ${activeTab === "results" ? "border-emerald-500 text-white" : "border-transparent text-slate-400 hover:text-slate-200"
                                }`}
                        >
                            Relatórios
                        </button>
                        <button
                            onClick={() => setActiveTab("negotiations")}
                            className={`pb-4 text-sm font-medium border-b-2 transition-colors ${activeTab === "negotiations" ? "border-emerald-500 text-white" : "border-transparent text-slate-400 hover:text-slate-200"
                                }`}
                        >
                            Negociações
                        </button>
                        <button
                            onClick={() => setActiveTab("market")}
                            className={`pb-4 text-sm font-medium border-b-2 transition-colors ${activeTab === "market" ? "border-emerald-500 text-white" : "border-transparent text-slate-400 hover:text-slate-200"
                                }`}
                        >
                            Mercado Livre
                        </button>
                    </nav>
                </header>

                <div className="flex-1 overflow-y-auto p-8">
                    {activeTab === "results" && (
                        <SearchResultsGrid
                            players={searchResults}
                            loading={loading}
                            onPlayerClick={setSelectedPlayer}
                        />
                    )}

                    {activeTab === "negotiations" && renderNegotiations()}

                    {activeTab === "market" && (
                        <div className="text-center text-slate-500 mt-10">
                            <button
                                className="px-4 py-2 bg-slate-800 rounded hover:bg-slate-700 text-sm"
                                onClick={async () => {
                                    setLoading(true);
                                    const freeAgents = await window.electronAPI.player.getFreeAgents();
                                    setSearchResults(freeAgents);
                                    setLoading(false);
                                    setActiveTab("results");
                                }}
                            >
                                Buscar Agentes Livres
                            </button>
                        </div>
                    )}
                </div>
            </main>

            {selectedPlayer && userTeam && (
                <TransferProposalModal
                    player={selectedPlayer as any}
                    proposingTeamId={userTeam.id}
                    proposingTeamBudget={userTeam.budget || 0}
                    currentDate={currentDate}
                    seasonId={currentSeasonId}
                    onClose={() => setSelectedPlayer(null)}
                    onProposalSent={() => {
                        setSelectedPlayer(null);
                        loadData();
                    }}
                />
            )}
        </div>
    );
}

export default TransferHubPage;