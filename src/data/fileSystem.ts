import { GameState } from "../core/models/gameState";
import { logger } from "../core/utils/Logger";
import { GameStateSchema } from "./schemas/gameStateSchema";

export interface SaveMetadata {
  version: string;
  timestamp: number;
  checksum: string;
  size: number;
  compressed: boolean;
}

export interface SaveResult {
  success: boolean;
  error?: string;
  metadata?: SaveMetadata;
}

export interface LoadResult {
  success: boolean;
  data?: string;
  error?: string;
  metadata?: SaveMetadata;
}

export interface SaveInfo {
  filename: string;
  metadata: SaveMetadata | null;
  readableSize: string;
  readableDate: string;
}

function getElectronAPI() {
  return (window as any).electronAPI;
}

function isElectron(): boolean {
  return typeof window !== "undefined" && getElectronAPI() !== undefined;
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

function parseAndValidateGameState(data: unknown): GameState | null {
  const result = GameStateSchema.safeParse(data);

  if (!result.success) {
    logger.error("FileSystem", "Falha na validação do Schema (Zod)", {
      errors: result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .slice(0, 5),
    });
    return null;
  }

  return result.data as unknown as GameState;
}

export async function saveGameToDisk(
  saveName: string,
  state: GameState
): Promise<SaveResult> {
  return logger.timeAsync("FileSystem", `Save Game (${saveName})`, async () => {
    if (!isElectron()) {
      const errorMsg =
        "Ambiente Web não suporta persistência de Saves (Requer Electron).";
      logger.error("FileSystem", errorMsg);
      return { success: false, error: errorMsg };
    }

    try {
      const serializedState = serializeGameState(state);

      const result = await getElectronAPI().saveGame(saveName, serializedState);

      if (result.success) {
        logger.info("FileSystem", "Save gravado em disco", {
          size: result.metadata ? formatBytes(result.metadata.size) : "N/A",
          checksum: result.metadata?.checksum.substring(0, 8) + "...",
        });
      } else {
        logger.error("FileSystem", "Erro ao salvar em disco", result.error);
      }

      return result;
    } catch (error) {
      logger.error("FileSystem", "Exceção crítica ao salvar", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      };
    }
  });
}

export async function loadGameFromDisk(
  saveName: string
): Promise<GameState | null> {
  return logger.timeAsync("FileSystem", `Load Game (${saveName})`, async () => {
    if (!isElectron()) {
      logger.error(
        "FileSystem",
        "Ambiente Web não suporta carregamento de arquivos."
      );
      return null;
    }

    try {
      const result = await getElectronAPI().loadGame(saveName);

      if (!result.success || !result.data) {
        logger.error("FileSystem", "Erro ao carregar do disco", result.error);
        return null;
      }

      const parsedRaw = JSON.parse(result.data);
      const validatedState = parseAndValidateGameState(parsedRaw);

      if (!validatedState) {
        logger.error(
          "FileSystem",
          "Save inválido ou corrompido (Schema Mismatch)"
        );
        return null;
      }

      logger.debug("FileSystem", "Metadados do Save", {
        version: result.metadata?.version,
        timestamp: result.metadata
          ? formatDate(result.metadata.timestamp)
          : "N/A",
      });

      return validatedState;
    } catch (error) {
      logger.error("FileSystem", "Exceção crítica ao carregar", error);
      return null;
    }
  });
}

export async function listSaveFiles(): Promise<string[]> {
  if (!isElectron()) {
    return [];
  }

  try {
    return await getElectronAPI().listSaves();
  } catch (error) {
    logger.error("FileSystem", "Erro ao listar saves", error);
    return [];
  }
}

export async function deleteSaveFile(saveName: string): Promise<SaveResult> {
  if (!isElectron()) {
    return { success: false, error: "Não suportado na Web" };
  }

  try {
    return await getElectronAPI().deleteSave(saveName);
  } catch (error) {
    logger.error("FileSystem", "Erro ao deletar", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

export async function getSaveInfo(saveName: string): Promise<SaveInfo | null> {
  if (!isElectron()) return null;

  try {
    const metadata = await getElectronAPI().getSaveInfo(saveName);
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
  if (!isElectron()) return;

  try {
    await getElectronAPI().openSavesFolder();
  } catch (error) {
    logger.error("FileSystem", "Erro ao abrir pasta", error);
  }
}
