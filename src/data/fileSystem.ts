import { GameState } from "../core/models/gameState";

export const saveGameToDisk = async (
  saveName: string,
  state: GameState
): Promise<boolean> => {
  if (!window.electronAPI) {
    console.warn("Tentativa de salvar fora do Electron (Modo Web?)");
    return false;
  }

  try {
    const serializedState = JSON.stringify(state);

    const result = await window.electronAPI.saveGame(saveName, serializedState);

    if (!result.success) {
      console.error("Erro no Processo Principal:", result.error);
      return false;
    }

    return true;
  } catch (e) {
    console.error("Erro ao serializar o estado:", e);
    return false;
  }
};

export const loadGameFromDisk = async (
  saveName: string
): Promise<GameState | null> => {
  if (!window.electronAPI) return null;

  const result = await window.electronAPI.loadGame(saveName);

  if (result.success && result.data) {
    try {
      const state: GameState = JSON.parse(result.data);

      if (!state.meta || !state.clubs || !state.players) {
        throw new Error("Estrutura do Save inválida");
      }

      return state;
    } catch (e) {
      console.error("Save corrompido (JSON inválido ou incompleto)", e);
      return null;
    }
  }

  return null;
};

export const listSaveFiles = async (): Promise<string[]> => {
  if (!window.electronAPI) return [];
  return await window.electronAPI.listSaves();
};
