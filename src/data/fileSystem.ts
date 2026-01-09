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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).electronAPI;
}

function isElectron(): boolean {
  const api = getElectronAPI();
  return typeof window !== "undefined" && api !== undefined;
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
    JSON.stringify(state, (_key, value) => {
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
    logger.error(
      "FileSystem",
      "❌ Falha crítica de validação (Schema Mismatch)",
      {
        errors: result.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .slice(0, 5),
      }
    );
    return null;
  }

  return result.data as unknown as GameState;
}

export async function saveGameToDisk(
  saveName: string,
  state: GameState
): Promise<SaveResult> {
  const mode = isElectron() ? "DISK" : "MEMORY";

  state.meta.persistenceMode = mode;

  return logger.timeAsync(
    "FileSystem",
    `Save Game (${saveName}) [${mode}]`,
    async () => {
      const serializedState = serializeGameState(state);
      const byteSize = new Blob([serializedState]).size;

      if (mode === "MEMORY") {
        logger.warn(
          "FileSystem",
          "⚠️ Save Volátil: Dados persistem apenas na RAM/Sessão."
        );

        await new Promise((resolve) => setTimeout(resolve, 500));

        return {
          success: true,
          metadata: {
            version: state.meta.version,
            timestamp: Date.now(),
            checksum: "VOLATILE_MEMORY_HASH",
            size: byteSize,
            compressed: false,
          },
        };
      }

      try {
        const result = await getElectronAPI().saveGame(
          saveName,
          serializedState
        );

        if (result.success) {
          logger.info("FileSystem", "✅ Save gravado em disco (Electron)", {
            size: result.metadata ? formatBytes(result.metadata.size) : "N/A",
            checksum: result.metadata?.checksum.substring(0, 8),
          });
        } else {
          logger.error("FileSystem", "❌ Erro Electron Main", result.error);
        }

        return result;
      } catch (error) {
        logger.error("FileSystem", "❌ Falha Crítica IPC Save", error);
        return { success: false, error: (error as Error).message };
      }
    }
  );
}

export async function loadGameFromDisk(
  saveName: string
): Promise<GameState | null> {
  return logger.timeAsync("FileSystem", `Load Game (${saveName})`, async () => {
    if (!isElectron()) {
      logger.warn(
        "FileSystem",
        "Ambiente Web: Load de disco desativado. Inicie um Novo Jogo."
      );
      return null;
    }

    try {
      const result = await getElectronAPI().loadGame(saveName);

      if (!result.success || !result.data) {
        logger.error("FileSystem", "Falha Load Electron", result.error);
        return null;
      }

      const rawData = result.data;
      const metadata = result.metadata;
      const parsedRaw = JSON.parse(rawData);
      const stateToValidate = parsedRaw.gameState || parsedRaw;
      const validatedState = parseAndValidateGameState(stateToValidate);

      if (validatedState) {
        validatedState.meta.persistenceMode = "DISK";
        if (metadata) {
          logger.info(
            "FileSystem",
            `✅ Save carregado: v${metadata.version} (${formatBytes(
              metadata.size
            )})`
          );
        }
      }

      return validatedState;
    } catch (error) {
      logger.error("FileSystem", "Erro Fatal ao carregar/parsear save", error);
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
    logger.error("FileSystem", "Erro IPC List", error);
    return [];
  }
}

export async function deleteSaveFile(saveName: string): Promise<SaveResult> {
  if (!isElectron()) {
    return { success: true };
  }

  try {
    return await getElectronAPI().deleteSave(saveName);
  } catch (error) {
    logger.error("FileSystem", "Erro IPC Delete", error);
    return { success: false, error: (error as Error).message };
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
    logger.error("FileSystem", "Erro IPC Info", error);
    return null;
  }
}

export async function openSavesFolder(): Promise<void> {
  if (!isElectron()) {
    logger.warn(
      "FileSystem",
      "Acesso ao sistema de arquivos restrito ao Electron."
    );
    return;
  }

  try {
    await getElectronAPI().openSavesFolder();
  } catch (error) {
    logger.error("FileSystem", "Erro ao abrir pasta de saves", error);
  }
}
