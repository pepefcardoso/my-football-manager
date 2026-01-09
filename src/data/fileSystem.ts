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

const WEB_SAVE_PREFIX = "maestro_save_";

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
    const serializedState = serializeGameState(state);

    if (isElectron()) {
      try {
        const result = await getElectronAPI().saveGame(
          saveName,
          serializedState
        );
        if (result.success) {
          logger.info("FileSystem", "Save gravado em disco (Electron)", {
            size: result.metadata ? formatBytes(result.metadata.size) : "N/A",
          });
        } else {
          logger.error(
            "FileSystem",
            "Erro do Electron ao salvar",
            result.error
          );
        }
        return result;
      } catch (error) {
        logger.error("FileSystem", "Exceção IPC ao salvar", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Erro IPC",
        };
      }
    }

    try {
      const key = `${WEB_SAVE_PREFIX}${saveName}`;
      localStorage.setItem(key, serializedState);

      const size = new Blob([serializedState]).size;
      logger.warn(
        "FileSystem",
        "⚠️ Save gravado em LocalStorage (Modo Web/Dev)",
        {
          key,
          size: formatBytes(size),
        }
      );

      return {
        success: true,
        metadata: {
          version: "web-dev",
          timestamp: Date.now(),
          checksum: "web-no-checksum",
          size: size,
          compressed: false,
        },
      };
    } catch (error) {
      logger.error(
        "FileSystem",
        "Erro ao salvar no LocalStorage (Quota?)",
        error
      );
      return {
        success: false,
        error:
          "Falha no LocalStorage (Provavelmente limite de espaço excedido).",
      };
    }
  });
}

export async function loadGameFromDisk(
  saveName: string
): Promise<GameState | null> {
  return logger.timeAsync("FileSystem", `Load Game (${saveName})`, async () => {
    let rawData: string | null = null;
    let metadata: SaveMetadata | undefined;

    if (isElectron()) {
      try {
        const result = await getElectronAPI().loadGame(saveName);
        if (!result.success || !result.data) {
          logger.error(
            "FileSystem",
            "Erro ao carregar (Electron)",
            result.error
          );
          return null;
        }
        rawData = result.data;
        metadata = result.metadata;
      } catch (error) {
        logger.error("FileSystem", "Exceção IPC ao carregar", error);
        return null;
      }
    } else {
      const key = `${WEB_SAVE_PREFIX}${saveName}`;
      rawData = localStorage.getItem(key);
      if (!rawData) {
        logger.error(
          "FileSystem",
          `Save não encontrado no LocalStorage: ${key}`
        );
        return null;
      }
      logger.info("FileSystem", "Save carregado do LocalStorage");
    }

    if (!rawData) {
      logger.error("FileSystem", "Dados do save estão vazios ou nulos.");
      return null;
    }

    try {
      const parsedRaw = JSON.parse(rawData);

      const stateToValidate = parsedRaw.gameState || parsedRaw;

      const validatedState = parseAndValidateGameState(stateToValidate);

      if (!validatedState) {
        logger.error(
          "FileSystem",
          "Save inválido ou corrompido (Schema Mismatch)"
        );
        return null;
      }

      if (metadata) {
        logger.debug("FileSystem", "Metadados do Save", {
          version: metadata.version,
          timestamp: formatDate(metadata.timestamp),
        });
      }

      return validatedState;
    } catch (error) {
      logger.error("FileSystem", "Erro ao processar JSON do save", error);
      return null;
    }
  });
}

export async function listSaveFiles(): Promise<string[]> {
  if (isElectron()) {
    try {
      return await getElectronAPI().listSaves();
    } catch (error) {
      logger.error("FileSystem", "Erro ao listar saves (IPC)", error);
      return [];
    }
  }

  const saves: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(WEB_SAVE_PREFIX)) {
      saves.push(key.replace(WEB_SAVE_PREFIX, ""));
    }
  }
  return saves;
}

export async function deleteSaveFile(saveName: string): Promise<SaveResult> {
  if (isElectron()) {
    try {
      return await getElectronAPI().deleteSave(saveName);
    } catch (error) {
      logger.error("FileSystem", "Erro ao deletar (IPC)", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      };
    }
  }

  try {
    const key = `${WEB_SAVE_PREFIX}${saveName}`;
    if (confirm(`(Web Mode) Deletar save "${saveName}" permanentemente?`)) {
      localStorage.removeItem(key);
      logger.info("FileSystem", `Save deletado do LocalStorage: ${key}`);
      return { success: true };
    }
    return { success: false, error: "Cancelado pelo usuário" };
  } catch (error) {
    logger.error(
      "FileSystem",
      "Erro ao acessar LocalStorage durante deleção",
      error
    );
    return { success: false, error: "Erro ao acessar LocalStorage" };
  }
}

export async function getSaveInfo(saveName: string): Promise<SaveInfo | null> {
  if (isElectron()) {
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
      logger.error("FileSystem", "Erro ao obter info (IPC)", error);
      return null;
    }
  }

  const key = `${WEB_SAVE_PREFIX}${saveName}`;
  const data = localStorage.getItem(key);
  if (!data) return null;

  const size = new Blob([data]).size;

  return {
    filename: saveName,
    metadata: null,
    readableSize: formatBytes(size),
    readableDate: "Local (Dev)",
  };
}

export async function openSavesFolder(): Promise<void> {
  if (isElectron()) {
    try {
      await getElectronAPI().openSavesFolder();
    } catch (error) {
      logger.error("FileSystem", "Erro ao abrir pasta", error);
    }
  } else {
    alert(
      "Em modo Web, os saves estão no LocalStorage do navegador (F12 -> Application)."
    );
  }
}
