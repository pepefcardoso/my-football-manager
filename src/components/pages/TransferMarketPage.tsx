import { useEffect, useState, useCallback } from "react";
import { Logger } from "../../lib/Logger";
import { formatCurrency } from "../../utils/formatters";
import Badge from "../common/Badge";
import type { TransferProposal, Team, Player } from "../../domain/models";
import { TransferStatus } from "../../domain/enums";

const logger = new Logger("TransferMarketPage");

interface ProposalWithDetails extends TransferProposal {
    player: Player;
    fromTeam: Team;
    toTeam: Team;
}

type TransferTab = "market" | "received" | "sent" | "history";

function TransferMarketPage({ teamId }: { teamId: number }) {
    const [activeTab, setActiveTab] = useState<TransferTab>("received");
    const [loading, setLoading] = useState(false);
    const [receivedProposals, setReceivedProposals] = useState<ProposalWithDetails[]>([]);
    const [sentProposals, setSentProposals] = useState<ProposalWithDetails[]>([]);

    const fetchProposals = useCallback(async () => {
        setLoading(true);
        try {
            const receivedData = await window.electronAPI.transfer.getReceivedProposals(teamId);
            const sentData = await window.electronAPI.transfer.getSentProposals(teamId);

            const sortProposals = (a: TransferProposal, b: TransferProposal) => {
                if (a.status === TransferStatus.PENDING && b.status !== TransferStatus.PENDING) return -1;
                if (a.status !== TransferStatus.PENDING && b.status === TransferStatus.PENDING) return 1;
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            };

            setReceivedProposals(receivedData.sort(sortProposals));
            setSentProposals(sentData.sort(sortProposals));
            logger.info(`Propostas carregadas: ${receivedData.length} recebidas, ${sentData.length} enviadas.`);

        } catch (error) {
            logger.error("Erro ao carregar propostas de transferência:", error);
        } finally {
            setLoading(false);
        }
    }, [teamId]);

    useEffect(() => {
        fetchProposals();
    }, [fetchProposals]);

    const getStatusVariant = (status: TransferStatus | string): "warning" | "info" | "success" | "danger" | "neutral" => {
        switch (status) {
            case TransferStatus.PENDING:
                return "warning";
            case TransferStatus.NEGOTIATING:
                return "info";
            case TransferStatus.ACCEPTED:
            case TransferStatus.COMPLETED:
                return "success";
            case TransferStatus.REJECTED:
            case TransferStatus.WITHDRAWN:
                return "danger";
            default:
                return "neutral";
        }
    };

    const getStatusLabel = (status: TransferStatus | string): string => {
        switch (status) {
            case TransferStatus.PENDING: return "Pendente";
            case TransferStatus.NEGOTIATING: return "Negociando";
            case TransferStatus.ACCEPTED: return "Aceita";
            case TransferStatus.REJECTED: return "Rejeitada";
            case TransferStatus.COMPLETED: return "Concluída";
            case TransferStatus.WITHDRAWN: return "Retirada";
            default: return status;
        }
    };


    const renderProposalsTable = (proposals: ProposalWithDetails[], isIncoming: boolean) => {
        if (proposals.length === 0) {
            return (
                <div className="p-8 text-center text-slate-500">
                    <p className="mb-2">Nenhuma proposta {isIncoming ? 'recebida' : 'enviada'} no momento.</p>
                    {isIncoming && <p className="text-xs text-slate-600">Aguarde por ofertas ou procure um comprador para um jogador. </p>}
                    {!isIncoming && <p className="text-xs text-slate-600">Envie uma oferta na aba "Mercado".</p>}
                </div>
            );
        }

        return (
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-900 text-slate-400 uppercase text-xs">
                    <tr>
                        <th className="p-4">Jogador</th>
                        <th className="p-4">{isIncoming ? 'Time Proponente' : 'Time Alvo'}</th>
                        <th className="p-4">Valor {isIncoming ? 'Ofertado' : 'Proposto'}</th>
                        <th className="p-4">Tipo</th>
                        <th className="p-4 text-center">Status</th>
                        <th className="p-4 text-center">Prazo</th>
                        <th className="p-4 text-right">Ação</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                    {proposals.map((prop) => {
                        const targetTeam = isIncoming ? prop.fromTeam : prop.toTeam;

                        const feeDisplay = prop.status === TransferStatus.NEGOTIATING && prop.counterOfferFee
                            ? formatCurrency(prop.counterOfferFee)
                            : formatCurrency(prop.fee);

                        const actionFee = prop.status === TransferStatus.NEGOTIATING ? prop.counterOfferFee : prop.fee;

                        return (
                            <tr key={prop.id} className="hover:bg-slate-800/50 transition-colors">
                                <td className="p-4 font-medium text-slate-200">
                                    {prop.player.lastName} <span className="text-slate-500 text-xs">({prop.player.overall} OVR)</span>
                                </td>
                                <td className="p-4 text-slate-400">
                                    {targetTeam?.shortName || (isIncoming ? 'Agente Livre' : 'N/A')}
                                </td>
                                <td className="p-4 font-mono text-emerald-400">
                                    {feeDisplay}
                                    {prop.status === TransferStatus.NEGOTIATING && isIncoming && (
                                        <span className="text-red-400 text-xs ml-2" title="Esta é a sua Contra-Proposta"> (Contra)</span>
                                    )}
                                </td>
                                <td className="p-4 text-slate-400 capitalize">{prop.type}</td>
                                <td className="p-4 text-center">
                                    <Badge variant={getStatusVariant(prop.status)}>
                                        {getStatusLabel(prop.status)}
                                    </Badge>
                                </td>
                                <td className="p-4 text-center text-xs font-mono text-slate-500">
                                    {new Date(prop.responseDeadline).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}
                                </td>
                                <td className="p-4 text-right">
                                    {(prop.status === TransferStatus.PENDING || prop.status === TransferStatus.NEGOTIATING) && (
                                        <button
                                            onClick={() => logger.info(`Abrir modal de resposta para Prop. ${prop.id}. Valor: ${actionFee}`)}
                                            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold transition-colors">
                                            {isIncoming ? 'Analisar' : 'Detalhes'}
                                        </button>
                                    )}
                                    {prop.status === TransferStatus.ACCEPTED && isIncoming && (
                                        <button
                                            onClick={() => logger.info(`Finalizar Prop. ${prop.id}`)}
                                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition-colors">
                                            Finalizar
                                        </button>
                                    )}
                                    {(prop.status === TransferStatus.COMPLETED || prop.status === TransferStatus.REJECTED) && (
                                        <span className="text-slate-600">-</span>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        );
    }

    const renderTabContent = () => {
        if (loading) {
            return (
                <div className="flex justify-center p-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                </div>
            );
        }

        switch (activeTab) {
            case "market":
                return (
                    <div className="p-8 bg-slate-900/50 rounded-lg border border-slate-800">
                        <h4 className="text-xl font-semibold mb-4">Procurar Jogadores no Mercado</h4>
                        <p className="text-slate-400">Esta aba será o ponto de partida para fazer ofertas a outros clubes ou contratar agentes livres.</p>
                        <div className="mt-4 space-y-4">
                            <div className="p-4 bg-slate-800/50 rounded border border-slate-700">
                                <p className="text-sm text-slate-300 font-bold mb-1">Filtros de Pesquisa</p>
                                <div className="flex gap-4 mt-2">
                                    <input type="text" placeholder="Posição (Ex: FW, MF)" className="p-2 bg-slate-900 border border-slate-700 rounded text-sm w-full" />
                                    <input type="number" placeholder="Overall Mínimo" className="p-2 bg-slate-900 border border-slate-700 rounded text-sm w-full" />
                                </div>
                            </div>
                            <div className="text-center p-8 text-slate-500 italic">
                                Use a aba "Scouting" para descobrir novos talentos antes de procurá-los aqui.
                            </div>
                        </div>
                    </div>
                );
            case "received":
                return (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden">
                        <h4 className="text-xl font-semibold p-4 border-b border-slate-800">Propostas Recebidas ({receivedProposals.length})</h4>
                        {renderProposalsTable(receivedProposals, true)}
                    </div>
                );
            case "sent":
                return (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden">
                        <h4 className="text-xl font-semibold p-4 border-b border-slate-800">Propostas Enviadas ({sentProposals.length})</h4>
                        {renderProposalsTable(sentProposals, false)}
                    </div>
                );
            case "history":
                return (
                    <div className="p-8 bg-slate-900/50 rounded-lg border border-slate-800">
                        <h4 className="text-xl font-semibold mb-4">Histórico de Transferências Concluídas</h4>
                        <p className="text-slate-400">Registro de todas as movimentações (compras, vendas e empréstimos) finalizadas nesta temporada e anteriores.</p>
                        <div className="mt-4 p-4 bg-slate-800/50 rounded text-slate-500 text-sm">
                            <p>Esta seção será implementada na Fase 5, com um novo serviço de Histórico de Transferências.</p>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="p-8 pb-20">
            <header className="mb-6">
                <h2 className="text-3xl font-light text-white mb-1">Mercado de Transferências</h2>
                <p className="text-slate-400 text-sm">Gerencie suas negociações de jogadores.</p>
            </header>

            <div className="flex mb-6 border-b border-slate-800">
                <button
                    onClick={() => setActiveTab("market")}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "market"
                        ? "border-emerald-500 text-emerald-400"
                        : "border-transparent text-slate-400 hover:text-white"
                        }`}
                >
                    🔍 Mercado
                </button>
                <button
                    onClick={() => setActiveTab("received")}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "received"
                        ? "border-emerald-500 text-emerald-400"
                        : "border-transparent text-slate-400 hover:text-white"
                        }`}
                >
                    📥 Recebidas ({receivedProposals.length})
                </button>
                <button
                    onClick={() => setActiveTab("sent")}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "sent"
                        ? "border-emerald-500 text-emerald-400"
                        : "border-transparent text-slate-400 hover:text-white"
                        }`}
                >
                    📤 Enviadas ({sentProposals.length})
                </button>
                <button
                    onClick={() => setActiveTab("history")}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "history"
                        ? "border-emerald-500 text-emerald-400"
                        : "border-transparent text-slate-400 hover:text-white"
                        }`}
                >
                    📜 Histórico
                </button>
            </div>

            {renderTabContent()}

        </div>
    );
}

export default TransferMarketPage;