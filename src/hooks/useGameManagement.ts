import { useState, useCallback, useEffect } from "react";
import { useGameStore } from "../store/useGameStore";
import { Logger } from "../lib/Logger";
import type { GameSaveMetadata } from "../domain/GameSaveTypes";

const logger = new Logger("useGameManagement");

export type GameFlowState =
  | { status: "idle"; recentSave?: GameSaveMetadata }
  | { status: "configuring_new_game" }
  | { status: "selecting_save_file" }
  | { status: "loading"; message: string }
  | { status: "error"; message: string };

export function useGameManagement() {
  const [state, setState] = useState<GameFlowState>({ status: "idle" });
  const { startGame, setNewGameSetup, setView, advanceDate, setSeasonId } =
    useGameStore();

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const saves = await window.electronAPI.game.listSaves();
        if (saves.length > 0) {
          setState((prev) =>
            prev.status === "idle" ? { ...prev, recentSave: saves[0] } : prev
          );
        }
      } catch (err) {
        logger.warn("Não foi possível buscar saves recentes", err);
      }
    };
    fetchRecent();
  }, []);

  const startNewGameFlow = useCallback(
    () => setState({ status: "configuring_new_game" }),
    []
  );

  const openLoadGameFlow = useCallback(
    () => setState({ status: "selecting_save_file" }),
    []
  );

  const resetToIdle = useCallback(() => {
    setState((prev) => ({
      status: "idle",
      recentSave: "recentSave" in prev ? (prev as any).recentSave : undefined,
    }));
  }, []);

  const loadGame = useCallback(
    async (filename: string) => {
      setState({ status: "loading", message: "Carregando arquivo de save..." });

      try {
        logger.info(`Iniciando carregamento: ${filename}`);
        const loadResult = await window.electronAPI.game.loadGame(filename);

        if (!loadResult.success) throw new Error(loadResult.message);

        setState({ status: "loading", message: "Sincronizando estado..." });
        const gameState = await window.electronAPI.game.getGameState();

        if (!gameState || !gameState.playerTeamId) {
          throw new Error("Estado do jogo inválido.");
        }

        const teams = await window.electronAPI.team.getTeams();
        const userTeam = teams.find((t) => t.id === gameState.playerTeamId);

        if (!userTeam) throw new Error("Time do jogador não encontrado.");

        advanceDate(gameState.currentDate);
        setSeasonId(gameState.currentSeasonId || 1);
        startGame(userTeam);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro desconhecido";
        logger.error("Falha no loadGame", err);
        setState({ status: "error", message: msg });
      }
    },
    [startGame, advanceDate, setSeasonId]
  );

  const handleContinueLastSave = useCallback(async () => {
    if (state.status === "idle" && state.recentSave) {
      await loadGame(state.recentSave.filename);
    }
  }, [state, loadGame]);

  const confirmNewGameSetup = useCallback(
    (saveName: string, managerName: string) => {
      setNewGameSetup({ saveName, managerName });
      setSeasonId(1);
      setView("team_selection");
    },
    [setNewGameSetup, setView, setSeasonId]
  );

  return {
    state,
    actions: {
      startNewGameFlow,
      openLoadGameFlow,
      handleContinueLastSave,
      confirmNewGameSetup,
      confirmLoadGame: loadGame,
      resetToIdle,
    },
  };
}
