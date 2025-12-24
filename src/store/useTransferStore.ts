import { create } from "zustand";
import type { TransferProposal } from "../domain/models";
import { Logger } from "../lib/Logger";

const logger = new Logger("TransferStore");

interface TransferState {
  myBids: TransferProposal[];
  incomingOffers: TransferProposal[];
  loading: boolean;
  error: string | null;
}

interface TransferActions {
  fetchProposals: (teamId: number) => Promise<void>;
  updateProposalState: (
    proposalId: number,
    newStatus: string,
    newFee?: number | null
  ) => void;
  resetState: () => void;
}

export const useTransferStore = create<TransferState & TransferActions>(
  (set) => ({
    myBids: [],
    incomingOffers: [],
    loading: false,
    error: null,

    resetState: () =>
      set({
        myBids: [],
        incomingOffers: [],
        loading: false,
        error: null,
      }),

    fetchProposals: async (teamId: number) => {
      set({ loading: true, error: null });

      try {
        const [bids, offers] = await Promise.all([
          window.electronAPI.transfer.getMyBids(teamId),
          window.electronAPI.transfer.getIncomingOffers(teamId),
        ]);

        const sortProposals = (a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

        set({
          myBids: (bids as unknown as TransferProposal[]).sort(sortProposals),
          incomingOffers: (offers as unknown as TransferProposal[]).sort(
            sortProposals
          ),
          loading: false,
        });
      } catch (err) {
        logger.error("Error fetching proposals:", err);
        set({ loading: false, error: String(err) });
      }
    },

    updateProposalState: (proposalId, newStatus, newFee = null) => {
      set((state) => {
        const updateList = (list: TransferProposal[]) =>
          list.map((p) => {
            if (p.id === proposalId) {
              return {
                ...p,
                status: newStatus,
                ...(newFee !== null && { counterOfferFee: newFee }),
              };
            }
            return p;
          });

        return {
          myBids: updateList(state.myBids),
          incomingOffers: updateList(state.incomingOffers),
        };
      });
    },
  })
);
