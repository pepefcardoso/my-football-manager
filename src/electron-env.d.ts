/// <reference types="vite/client" />

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

interface IElectronAPI {
  saveGame: (filename: string, data: string) => Promise<SaveResult>;
  loadGame: (filename: string) => Promise<LoadResult>;
  listSaves: () => Promise<string[]>;
  deleteSave: (filename: string) => Promise<SaveResult>;
  getSaveInfo: (filename: string) => Promise<SaveMetadata | null>;
  openSavesFolder: () => Promise<void>;
}

interface Window {
  electronAPI: IElectronAPI;
}

interface ImportMetaEnv {
  readonly VITE_DEV_SERVER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
