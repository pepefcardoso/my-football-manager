import { useState, useCallback } from "react";
import { useGameStore } from "../store/useGameStore";
import { Logger } from "../lib/Logger";

const logger = new Logger("useGameManagement");

type ModalType = "closed" | "new_game" | "load_game";

interface GameManagementState {
  activeModal: ModalType;
  isLoading: boolean;
  loadingMessage: string | null;
  error: string | null;
}

export function useGameManagement() {
  const [uiState, setUiState] = useState<GameManagementState>({
    activeModal: "closed",
    isLoading: false,
    loadingMessage: null,
    error: null,
  });

  const { startGame, setNewGameSetup, setView, advanceDate } = useGameStore();

  const openModal = (type: ModalType) => {
    setUiState((prev) => ({ ...prev, activeModal: type, error: null }));
  };

  const closeModal = () => {
    setUiState((prev) => ({ ...prev, activeModal: "closed", error: null }));
  };

  const loadGame = useCallback(
    async (filename: string) => {
      setUiState((prev) => ({
        ...prev,
        isLoading: true,
        loadingMessage: "Carregando arquivo de save...",
        error: null,
      }));

      try {
        logger.info(`Iniciando carregamento do save: ${filename}`);

        const loadResult = await window.electronAPI.game.loadGame(filename);
        if (!loadResult.success) throw new Error(loadResult.message);

        setUiState((prev) => ({
          ...prev,
          loadingMessage: "Recuperando estado do jogo...",
        }));

        const gameState = await window.electronAPI.game.getGameState();
        if (!gameState || !gameState.playerTeamId) {
          throw new Error(
            "Estado do jogo inválido ou time não encontrado no save."
          );
        }

        setUiState((prev) => ({
          ...prev,
          loadingMessage: "Sincronizando dados dos clubes...",
        }));
        const teams = await window.electronAPI.team.getTeams();
        const userTeam = teams.find((t) => t.id === gameState.playerTeamId);

        if (!userTeam) {
          throw new Error(
            `Time do jogador (ID: ${gameState.playerTeamId}) não encontrado no banco.`
          );
        }

        advanceDate(gameState.currentDate);
        startGame(userTeam);
        closeModal();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erro desconhecido ao carregar.";
        logger.error("Falha no fluxo de loadGame", err);
        setUiState((prev) => ({
          ...prev,
          isLoading: false,
          loadingMessage: null,
          error: errorMessage,
        }));
      } finally {
        setUiState((prev) => ({
          ...prev,
          isLoading: false,
          loadingMessage: null,
        }));
      }
    },
    [startGame, advanceDate]
  );

  const setupNewGame = useCallback(
    (saveName: string, managerName: string) => {
      setNewGameSetup({ saveName, managerName });
      closeModal();
      setView("team_selection");
    },
    [setNewGameSetup, setView]
  );

  return {
    activeModal: uiState.activeModal,
    isLoading: uiState.isLoading,
    loadingMessage: uiState.loadingMessage,
    error: uiState.error,
    openNewGameModal: () => openModal("new_game"),
    openLoadGameModal: () => openModal("load_game"),
    closeModal,
    handleLoadGameConfirm: loadGame,
    handleNewGameConfirm: setupNewGame,
  };
}
