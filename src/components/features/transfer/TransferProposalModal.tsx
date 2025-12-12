import { useState, useCallback, useMemo, useEffect } from "react";
import type { Player } from "../../../domain/models";
import { TransferType } from "../../../domain/enums";
import { formatCurrency } from "../../../utils/formatters";
import { Logger } from "../../../lib/Logger";
import Badge from "../../common/Badge";

const logger = new Logger("TransferProposalModal");

interface TransferProposalModalProps {
    player: Player & { salary: number | undefined; contractEnd: string | null | undefined };
    proposingTeamId: number;
    proposingTeamBudget: number;
    onClose: () => void;
    onProposalSent: () => void;
    currentDate: string;
}

const HEURISTICS = {
    estimateMarketValue: (overall: number) => Math.round(overall ** 3 / 50 * 1000),
    estimateSuggestedWage: (marketValue: number) => Math.round(marketValue * 0.1),
    FEE_MAX_MULTIPLIER: 2.5,
    WAGE_MAX_MULTIPLIER: 1.5,
    FEE_STEP: 50000,
    WAGE_STEP: 10000,
    MAX_CONTRACT_YEARS: 5,
};

export function TransferProposalModal({
    player,
    proposingTeamId,
    proposingTeamBudget,
    onClose,
    onProposalSent,
    currentDate,
}: TransferProposalModalProps) {
    const marketValue = useMemo(() => HEURISTICS.estimateMarketValue(player.overall), [player.overall]);
    const suggestedWage = useMemo(() => HEURISTICS.estimateSuggestedWage(marketValue), [marketValue]);
    const feeMax = useMemo(() => Math.round(marketValue * HEURISTICS.FEE_MAX_MULTIPLIER / HEURISTICS.FEE_STEP) * HEURISTICS.FEE_STEP, [marketValue]);
    const wageMax = useMemo(() => Math.round(suggestedWage * HEURISTICS.WAGE_MAX_MULTIPLIER / HEURISTICS.WAGE_STEP) * HEURISTICS.WAGE_STEP, [suggestedWage]);

    const [fee, setFee] = useState(marketValue);
    const [wageOffer, setWageOffer] = useState(suggestedWage);
    const [contractLength, setContractLength] = useState(3);
    const [transferType, setTransferType] = useState<TransferType>(TransferType.TRANSFER);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isOverBudget = fee > proposingTeamBudget;
    const isFreeAgent = player.teamId === null;

    useEffect(() => {
        if (isOverBudget) {
            setError("Orçamento insuficiente para cobrir o valor da transferência.");
        } else {
            setError(null);
        }
    }, [isOverBudget]);

    useEffect(() => {
        if (isFreeAgent) {
            setFee(0);
            setTransferType(TransferType.FREE);
        } else {
            setTransferType(TransferType.TRANSFER);
        }
    }, [isFreeAgent]);


    const handleTypeChange = (type: TransferType) => {
        setTransferType(type);
        if (type === TransferType.FREE) {
            setFee(0);
        } else if (type === TransferType.TRANSFER) {
            setFee(marketValue);
        } else {
            setFee(Math.round(marketValue * 0.2));
        }
    }

    const handleCreateProposal = useCallback(async () => {
        if (isOverBudget || isSubmitting || error) return;

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
                seasonId: 1,
            };

            logger.info("Enviando proposta:", proposalData);

            const result = await window.electronAPI.transfer.createProposal(proposalData);

            if (result.success) {
                onProposalSent();
                onClose();
            } else {
                setError(result.message || "Erro ao enviar proposta. Verifique a janela de transferências.");
            }
        } catch (err) {
            logger.error("Erro no IPC ao criar proposta:", err);
            setError("Erro interno ao comunicar com o sistema de transferências.");
        } finally {
            setIsSubmitting(false);
        }
    }, [
        isOverBudget,
        isSubmitting,
        error,
        player.id,
        player.teamId,
        proposingTeamId,
        transferType,
        fee,
        wageOffer,
        contractLength,
        currentDate,
        onClose,
        onProposalSent,
        isFreeAgent
    ]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full shadow-2xl animate-in fade-in zoom-in duration-300">

                <div className="p-6 border-b border-slate-800 bg-slate-950/50 flex justify-between items-start">
                    <div>
                        <h3 className="text-2xl font-bold text-white">
                            Proposta por {player.firstName} {player.lastName}
                        </h3>
                        <p className="text-sm text-slate-400 mt-1">
                            OVR: {player.overall} | {player.position} | {player.age} anos
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 mb-1">Valor de Mercado</p>
                        <Badge variant="neutral">{formatCurrency(marketValue)}</Badge>
                    </div>
                </div>

                <div className="p-6 space-y-6">

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/50 rounded text-red-400 text-sm" role="alert">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-4">
                        <button
                            onClick={() => handleTypeChange(TransferType.TRANSFER)}
                            disabled={isFreeAgent}
                            className={`p-3 rounded-lg border text-sm font-medium transition-all ${transferType === TransferType.TRANSFER
                                ? "bg-emerald-600/20 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/50"
                                : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 disabled:opacity-50"
                                }`}
                        >
                            <span className="text-lg mr-2" aria-hidden="true">💸</span> Compra Definitiva
                        </button>
                        <button
                            onClick={() => handleTypeChange(TransferType.LOAN)}
                            disabled={isFreeAgent}
                            className={`p-3 rounded-lg border text-sm font-medium transition-all ${transferType === TransferType.LOAN
                                ? "bg-blue-600/20 border-blue-500 text-blue-300 ring-2 ring-blue-500/50"
                                : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 disabled:opacity-50"
                                }`}
                        >
                            <span className="text-lg mr-2" aria-hidden="true">🔁</span> Empréstimo
                        </button>
                        <button
                            onClick={() => handleTypeChange(TransferType.FREE)}
                            disabled={!isFreeAgent}
                            className={`p-3 rounded-lg border text-sm font-medium transition-all ${transferType === TransferType.FREE
                                ? "bg-purple-600/20 border-purple-500 text-purple-300 ring-2 ring-purple-500/50"
                                : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 disabled:opacity-50"
                                }`}
                        >
                            <span className="text-lg mr-2" aria-hidden="true">🤝</span> Agente Livre
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300 flex justify-between items-center">
                                Valor da Transferência (Fee)
                                <Badge variant={isOverBudget ? 'danger' : 'success'}>
                                    {formatCurrency(fee)}
                                </Badge>
                            </label>
                            <input
                                type="range"
                                min={transferType === TransferType.FREE ? 0 : HEURISTICS.FEE_STEP}
                                max={feeMax}
                                step={HEURISTICS.FEE_STEP}
                                value={fee}
                                disabled={isFreeAgent || transferType === TransferType.LOAN}
                                onChange={(e) => setFee(Number(e.target.value))}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer range-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            <p className="text-xs text-slate-500">Valor máximo sugerido: {formatCurrency(feeMax)}</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300 flex justify-between items-center">
                                Salário Anual Oferecido
                                <Badge variant="info">{formatCurrency(wageOffer)}</Badge>
                            </label>
                            <input
                                type="range"
                                min={HEURISTICS.WAGE_STEP}
                                max={wageMax}
                                step={HEURISTICS.WAGE_STEP}
                                value={wageOffer}
                                onChange={(e) => setWageOffer(Number(e.target.value))}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer range-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            <p className="text-xs text-slate-500">Salário sugerido: {formatCurrency(suggestedWage)} (Máx: {formatCurrency(wageMax)})</p>
                        </div>

                        <div className="space-y-2 col-span-2 md:col-span-1">
                            <label className="text-sm font-medium text-slate-300 flex justify-between items-center">
                                Duração do Contrato (Anos)
                                <Badge variant="neutral">{contractLength} {contractLength === 1 ? 'Ano' : 'Anos'}</Badge>
                            </label>
                            <input
                                type="range"
                                min={1}
                                max={HEURISTICS.MAX_CONTRACT_YEARS}
                                step={1}
                                value={contractLength}
                                onChange={(e) => setContractLength(Number(e.target.value))}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer range-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>

                        <div className={`p-3 rounded border text-sm col-span-2 md:col-span-1 ${isOverBudget ? 'bg-red-500/10 border-red-500/50' : 'bg-slate-800 border-slate-700'}`}>
                            <p className="font-bold mb-1">Resumo Financeiro</p>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-400">Orçamento Disponível</span>
                                <span className="font-mono text-emerald-400">{formatCurrency(proposingTeamBudget)}</span>
                            </div>
                            <div className="flex justify-between text-xs mt-1">
                                <span className="text-slate-400">Custo da Transferência (Fee)</span>
                                <span className="font-mono text-red-400">-{formatCurrency(fee)}</span>
                            </div>
                            <div className="flex justify-between text-xs mt-2 pt-2 border-t border-slate-700">
                                <span className="font-bold">Saldo Após Fee</span>
                                <span className={`font-mono font-bold ${isOverBudget ? 'text-red-400' : 'text-white'}`}>
                                    {formatCurrency(proposingTeamBudget - fee)}
                                </span>
                            </div>
                        </div>

                    </div>
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
                        disabled={isOverBudget || isSubmitting || !!error || transferType === TransferType.LOAN}
                        className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? "Enviando..." : "Enviar Proposta"}
                    </button>
                </div>

            </div>
        </div>
    );
}