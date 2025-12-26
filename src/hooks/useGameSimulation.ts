import { useRef, useCallback, useState } from "react";
import { useGameStore } from "../store/useGameStore";
import { Logger } from "../lib/Logger";
import type { SeasonSummary } from "../components/pages/club/types";

const logger = new Logger("useGameSimulation");

export function useGameSimulation() {
  const {
    isProcessing,
    setProcessing,
    advanceDate,
    triggerEvent,
    navigateInGame,
  } = useGameStore();

  const [seasonSummary, setSeasonSummary] = useState<SeasonSummary | null>(
    null
  );
  const [showSeasonModal, setShowSeasonModal] = useState(false);
  const isSimulatingRef = useRef(false);

  const processSingleDay = useCallback(async (): Promise<{
    shouldStop: boolean;
    reason?: string;
  }> => {
    try {
      const result = await window.electronAPI.game.advanceDay();

      if (result.stopReason) {
        const stopMapping: Record<string, string> = {
          match_day: "matches",
          financial_crisis: "finances",
          transfer_proposal: "transfer",
        };

        const route = stopMapping[result.stopReason];
        if (route) {
          logger.info(`⏸️ Simulação pausada: ${result.stopReason}`);
          setTimeout(() => navigateInGame(route as any), 300);
          return { shouldStop: true, reason: result.stopReason };
        }
        return { shouldStop: true, reason: result.stopReason };
      }

      if (result.date) {
        advanceDate(result.date);
      }

      if ((result as any).narrativeEvent) {
        triggerEvent((result as any).narrativeEvent);
        return { shouldStop: true, reason: "event" };
      }

      if ((result as any).seasonRollover) {
        setSeasonSummary((result as any).seasonRollover);
        setShowSeasonModal(true);
        return { shouldStop: true, reason: "season_end" };
      }

      return { shouldStop: false };
    } catch (error) {
      logger.error("Erro crítico ao avançar dia:", error);
      return { shouldStop: true, reason: "error" };
    }
  }, [advanceDate, triggerEvent, navigateInGame]);

  const handleAdvanceOneDay = useCallback(async () => {
    if (isProcessing) return;
    setProcessing(true);
    await processSingleDay();
    setProcessing(false);
  }, [isProcessing, setProcessing, processSingleDay]);

  const handleSimulateContinue = useCallback(async () => {
    if (isProcessing) return;
    setProcessing(true);
    isSimulatingRef.current = true;

    while (isSimulatingRef.current) {
      const result = await processSingleDay();
      if (result.shouldStop) {
        isSimulatingRef.current = false;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    setProcessing(false);
  }, [isProcessing, setProcessing, processSingleDay]);

  const stopSimulation = useCallback(() => {
    isSimulatingRef.current = false;
  }, []);

  return {
    handleAdvanceOneDay,
    handleSimulateContinue,
    stopSimulation,
    seasonSummary,
    showSeasonModal,
    setShowSeasonModal,
  };
}
