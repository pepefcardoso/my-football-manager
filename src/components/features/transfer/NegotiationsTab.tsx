import { useTransferNegotiations } from "../../../hooks/transfer/useTransferNegotiations";
import { useTransferActions } from "../../../hooks/transfer/useTransferActions";
import { useGameStore } from "../../../store/useGameStore";
import { NegotiationList } from "../transfer/NegotiationList";
import { LoadingOverlay } from "../../common/Loading";

interface NegotiationsTabProps {
    teamId: number;
}

export function NegotiationsTab({ teamId }: NegotiationsTabProps) {
    const { currentDate } = useGameStore();
    const { bids, offers, isLoading: loadingNegs } = useTransferNegotiations(teamId);
    const { finalizeTransfer, respondToCounter, respondToOffer, isProcessing } = useTransferActions(teamId);

    if (loadingNegs || isProcessing) {
        return <LoadingOverlay message="Atualizando negociações..." />;
    }

    return (
        <div className="h-full overflow-y-auto p-8 animate-in fade-in duration-300">
            <NegotiationList
                bids={bids}
                offers={offers}
                loading={isProcessing}
                onFinalize={(id) => {
                    if (confirm("Tem a certeza que deseja finalizar esta transferência e realizar o pagamento?")) {
                        finalizeTransfer(id);
                    }
                }}
                onRespondCounter={(id, accept) => respondToCounter({ proposalId: id, accept })}
                onRespondOffer={(id, response) => respondToOffer({ proposalId: id, response, currentDate })}
            />
        </div>
    );
}