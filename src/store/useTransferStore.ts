import { create } from "zustand";
import type { TransferProposal } from "../domain/models";
import { Logger } from "../lib/Logger";

const logger = new Logger("TransferStore");

interface TransferState {
  receivedProposals: TransferProposal[];
  sentProposals: TransferProposal[];
  loading: boolean;
  error: string | null;
}

interface TransferActions {
  /**
   * Fetches all incoming and outgoing proposals for the given team using Electron IPC.
   * @param teamId The ID of the user's team.
   */
  fetchProposals: (teamId: number) => Promise<void>;

  /**
   * Updates the status and fee of a single proposal in memory.
   * Useful for quick UI updates after an action (accept, reject, counter).
   * @param proposalId The ID of the proposal to update.
   * @param newStatus The new status string (e.g., 'accepted', 'rejected', 'negotiating').
   * @param newFee The updated fee (e.g., after a counter-offer).
   */
  updateProposalState: (
    proposalId: number,
    newStatus: string,
    newFee?: number | null
  ) => void;

  /**
   * Helper function to reset the store state.
   */
  resetState: () => void;
}

export const useTransferStore = create<TransferState & TransferActions>(
  (set, _get) => ({
    receivedProposals: [],
    sentProposals: [],
    loading: false,
    error: null,

    resetState: () =>
      set({
        receivedProposals: [],
        sentProposals: [],
        loading: false,
        error: null,
      }),

    fetchProposals: async (teamId: number) => {
      set({ loading: true, error: null });
      logger.info(`Fetching proposals for team ${teamId}...`);

      try {
        const [receivedData, sentData] = await Promise.all([
          window.electronAPI.transfer.getReceivedProposals(teamId),
          window.electronAPI.transfer.getSentProposals(teamId),
        ]);

        const sortProposals = (a: TransferProposal, b: TransferProposal) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

        set({
          receivedProposals: receivedData.sort(sortProposals),
          sentProposals: sentData.sort(sortProposals),
          loading: false,
        });

        logger.info(
          `Proposals loaded: ${receivedData.length} received, ${sentData.length} sent.`
        );
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Erro desconhecido ao carregar propostas.";
        logger.error("Error fetching proposals:", err);
        set({
          loading: false,
          error: message,
          receivedProposals: [],
          sentProposals: [],
        });
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
          receivedProposals: updateList(state.receivedProposals),
          sentProposals: updateList(state.sentProposals),
        };
      });
    },
  })
);
