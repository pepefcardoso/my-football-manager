import { useState, useCallback, useEffect } from "react";
import type { Player } from "../../../domain/models";
import { TransferType } from "../../../domain/enums";
import { formatCurrency } from "../../../utils/formatters";
import { Logger } from "../../../lib/Logger";
import Badge from "../../common/Badge";

const logger = new Logger("TransferProposalModal");

interface TransferProposalModalProps {
    player: Player | any;
    proposingTeamId: number;
    onClose: () => void;
    onProposalSent: () => void;
    currentDate: string;
    seasonId: number;
}

export function TransferProposalModal({
    player,
    proposingTeamId,
    onClose,
    onProposalSent,
    currentDate,
    seasonId,
}: TransferProposalModalProps) {
    const [isLoadingEstimate, setIsLoadingEstimate] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [marketValue, setMarketValue] = useState(0);
    const [suggestedWage, setSuggestedWage] = useState(0);
    const [canAfford, setCanAfford] = useState(true);
    const [fee, setFee] = useState(0);
    const [wageOffer, setWageOffer] = useState(0);
    const [contractLength, setContractLength] = useState(3);
    const [transferType, setTransferType] = useState<TransferType>(TransferType.TRANSFER);

    const isFreeAgent = player.teamId === null;
    const isMasked = player.visibleAttributes && !player.visibleAttributes.overall?.isExact;
    const releaseClause = (player as any).releaseClause || (player as any).currentContract?.releaseClause;

    useEffect(() => {
        async function loadEstimates() {
            try {
                setIsLoadingEstimate(true);

                const estimate = await window.electronAPI.transfer.estimatePlayerValue(
                    player.id,
                    proposingTeamId
                );

                if (estimate.success) {
                    setMarketValue(estimate.marketValue);
                    setSuggestedWage(estimate.suggestedWage);

                    if (isFreeAgent) {
                        setFee(0);
                        setTransferType(TransferType.FREE);
                    } else {
                        setFee(estimate.marketValue);
                        setTransferType(TransferType.TRANSFER);
                    }

                    setWageOffer(estimate.suggestedWage);
                }
            } catch (err) {
                logger.error("Erro ao carregar estimativas:", err);
                setError("Não foi possível calcular o valor do jogador.");
            } finally {
                setIsLoadingEstimate(false);
            }
        }

        loadEstimates();
    }, [player.id, proposingTeamId, isFreeAgent]);

    useEffect(() => {
        async function validateBudget() {
            if (isLoadingEstimate || isFreeAgent) {
                setCanAfford(true);
                setError(null);
                return;
            }

            try {
                const result = await window.electronAPI.finance.canAffordTransfer(
                    proposingTeamId,
                    fee,
                    wageOffer
                );

                setCanAfford(result.canAfford);

                if (!result.canAfford) {
                    setError(result.reason);
                } else {
                    setError(null);
                }
            } catch (err) {
                logger.error("Erro ao validar orçamento:", err);
                setError("Erro ao validar orçamento.");
            }
        }

        const timeoutId = setTimeout(validateBudget, 300);
        return () => clearTimeout(timeoutId);
    }, [fee, wageOffer, proposingTeamId, isLoadingEstimate, isFreeAgent]);

    const handleCreateProposal = useCallback(async () => {
        if (isSubmitting || !canAfford || isLoadingEstimate) return;

        setIsSubmitting(true);
        setError(null);

        try {
            const proposalData = {
                playerId: player.id,
                fromTeamId: isFreeAgent ? proposingTeamId : player.teamId,
                toTeamId: isFreeAgent ? null : proposingTeamId,
                type: transferType,
                fee: fee,
                wageOffer: wageOffer,
                contractLength: contractLength,
                currentDate: currentDate,
                seasonId: seasonId,
            };

            logger.info("Enviando proposta:", proposalData);

            const result = await window.electronAPI.transfer.createProposal(proposalData);

            if (result.success) {
                onProposalSent();
                onClose();
            } else {
                setError(result.message || "Erro ao enviar proposta.");
            }
        } catch (err) {
            logger.error("Erro no IPC ao criar proposta:", err);
            setError("Erro interno ao comunicar com o sistema.");
        } finally {
            setIsSubmitting(false);
        }
    }, [
        isSubmitting,
        canAfford,
        isLoadingEstimate,
        player,
        proposingTeamId,
        transferType,
        fee,
        wageOffer,
        contractLength,
        currentDate,
        seasonId,
        isFreeAgent,
        onClose,
        onProposalSent,
    ]);

    const displayOverall = player.visibleAttributes?.overall?.value || player.overall;

    const feeMax = Math.max(marketValue * 3, 1000000);
    const wageMax = Math.max(suggestedWage * 2, 50000);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full shadow-2xl animate-in fade-in zoom-in duration-300">
                <div className="p-6 border-b border-slate-800 bg-slate-950/50 flex justify-between items-start">
                    <div>
                        <h3 className="text-2xl font-bold text-white">
                            Proposta por {player.firstName} {player.lastName}
                        </h3>
                        <p className="text-sm text-slate-400 mt-1 flex items-center gap-2">
                            <span className="bg-slate-800 px-1.5 rounded text-white font-bold">
                                OVR {displayOverall}
                            </span>
                            <span>|</span>
                            <span>{player.position}</span>
                            <span>|</span>
                            <span>{player.age} anos</span>
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 mb-1">Valor Estimado</p>
                        {isLoadingEstimate ? (
                            <div className="animate-pulse bg-slate-700 h-6 w-24 rounded"></div>
                        ) : (
                            <Badge variant="neutral">
                                {isMasked ? "~ " : ""}
                                {formatCurrency(marketValue)}
                            </Badge>
                        )}
                        {releaseClause > 0 && !isFreeAgent && (
                            <div className="mt-2">
                                <p className="text-[10px] text-slate-500 mb-0.5">Cláusula Rescisão</p>
                                <Badge variant="warning" className="text-xs font-mono">
                                    {formatCurrency(releaseClause)}
                                </Badge>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {isLoadingEstimate && (
                        <div className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/30 rounded">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                            <span className="text-blue-400 text-sm">
                                Calculando valor de mercado...
                            </span>
                        </div>
                    )}

                    {isMasked && !isLoadingEstimate && (
                        <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded text-yellow-400 text-xs flex gap-2 items-center">
                            <span>⚠️</span>
                            <p>
                                <strong>Scouting Incompleto:</strong> Você está fazendo uma oferta "às cegas".
                                O valor real do jogador pode diferir da estimativa.
                            </p>
                        </div>
                    )}

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/50 rounded text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {!isLoadingEstimate && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300 flex justify-between items-center">
                                    Valor da Transferência (Fee)
                                    <Badge variant={!canAfford && !isFreeAgent ? "danger" : "success"}>
                                        {formatCurrency(fee)}
                                    </Badge>
                                </label>
                                <input
                                    type="range"
                                    min={0}
                                    max={feeMax}
                                    step={50000}
                                    value={fee}
                                    disabled={isFreeAgent}
                                    onChange={(e) => setFee(Number(e.target.value))}
                                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer range-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300 flex justify-between items-center">
                                    Salário Anual Oferecido
                                    <Badge variant="info">{formatCurrency(wageOffer)}</Badge>
                                </label>
                                <input
                                    type="range"
                                    min={10000}
                                    max={wageMax}
                                    step={10000}
                                    value={wageOffer}
                                    onChange={(e) => setWageOffer(Number(e.target.value))}
                                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer range-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            <div className="space-y-2 col-span-2 md:col-span-1">
                                <label className="text-sm font-medium text-slate-300 flex justify-between items-center">
                                    Duração do Contrato
                                    <Badge variant="neutral">{contractLength} Anos</Badge>
                                </label>
                                <input
                                    type="range"
                                    min={1}
                                    max={5}
                                    step={1}
                                    value={contractLength}
                                    onChange={(e) => setContractLength(Number(e.target.value))}
                                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer range-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-slate-950/50 border-t border-slate-800 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleCreateProposal}
                        disabled={!canAfford || isSubmitting || isLoadingEstimate || !!error}
                        className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? "Enviando..." : "Enviar Proposta"}
                    </button>
                </div>
            </div>
        </div>
    );
}