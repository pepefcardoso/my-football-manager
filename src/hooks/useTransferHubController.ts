import { useState, useCallback, useEffect } from "react";
import { useGameStore } from "../store/useGameStore";
import { useTransferStore } from "../store/useTransferStore";
import { Logger } from "../lib/Logger";
import type { Team, Player, ScoutingSlot } from "../domain/models";
import { TransferStatus } from "../domain/enums";

const logger = new Logger("TransferHubController");

export function useTransferHubController(teamId: number) {
  const [activeTab, setActiveTab] = useState<
    "results" | "market" | "negotiations"
  >("results");
  const [team, setTeam] = useState<Team | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [configuringSlot, setConfiguringSlot] = useState<number | null>(null);
  const [currentSeasonId, setCurrentSeasonId] = useState<number>(1);

  const { userTeam, currentDate } = useGameStore();
  const { myBids, incomingOffers, fetchProposals, updateProposalState } =
    useTransferStore();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [gameState, teamsData, slots] = await Promise.all([
        window.electronAPI.game.getGameState(),
        window.electronAPI.team.getTeams(),
        window.electronAPI.scouting.getSlots(teamId),
      ]);

      if (gameState?.currentSeasonId)
        setCurrentSeasonId(gameState.currentSeasonId);

      let myTeam = teamsData.find((t) => t.id === teamId) || null;
      if (myTeam) {
        myTeam = { ...myTeam, scoutingSlots: slots };
        setTeam(myTeam);
      }

      await fetchProposals(teamId);

      const scoutedPlayers =
        await window.electronAPI.scouting.getScoutedPlayersBatch({ teamId });
      setSearchResults(scoutedPlayers);
    } catch (error) {
      logger.error("Erro ao carregar dados do Hub:", error);
    } finally {
      setLoading(false);
    }
  }, [teamId, fetchProposals]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const saveSlotConfig = async (filters: ScoutingSlot["filters"]) => {
    if (!team || configuringSlot === null) return;

    const newSlots = (team.scoutingSlots || []).map((s) =>
      s.slotNumber === configuringSlot
        ? ({
            ...s,
            isActive: true,
            filters,
            stats: { playersFound: 0, lastRunDate: null },
          } as ScoutingSlot)
        : s
    );

    try {
      const success = await window.electronAPI.scouting.updateSlots(
        teamId,
        newSlots
      );
      if (success) {
        setConfiguringSlot(null);
        loadData();
      }
    } catch (error) {
      logger.error("Erro ao salvar slot:", error);
    }
  };

  const stopSlot = async (slotNumber: number) => {
    if (!team) return;
    const newSlots = (team.scoutingSlots || []).map((s) =>
      s.slotNumber === slotNumber ? { ...s, isActive: false } : s
    );
    await window.electronAPI.scouting.updateSlots(teamId, newSlots);
    loadData();
  };

  const finalizeTransfer = async (proposalId: number) => {
    if (!confirm("Confirmar transferência e pagamento?")) return;
    setLoading(true);
    try {
      const result = await window.electronAPI.transfer.finalizeTransfer(
        proposalId
      );
      if (result.success) {
        updateProposalState(proposalId, TransferStatus.COMPLETED);
        if (userTeam) {
          const teams = await window.electronAPI.team.getTeams();
          const updated = teams.find((t) => t.id === userTeam.id);
          if (updated) useGameStore.getState().updateUserTeam(updated);
        }
        alert("Transferência concluída!");
        loadData();
      } else {
        alert("Erro: " + result.message);
      }
    } catch (error) {
      logger.error("Erro finalizar:", error);
    } finally {
      setLoading(false);
    }
  };

  const respondToCounter = async (proposalId: number, accept: boolean) => {
    setLoading(true);
    try {
      const result = await window.electronAPI.transfer.respondToCounter({
        proposalId,
        accept,
      });
      if (result.success) {
        updateProposalState(
          proposalId,
          accept ? TransferStatus.ACCEPTED : TransferStatus.REJECTED
        );
        loadData();
      }
    } finally {
      setLoading(false);
    }
  };

  const respondToOffer = async (
    proposalId: number,
    response: "accept" | "reject"
  ) => {
    setLoading(true);
    try {
      const result = await window.electronAPI.transfer.respondToProposal({
        proposalId,
        response,
        currentDate,
        rejectionReason:
          response === "reject" ? "Recusado pelo utilizador" : undefined,
      });
      if (result.success) {
        updateProposalState(
          proposalId,
          response === "accept"
            ? TransferStatus.ACCEPTED
            : TransferStatus.REJECTED
        );
        loadData();
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchFreeAgents = async () => {
    setLoading(true);
    try {
      const agents = await window.electronAPI.player.getFreeAgents();
      setSearchResults(agents);
      setActiveTab("results");
    } finally {
      setLoading(false);
    }
  };

  return {
    team,
    activeTab,
    loading,
    searchResults,
    selectedPlayer,
    configuringSlot,
    currentSeasonId,
    userTeam,
    myBids,
    incomingOffers,
    currentDate,
    setActiveTab,
    setSelectedPlayer,
    setConfiguringSlot,
    saveSlotConfig,
    stopSlot,
    finalizeTransfer,
    respondToCounter,
    respondToOffer,
    fetchFreeAgents,
    refresh: loadData,
  };
}
