import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Logger } from "../../lib/Logger";
import type { RespondProposalInput } from "../../electron-env";

const logger = new Logger("useTransferActions");

export function useTransferActions(teamId: number) {
  const queryClient = useQueryClient();

  const finalizeTransfer = useMutation({
    mutationFn: async (proposalId: number) => {
      const result = await window.electronAPI.transfer.finalizeTransfer(
        proposalId
      );
      if (!result.success) throw new Error(result.message);
      return result;
    },
    onSuccess: (data) => {
      alert(`Sucesso: ${data.message}`);
      queryClient.invalidateQueries({ queryKey: ["transfer"] });
      queryClient.invalidateQueries({ queryKey: ["team"] });
    },
    onError: (error) => {
      logger.error("Erro ao finalizar", error);
      alert(`Erro: ${error instanceof Error ? error.message : "Desconhecido"}`);
    },
  });

  const respondToOffer = useMutation({
    mutationFn: async (input: RespondProposalInput) => {
      const result = await window.electronAPI.transfer.respondToProposal(input);
      if (!result.success) throw new Error(result.message);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["transfer", "offers", teamId],
      });
    },
  });

  const respondToCounter = useMutation({
    mutationFn: async ({
      proposalId,
      accept,
    }: {
      proposalId: number;
      accept: boolean;
    }) => {
      const result = await window.electronAPI.transfer.respondToCounter({
        proposalId,
        accept,
      });
      if (!result.success) throw new Error(result.message);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfer", "bids", teamId] });
    },
  });

  return {
    finalizeTransfer: finalizeTransfer.mutate,
    respondToOffer: respondToOffer.mutate,
    respondToCounter: respondToCounter.mutate,
    isProcessing:
      finalizeTransfer.isPending ||
      respondToOffer.isPending ||
      respondToCounter.isPending,
  };
}
