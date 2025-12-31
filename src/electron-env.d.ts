/// <reference types="vite/client" />

interface IElectronAPI {
  saveGame: (
    filename: string,
    data: string
  ) => Promise<{ success: boolean; error?: string }>;
  loadGame: (
    filename: string
  ) => Promise<{ success: boolean; data?: string; error?: string }>;
  listSaves: () => Promise<string[]>;
}

interface Window {
  electronAPI: IElectronAPI;
}
