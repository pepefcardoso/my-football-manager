// src/electron-env.d.ts

export interface IElectronAPI {
  saveGame: (
    filename: string,
    data: string
  ) => Promise<{ success: boolean; error?: string }>;
  loadGame: (
    filename: string
  ) => Promise<{ success: boolean; data?: string; error?: string }>;
  listSaves: () => Promise<string[]>;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
