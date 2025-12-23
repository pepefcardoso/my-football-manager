import { useState, useCallback, useMemo, useEffect } from "react";
import type { Player } from "../../../domain/models";
import { TransferType } from "../../../domain/enums";
import { formatCurrency } from "../../../utils/formatters";
import { Logger } from "../../../lib/Logger";
import Badge from "../../common/Badge";

const logger = new Logger("TransferProposalModal");

interface PlayerOrScoutedView extends Player {
    salary: number | undefined;
    contractEnd: string | null | undefined;
    visibleAttributes?: Record<string, { value: number | string; isExact: boolean; min?: number; max?: number }>;
}

interface TransferProposalModalProps {
    player: PlayerOrScoutedView;
    proposingTeamId: number;
    proposingTeamBudget: number;
    onClose: () => void;
    onProposalSent: () => void;
    currentDate: string;
    seasonId: number;
}

const HEURISTICS = {
    estimateMarketValue: (overall: number | string) => {
        const ovr = typeof overall === 'number' ? overall : parseInt(String(overall).split('-')[0]) || 60;
        return Math.round(ovr ** 3 / 50 * 1000);
    },
    estimateSuggestedWage: (marketValue: number) => Math.round(marketValue * 0.1),
    FEE_MAX_MULTIPLIER: 3.0,
    WAGE_MAX_MULTIPLIER: 2.0,
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
    seasonId,
}: TransferProposalModalProps) {
    const safeOverall = useMemo(() => {
        if (player.visibleAttributes?.overall) {
            const attr = player.visibleAttributes.overall;
            if (attr.isExact) return Number(attr.value);
            if (attr.min && attr.max) return Math.round((attr.min + attr.max) / 2);
        }
        return player.overall;
    }, [player]);

    const marketValue = useMemo(() => HEURISTICS.estimateMarketValue(safeOverall), [safeOverall]);
    const suggestedWage = useMemo(() => HEURISTICS.estimateSuggestedWage(marketValue), [marketValue]);

    const feeMax = useMemo(() => Math.max(marketValue * HEURISTICS.FEE_MAX_MULTIPLIER, 1000000), [marketValue]);
    const wageMax = useMemo(() => Math.max(suggestedWage * HEURISTICS.WAGE_MAX_MULTIPLIER, 50000), [suggestedWage]);

    const [fee, setFee] = useState(marketValue);
    const [wageOffer, setWageOffer] = useState(suggestedWage);
    const [contractLength, setContractLength] = useState(3);
    const [transferType, setTransferType] = useState<TransferType>(TransferType.TRANSFER);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isOverBudget = fee > proposingTeamBudget;
    const isFreeAgent = player.teamId === null;

    useEffect(() => {
        if (isOverBudget && !isFreeAgent) {
            setError("Orçamento insuficiente para cobrir o valor da transferência (estimado).");
        } else {
            setError(null);
        }
    }, [isOverBudget, isFreeAgent]);

    useEffect(() => {
        if (isFreeAgent) {
            setFee(0);
            setTransferType(TransferType.FREE);
        } else {
            setTransferType(TransferType.TRANSFER);
        }
    }, [isFreeAgent]);

    const handleCreateProposal = useCallback(async () => {
        if (isSubmitting || error) return;

        setIsSubmitting(true);
        setError(null);

        try {
            const teams = await window.electronAPI.team.getTeams();
            const myTeam = teams.find(t => t.id === proposingTeamId);

            if (!myTeam) {
                setError("Erro ao identificar seu time.");
                setIsSubmitting(false);
                return;
            }

            const freshBudget = myTeam.budget || 0;

            if (fee > freshBudget && !isFreeAgent) {
                setError(`Orçamento insuficiente atualizado. Disponível: €${freshBudget.toLocaleString()}`);
                setIsSubmitting(false);
                return;
            }

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
        isFreeAgent,
        seasonId,
    ]);

    const displayOverall = player.visibleAttributes?.overall?.value || player.overall;
    const isMasked = player.visibleAttributes && !player.visibleAttributes.overall.isExact;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full shadow-2xl animate-in fade-in zoom-in duration-300">

                <div className="p-6 border-b border-slate-800 bg-slate-950/50 flex justify-between items-start">
                    <div>
                        <h3 className="text-2xl font-bold text-white">
                            Proposta por {player.firstName} {player.lastName}
                        </h3>
                        <p className="text-sm text-slate-400 mt-1 flex items-center gap-2">
                            <span className="bg-slate-800 px-1.5 rounded text-white font-bold">OVR {displayOverall}</span>
                            <span>|</span>
                            <span>{player.position}</span>
                            <span>|</span>
                            <span>{player.age} anos</span>
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 mb-1">Valor Estimado</p>
                        <Badge variant="neutral">
                            {isMasked ? "~ " : ""}{formatCurrency(marketValue)}
                        </Badge>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {isMasked && (
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
                                min={0}
                                max={feeMax}
                                step={HEURISTICS.FEE_STEP}
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
                                min={HEURISTICS.WAGE_STEP}
                                max={wageMax}
                                step={HEURISTICS.WAGE_STEP}
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
                                max={HEURISTICS.MAX_CONTRACT_YEARS}
                                step={1}
                                value={contractLength}
                                onChange={(e) => setContractLength(Number(e.target.value))}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer range-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-slate-950/50 border-t border-slate-800 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleCreateProposal}
                        disabled={(isOverBudget && !isFreeAgent) || isSubmitting || !!error}
                        className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition-all disabled:opacity-50"
                    >
                        {isSubmitting ? "Enviando..." : "Enviar Proposta"}
                    </button>
                </div>
            </div>
        </div>
    );
}