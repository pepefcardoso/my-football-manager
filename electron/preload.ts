import { contextBridge, ipcRenderer } from "electron";

interface SaveMetadata {
  version: string;
  timestamp: number;
  checksum: string;
  size: number;
  compressed: boolean;
}

interface SaveResult {
  success: boolean;
  error?: string;
  metadata?: SaveMetadata;
}

interface LoadResult {
  success: boolean;
  data?: string;
  error?: string;
  metadata?: SaveMetadata;
}

const electronAPI = {
  saveGame: (filename: string, data: string): Promise<SaveResult> => {
    return ipcRenderer.invoke("save-game", filename, data);
  },
  loadGame: (filename: string): Promise<LoadResult> => {
    return ipcRenderer.invoke("load-game", filename);
  },
  listSaves: (): Promise<string[]> => {
    return ipcRenderer.invoke("list-saves");
  },
  deleteSave: (filename: string): Promise<SaveResult> => {
    return ipcRenderer.invoke("delete-save", filename);
  },
  getSaveInfo: (filename: string): Promise<SaveMetadata | null> => {
    return ipcRenderer.invoke("get-save-info", filename);
  },
  openSavesFolder: (): Promise<void> => {
    return ipcRenderer.invoke("open-saves-folder");
  },
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);

export type { SaveMetadata, SaveResult, LoadResult };
export type ElectronAPI = typeof electronAPI;
