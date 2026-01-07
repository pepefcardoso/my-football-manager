import { GameState } from "../core/models/gameState";
import { logger } from "../core/utils/Logger";

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

interface SaveInfo {
  filename: string;
  metadata: SaveMetadata | null;
  readableSize: string;
  readableDate: string;
}

function isElectron(): boolean {
  return typeof window !== "undefined" && window.electronAPI !== undefined;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function serializeGameState(state: GameState): string {
  const cleanState = JSON.parse(
    JSON.stringify(state, (key, value) => {
      if (typeof value === "function") {
        return undefined;
      }
      return value;
    })
  );

  return JSON.stringify(cleanState);
}

function validateGameState(state: unknown): state is GameState {
  if (!state || typeof state !== "object") return false;

  const s = state as any;

  if (!s.meta || typeof s.meta !== "object") return false;
  if (!s.clubs || typeof s.clubs !== "object") return false;
  if (!s.players || typeof s.players !== "object") return false;
  if (!s.managers || typeof s.managers !== "object") return false;

  return true;
}

const WEB_STORAGE_KEY_PREFIX = "maestro_save_";

function saveToWebStorage(saveName: string, state: GameState): boolean {
  try {
    const serialized = serializeGameState(state);
    const key = WEB_STORAGE_KEY_PREFIX + saveName;

    localStorage.setItem(key, serialized);
    localStorage.setItem(
      `${key}_meta`,
      JSON.stringify({
        timestamp: Date.now(),
        size: serialized.length,
      })
    );

    logger.info("WebStorage", "Save realizado com sucesso");
    return true;
  } catch (error) {
    logger.error("WebStorage", "Erro ao salvar", error);
    return false;
  }
}

function loadFromWebStorage(saveName: string): GameState | null {
  try {
    const key = WEB_STORAGE_KEY_PREFIX + saveName;
    const data = localStorage.getItem(key);

    if (!data) {
      logger.warn("WebStorage", `Save não encontrado: ${saveName}`);
      return null;
    }

    const parsed = JSON.parse(data);

    if (!validateGameState(parsed)) {
      logger.error("WebStorage", "Save inválido ou corrompido");
      return null;
    }

    return parsed;
  } catch (error) {
    logger.error("WebStorage", "Erro ao carregar", error);
    return null;
  }
}

function listWebStorageSaves(): string[] {
  const saves: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (
      key &&
      key.startsWith(WEB_STORAGE_KEY_PREFIX) &&
      !key.endsWith("_meta")
    ) {
      saves.push(key.replace(WEB_STORAGE_KEY_PREFIX, ""));
    }
  }

  return saves.sort((a, b) => b.localeCompare(a));
}

export async function saveGameToDisk(
  saveName: string,
  state: GameState
): Promise<SaveResult> {
  if (!isElectron()) {
    logger.warn("FileSystem", "Rodando em modo Web - usando localStorage");
    const success = saveToWebStorage(saveName, state);
    return {
      success,
      error: success ? undefined : "Erro ao salvar no localStorage",
    };
  }

  try {
    const serializedState = serializeGameState(state);

    const result = await window.electronAPI.saveGame(saveName, serializedState);

    if (result.success) {
      logger.info("FileSystem", "Save realizado com sucesso", {
        size: result.metadata ? formatBytes(result.metadata.size) : "N/A",
        checksum: result.metadata?.checksum.substring(0, 8) + "...",
      });
    } else {
      logger.error("FileSystem", "Erro ao salvar", result.error);
    }

    return result;
  } catch (error) {
    logger.error("FileSystem", "Exceção ao salvar", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

export async function loadGameFromDisk(
  saveName: string
): Promise<GameState | null> {
  if (!isElectron()) {
    logger.warn("FileSystem", "Rodando em modo Web - usando localStorage");
    return loadFromWebStorage(saveName);
  }

  try {
    const result = await window.electronAPI.loadGame(saveName);

    if (!result.success || !result.data) {
      logger.error("FileSystem", "Erro ao carregar", result.error);
      return null;
    }

    const parsed = JSON.parse(result.data);

    if (!validateGameState(parsed)) {
      logger.error("FileSystem", "Save inválido ou corrompido");
      return null;
    }

    logger.info("FileSystem", "Load realizado com sucesso", {
      version: result.metadata?.version,
      date: result.metadata ? formatDate(result.metadata.timestamp) : "N/A",
    });

    return parsed;
  } catch (error) {
    logger.error("FileSystem", "Exceção ao carregar", error);
    return null;
  }
}

export async function listSaveFiles(): Promise<string[]> {
  if (!isElectron()) {
    return listWebStorageSaves();
  }

  try {
    return await window.electronAPI.listSaves();
  } catch (error) {
    logger.error("FileSystem", "Erro ao listar saves", error);
    return [];
  }
}

export async function deleteSaveFile(saveName: string): Promise<SaveResult> {
  if (!isElectron()) {
    try {
      const key = WEB_STORAGE_KEY_PREFIX + saveName;
      localStorage.removeItem(key);
      localStorage.removeItem(`${key}_meta`);
      return { success: true };
    } catch (error) {
      return { success: false, error: "Erro ao deletar do localStorage" };
    }
  }

  try {
    return await window.electronAPI.deleteSave(saveName);
  } catch (error) {
    logger.error("FileSystem", "Erro ao deletar", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

export async function getSaveInfo(saveName: string): Promise<SaveInfo | null> {
  if (!isElectron()) {
    try {
      const key = WEB_STORAGE_KEY_PREFIX + saveName;
      const metaStr = localStorage.getItem(`${key}_meta`);
      if (!metaStr) return null;

      const meta = JSON.parse(metaStr);
      return {
        filename: saveName,
        metadata: {
          version: "web",
          timestamp: meta.timestamp,
          checksum: "",
          size: meta.size,
          compressed: false,
        },
        readableSize: formatBytes(meta.size),
        readableDate: formatDate(meta.timestamp),
      };
    } catch {
      return null;
    }
  }

  try {
    const metadata = await window.electronAPI.getSaveInfo(saveName);
    if (!metadata) return null;

    return {
      filename: saveName,
      metadata,
      readableSize: formatBytes(metadata.size),
      readableDate: formatDate(metadata.timestamp),
    };
  } catch (error) {
    logger.error("FileSystem", "Erro ao obter info", error);
    return null;
  }
}

export async function openSavesFolder(): Promise<void> {
  if (!isElectron()) {
    logger.warn("FileSystem", "Função disponível apenas no Electron");
    return;
  }

  try {
    await window.electronAPI.openSavesFolder();
  } catch (error) {
    logger.error("FileSystem", "Erro ao abrir pasta", error);
  }
}

export type { SaveMetadata, SaveResult, LoadResult, SaveInfo };
