import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ScoutingSlot } from "../../domain/models";
import { Logger } from "../../lib/Logger";

const logger = new Logger("useScoutingNetwork");

export function useScoutingNetwork(teamId: number) {
  const queryClient = useQueryClient();

  const slotsQuery = useQuery({
    queryKey: ["scouting", "slots", teamId],
    queryFn: async () => {
      const slots = await window.electronAPI.scouting.getSlots(teamId);
      return slots as unknown as ScoutingSlot[];
    },
  });

  const resultsQuery = useQuery({
    queryKey: ["scouting", "results", teamId],
    queryFn: () =>
      window.electronAPI.scouting.getScoutedPlayersBatch({ teamId }),
  });

  const updateSlotsMutation = useMutation({
    mutationFn: async (slots: ScoutingSlot[]) => {
      return await window.electronAPI.scouting.updateSlots(
        teamId,
        slots as any[]
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["scouting", "slots", teamId],
      });
      queryClient.invalidateQueries({
        queryKey: ["scouting", "results", teamId],
      });
    },
    onError: (error) => logger.error("Erro ao atualizar slots", error),
  });

  const saveSlotConfig = (
    slotNumber: number,
    filters: ScoutingSlot["filters"],
    currentSlots: ScoutingSlot[]
  ) => {
    const newSlots = currentSlots.map((s) =>
      s.slotNumber === slotNumber
        ? ({
            ...s,
            isActive: true,
            filters,
            stats: { playersFound: 0, lastRunDate: null },
          } as ScoutingSlot)
        : s
    );
    updateSlotsMutation.mutate(newSlots);
  };

  const stopSlot = (slotNumber: number, currentSlots: ScoutingSlot[]) => {
    const newSlots = currentSlots.map((s) =>
      s.slotNumber === slotNumber ? { ...s, isActive: false } : s
    );
    updateSlotsMutation.mutate(newSlots);
  };

  return {
    slots: slotsQuery.data || [],
    results: resultsQuery.data || [],
    isLoading: slotsQuery.isLoading || resultsQuery.isLoading,
    saveSlotConfig,
    stopSlot,
  };
}
