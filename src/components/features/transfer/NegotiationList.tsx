import type { TransferProposal } from "../../../domain/models";
import { TransferStatus } from "../../../domain/enums";
import Badge from "../../common/Badge";
import { formatCurrency } from "../../../utils/formatters";

interface NegotiationListProps {
    bids: TransferProposal[];
    offers: TransferProposal[];
    loading: boolean;
    onFinalize: (id: number) => void;
    onRespondCounter: (id: number, accept: boolean) => void;
    onRespondOffer: (id: number, response: "accept" | "reject") => void;
}

export function NegotiationList({
    bids,
    offers,
    loading,
    onFinalize,
    onRespondCounter,
    onRespondOffer
}: NegotiationListProps) {

    const activeBids = bids.filter(p => ![TransferStatus.COMPLETED, TransferStatus.WITHDRAWN, TransferStatus.CANCELLED].includes(p.status as any));
    const activeOffers = offers.filter(p => ![TransferStatus.COMPLETED, TransferStatus.WITHDRAWN, TransferStatus.CANCELLED].includes(p.status as any));

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            <section>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
                    🛒 Minhas Tentativas de Compra <span className="text-sm font-normal text-slate-500">({activeBids.length})</span>
                </h3>
                {activeBids.length === 0 && <p className="text-slate-500 text-sm italic py-4">Você não está negociando a compra de nenhum jogador.</p>}

                <div className="space-y-3">
                    {activeBids.map(prop => (
                        <div key={prop.id} className="bg-slate-900 border border-slate-800 p-4 rounded flex justify-between items-center hover:border-emerald-500/30 transition-colors">
                            <div>
                                <div className="font-bold text-white flex items-center gap-2">
                                    {(prop as any).player?.firstName} {(prop as any).player?.lastName}
                                    <Badge variant="neutral" className="text-[10px]">{(prop as any).player?.position}</Badge>
                                </div>
                                <div className="text-xs text-slate-400 mt-1">
                                    Time: <span className="text-white">{(prop as any).fromTeam?.shortName || "Agente Livre"}</span> |
                                    Oferta: <span className="text-emerald-400 font-mono">{formatCurrency(prop.fee)}</span>
                                </div>
                            </div>

                            <div className="text-right flex flex-col items-end gap-2">
                                <StatusBadge status={prop.status} />

                                {prop.status === TransferStatus.ACCEPTED && (
                                    <button onClick={() => onFinalize(prop.id)} disabled={loading} className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded shadow-lg animate-pulse">
                                        {loading ? "..." : "Finalizar & Pagar"}
                                    </button>
                                )}

                                {prop.status === TransferStatus.NEGOTIATING && (
                                    <div className="flex flex-col items-end gap-2 mt-2 bg-yellow-500/10 p-3 rounded border border-yellow-500/30">
                                        <div className="text-xs text-yellow-200">
                                            <span className="font-bold text-yellow-400">Contra-Proposta:</span>
                                            <span className="ml-2 font-mono text-lg">{formatCurrency(prop.counterOfferFee || 0)}</span>
                                        </div>

                                        <div className="flex gap-2 w-full justify-end">
                                            <button
                                                onClick={() => onRespondCounter(prop.id, true)}
                                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs rounded text-white font-bold transition-colors"
                                            >
                                                Aceitar
                                            </button>
                                            <button
                                                onClick={() => onRespondCounter(prop.id, false)}
                                                className="px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-xs rounded text-white transition-colors"
                                            >
                                                Recusar
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 border-b border-slate-800 pb-2 pt-4">
                    💰 Ofertas Recebidas (Vendas) <span className="text-sm font-normal text-slate-500">({activeOffers.length})</span>
                </h3>
                {activeOffers.length === 0 && <p className="text-slate-500 text-sm italic py-4">Nenhum clube interessado em seus jogadores no momento.</p>}

                <div className="space-y-3">
                    {activeOffers.map(prop => {
                        const isAnswered = prop.status === TransferStatus.ACCEPTED || prop.status === TransferStatus.REJECTED;
                        return (
                            <div key={prop.id} className="bg-slate-900 border border-blue-900/30 p-4 rounded flex justify-between items-center hover:border-blue-500/50 transition-colors">
                                <div>
                                    <div className="font-bold text-white">{(prop as any).player?.firstName} {(prop as any).player?.lastName}</div>
                                    <div className="text-xs text-slate-400 mt-1">
                                        Comprador: <span className="text-white font-bold">{(prop as any).toTeam?.name}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <div className="font-mono text-emerald-400 font-bold text-lg">{formatCurrency(prop.fee)}</div>
                                        <div className="text-[10px] text-slate-500">Salário Proposto: {formatCurrency(prop.wageOffer)}</div>
                                    </div>

                                    <div className="flex flex-col gap-1 items-end">
                                        {!isAnswered ? (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => onRespondOffer(prop.id, 'accept')}
                                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded transition-colors"
                                                >
                                                    Vender
                                                </button>
                                                <button
                                                    onClick={() => onRespondOffer(prop.id, 'reject')}
                                                    className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-200 hover:text-white text-xs font-bold rounded transition-colors border border-red-900"
                                                >
                                                    Recusar
                                                </button>
                                            </div>
                                        ) : (
                                            <Badge variant={prop.status === TransferStatus.ACCEPTED ? 'success' : 'danger'}>
                                                {prop.status === TransferStatus.ACCEPTED ? "AGUARDANDO PAGAMENTO..." : "RECUSADO"}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const color = status === TransferStatus.ACCEPTED ? 'success' : status === TransferStatus.REJECTED ? 'danger' : status === TransferStatus.NEGOTIATING ? 'warning' : 'info';
    return <Badge variant={color}>{status}</Badge>;
}