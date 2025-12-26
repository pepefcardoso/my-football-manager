import { useQuery } from "@tanstack/react-query";
import type { TransferProposal } from "../../domain/models";

export function useTransferNegotiations(teamId: number) {
  const bidsQuery = useQuery({
    queryKey: ["transfer", "bids", teamId],
    queryFn: async () => {
      const result = await window.electronAPI.transfer.getMyBids(teamId);
      return (result as unknown as TransferProposal[]).sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    },
    staleTime: 1000 * 60,
    refetchOnWindowFocus: true,
  });

  const offersQuery = useQuery({
    queryKey: ["transfer", "offers", teamId],
    queryFn: async () => {
      const result = await window.electronAPI.transfer.getIncomingOffers(
        teamId
      );
      return (result as unknown as TransferProposal[]).sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    },
    staleTime: 1000 * 60,
    refetchOnWindowFocus: true,
  });

  return {
    bids: bidsQuery.data || [],
    offers: offersQuery.data || [],
    isLoading: bidsQuery.isLoading || offersQuery.isLoading,
    isError: bidsQuery.isError || offersQuery.isError,
    refresh: () => {
      bidsQuery.refetch();
      offersQuery.refetch();
    },
  };
}
