import { GameState } from "../core/models/gameState";

export const saveGameToDisk = async (
  saveName: string,
  state: GameState
): Promise<boolean> => {
  if (!window.electronAPI) {
    console.error("Electron API não disponível");
    return false;
  }

  const serializedState = JSON.stringify(state);

  const result = await window.electronAPI.saveGame(saveName, serializedState);

  if (!result.success) {
    console.error(result.error);
    return false;
  }

  return true;
};

export const loadGameFromDisk = async (
  saveName: string
): Promise<GameState | null> => {
  if (!window.electronAPI) return null;

  const result = await window.electronAPI.loadGame(saveName);

  if (result.success && result.data) {
    try {
      const state: GameState = JSON.parse(result.data);
      return state;
    } catch (e) {
      console.error("Save corrompido (JSON inválido)", e);
      return null;
    }
  }

  return null;
};

export const listSaveFiles = async (): Promise<string[]> => {
  if (!window.electronAPI) return [];
  return await window.electronAPI.listSaves();
};
