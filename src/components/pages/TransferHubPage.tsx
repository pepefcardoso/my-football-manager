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

interface ScoutingConfigModalProps {
    slotNumber: number;
    onSave: (config: ScoutingSlot['filters']) => void;
    onClose: () => void;
}

function ScoutingConfigModal({ slotNumber, onSave, onClose }: ScoutingConfigModalProps) {
    const [filters, setFilters] = useState<ScoutingSlot['filters']>({
        country: "BRA",
        position: "FW",
        ageGroup: "young",
        contractStatus: "any"
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(filters);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
                <div className="p-5 border-b border-slate-800">
                    <h3 className="text-xl font-bold text-white">Configurar Slot #{slotNumber}</h3>
                    <p className="text-xs text-slate-400">Defina os critérios para o olheiro buscar talentos.</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Posição Foco</label>
                        <select
                            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                            value={filters.position}
                            onChange={e => setFilters({ ...filters, position: e.target.value })}
                        >
                            <option value="GK">Guarda-Redes (GK)</option>
                            <option value="DF">Defesa (DF)</option>
                            <option value="MF">Meio-Campo (MF)</option>
                            <option value="FW">Ataque (FW)</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Região / País</label>
                        <select
                            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                            value={filters.country}
                            onChange={e => setFilters({ ...filters, country: e.target.value })}
                        >
                            <option value="Global">Global (Mundo Todo)</option>
                            <option value="BRA">Brasil</option>
                            <option value="ARG">Argentina</option>
                            <option value="ESP">Espanha</option>
                            <option value="ENG">Inglaterra</option>
                            <option value="FRA">França</option>
                            <option value="ITA">Itália</option>
                            <option value="GER">Alemanha</option>
                            <option value="POR">Portugal</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Faixa Etária</label>
                        <select
                            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                            value={filters.ageGroup}
                            onChange={e => setFilters({ ...filters, ageGroup: e.target.value as any })}
                        >
                            <option value="young">Jovens Promessas (&lt; 23 anos)</option>
                            <option value="prime">Auge (24-29 anos)</option>
                            <option value="veteran">Veteranos (&gt; 30 anos)</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded transition-colors">
                            Iniciar Busca
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

interface TransferHubPageProps {
    teamId: number;
}

function TransferHubPage({ teamId }: TransferHubPageProps) {
    const [activeTab, setActiveTab] = useState<HubTab>("results");
    const [team, setTeam] = useState<Team | null>(null);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
    const [configuringSlot, setConfiguringSlot] = useState<number | null>(null);
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
            let myTeam = teamsData.find(t => t.id === teamId) || null;

            const slots = await window.electronAPI.scouting.getSlots(teamId);

            if (myTeam) {
                myTeam = { ...myTeam, scoutingSlots: slots };
            }

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

    const handleConfigureClick = (slotNumber: number) => {
        setConfiguringSlot(slotNumber);
    };

    const handleSaveSlotConfig = async (filters: ScoutingSlot['filters']) => {
        if (!team || configuringSlot === null) return;

        const newSlots = (team.scoutingSlots || []).map(s => {
            if (s.slotNumber === configuringSlot) {
                return {
                    ...s,
                    isActive: true,
                    filters: filters,
                    stats: { playersFound: 0, lastRunDate: null }
                } as ScoutingSlot;
            }
            return s;
        });

        try {
            const success = await window.electronAPI.scouting.updateSlots(teamId, newSlots);
            if (success) {
                logger.info(`Slot ${configuringSlot} ativado com sucesso.`);
                setConfiguringSlot(null);
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

    const handleFinalizeTransfer = async (proposalId: number) => {
        if (!confirm("Tem certeza que deseja finalizar esta transferência? O valor será debitado do seu orçamento imediatamente.")) return;

        setLoading(true);
        try {
            const result = await window.electronAPI.transfer.finalizeTransfer(proposalId);
            if (result.success) {
                logger.info("Transferência finalizada com sucesso!");
                alert("Transferência concluída! O jogador agora faz parte do seu elenco.");
                loadData();
            } else {
                alert(`Erro ao finalizar: ${result.message}`);
            }
        } catch (error) {
            logger.error("Erro crítico ao finalizar transferência:", error);
            alert("Erro interno ao finalizar transferência.");
        } finally {
            setLoading(false);
        }
    };

    const renderNegotiations = () => {
        const activeSent = sentProposals.filter(p => p.status !== TransferStatus.COMPLETED && p.status !== TransferStatus.CANCELLED && p.status !== TransferStatus.WITHDRAWN);
        const activeReceived = receivedProposals.filter(p => p.status !== TransferStatus.COMPLETED && p.status !== TransferStatus.CANCELLED && p.status !== TransferStatus.WITHDRAWN);

        return (
            <div className="space-y-8">
                {/* OFERTAS ENVIADAS (COMPRA) */}
                <section>
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        📤 Minhas Ofertas <span className="text-sm font-normal text-slate-500">({activeSent.length})</span>
                    </h3>
                    {activeSent.length === 0 && <p className="text-slate-500 text-sm italic">Nenhuma oferta de compra ativa.</p>}
                    <div className="space-y-3">
                        {activeSent.map(prop => (
                            <div key={prop.id} className="bg-slate-900 border border-slate-800 p-4 rounded flex justify-between items-center hover:border-slate-700 transition-colors">
                                <div>
                                    <div className="font-bold text-white flex items-center gap-2">
                                        {(prop as any).player?.firstName} {(prop as any).player?.lastName}
                                        <span className="text-xs font-normal text-slate-500 px-2 py-0.5 bg-slate-950 rounded border border-slate-800">
                                            {(prop as any).player?.position}
                                        </span>
                                    </div>
                                    <div className="text-xs text-slate-400 mt-1">
                                        Oferta: <span className="text-emerald-400 font-mono">{formatCurrency(prop.fee)}</span>
                                        <span className="mx-2">•</span>
                                        Salário: {formatCurrency(prop.wageOffer)}
                                        <span className="mx-2">•</span>
                                        Time: {(prop as any).toTeam?.shortName || "Agente Livre"}
                                    </div>
                                </div>
                                <div className="text-right flex flex-col items-end gap-2">
                                    <Badge variant={
                                        prop.status === TransferStatus.ACCEPTED ? 'success' :
                                            prop.status === TransferStatus.REJECTED ? 'danger' :
                                                prop.status === TransferStatus.NEGOTIATING ? 'warning' : 'neutral'
                                    }>
                                        {prop.status === TransferStatus.ACCEPTED ? "ACEITA ✅" :
                                            prop.status === TransferStatus.REJECTED ? "REJEITADA ❌" :
                                                prop.status === TransferStatus.NEGOTIATING ? "CONTRA-PROPOSTA 💬" : "PENDENTE ⏳"}
                                    </Badge>

                                    {prop.status === TransferStatus.ACCEPTED && (
                                        <button
                                            onClick={() => handleFinalizeTransfer(prop.id)}
                                            disabled={loading}
                                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded shadow-lg shadow-emerald-900/50 animate-pulse hover:animate-none transition-all"
                                        >
                                            {loading ? "Processando..." : "Finalizar Contratação"}
                                        </button>
                                    )}

                                    {prop.status !== TransferStatus.ACCEPTED && (
                                        <div className="text-[10px] text-slate-500">
                                            Prazo: {new Date(prop.responseDeadline).toLocaleDateString()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* PROPOSTAS RECEBIDAS (VENDA) */}
                <section>
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        📥 Propostas Recebidas <span className="text-sm font-normal text-slate-500">({activeReceived.length})</span>
                    </h3>
                    {activeReceived.length === 0 && <p className="text-slate-500 text-sm italic">Nenhuma proposta recebida.</p>}
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
                                        <div className="text-[10px] text-slate-500">Salário Oferecido: {formatCurrency(prop.wageOffer)}</div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <button className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded transition-colors">
                                            Aceitar
                                        </button>
                                        <button className="px-3 py-1 bg-red-600/20 hover:bg-red-600 text-red-200 hover:text-white text-xs font-bold rounded transition-colors border border-red-900">
                                            Rejeitar
                                        </button>
                                    </div>
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
            {/* Modal de Configuração */}
            {configuringSlot !== null && (
                <ScoutingConfigModal
                    slotNumber={configuringSlot}
                    onSave={handleSaveSlotConfig}
                    onClose={() => setConfiguringSlot(null)}
                />
            )}

            <aside className="w-1/4 min-w-[300px] border-r border-slate-800 p-6 overflow-y-auto bg-slate-950/50">
                <h2 className="text-xl font-light mb-6 flex items-center gap-2">
                    <span className="text-2xl">📡</span> Rede de Olheiros
                </h2>

                <div className="space-y-4">
                    {team?.scoutingSlots?.map((slot) => (
                        <ScoutingSlotCard
                            key={slot.slotNumber}
                            slot={slot}
                            onConfigure={handleConfigureClick}
                            onStop={handleStopSlot}
                        />
                    ))}
                    {(!team?.scoutingSlots || team.scoutingSlots.length === 0) && (
                        <div className="text-slate-500 text-sm text-center">
                            Carregando slots...
                        </div>
                    )}
                </div>

                <div className="mt-8 p-4 bg-blue-900/10 border border-blue-900/30 rounded text-xs text-blue-200">
                    <p className="font-bold mb-1">ℹ️ Dica de Scouting</p>
                    <p>Ative slots para encontrar jogadores automaticamente. Olheiros com melhores atributos encontram jogadores mais rápido e com mais precisão.</p>
                </div>
            </aside>

            <main className="flex-1 flex flex-col min-w-0 bg-slate-950">
                <header className="border-b border-slate-800 px-8 pt-8 pb-0">
                    <div className="flex justify-between items-end mb-6">
                        <h1 className="text-3xl font-bold tracking-tight">Transfer Hub</h1>
                        <div className="text-right">
                            <p className="text-xs text-slate-500">Orçamento Disponível</p>
                            <p className={`text-xl font-mono ${userTeam && userTeam.budget < 0 ? 'text-red-500' : 'text-emerald-400'}`}>
                                {formatCurrency(userTeam?.budget || 0)}
                            </p>
                        </div>
                    </div>

                    <nav className="flex gap-6">
                        <button
                            onClick={() => setActiveTab("results")}
                            className={`pb-4 text-sm font-medium border-b-2 transition-colors ${activeTab === "results" ? "border-emerald-500 text-white" : "border-transparent text-slate-400 hover:text-slate-200"
                                }`}
                        >
                            Relatórios ({searchResults.length})
                        </button>
                        <button
                            onClick={() => setActiveTab("negotiations")}
                            className={`pb-4 text-sm font-medium border-b-2 transition-colors ${activeTab === "negotiations" ? "border-emerald-500 text-white" : "border-transparent text-slate-400 hover:text-slate-200"
                                }`}
                        >
                            Negociações
                            {(sentProposals.filter(p => p.status === TransferStatus.ACCEPTED).length > 0) && (
                                <span className="ml-2 inline-flex items-center justify-center w-2 h-2 p-2 bg-emerald-500 rounded-full text-[10px] text-white font-bold">!</span>
                            )}
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

                <div className="flex-1 overflow-y-auto p-8 relative">
                    {loading && (
                        <div className="absolute inset-0 bg-slate-950/80 z-10 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                        </div>
                    )}

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
                            <div className="mb-8">
                                <h3 className="text-white text-lg font-bold mb-2">Agentes Livres</h3>
                                <p className="text-sm">Jogadores sem contrato podem ser contratados imediatamente sem taxa de transferência.</p>
                            </div>
                            <button
                                className="px-6 py-3 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 hover:border-slate-600 text-white transition-all shadow-lg"
                                onClick={async () => {
                                    setLoading(true);
                                    try {
                                        const freeAgents = await window.electronAPI.player.getFreeAgents();
                                        setSearchResults(freeAgents);
                                        setActiveTab("results");
                                    } catch (err) {
                                        logger.error("Erro ao buscar agentes livres", err);
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                            >
                                🔍 Buscar Todos os Agentes Livres
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
                        setActiveTab("negotiations");
                    }}
                />
            )}
        </div>
    );
}

export default TransferHubPage;