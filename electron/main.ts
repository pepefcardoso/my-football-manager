import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SAVES_DIR = path.join(app.getPath("userData"), "saves");
const BACKUPS_DIR = path.join(app.getPath("userData"), "backups");
const DIST = path.join(__dirname, "../dist");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAX_BACKUPS = 5;
const MAX_SAVE_SIZE_MB = 50;
const MAX_SAVE_SIZE_BYTES = MAX_SAVE_SIZE_MB * 1024 * 1024;
const SAVE_VERSION = "2.0.0";

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

function calculateChecksum(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-z0-9\-_]/gi, "_").substring(0, 100);
}

function validateSaveStructure(parsedData: any): {
  valid: boolean;
  error?: string;
} {
  if (!parsedData || typeof parsedData !== "object") {
    return { valid: false, error: "O conteúdo não é um objeto JSON válido." };
  }

  const requiredKeys = [
    "meta",
    "people",
    "clubs",
    "competitions",
    "matches",
    "market",
    "world",
    "system",
  ];

  const missingKeys = requiredKeys.filter((key) => !(key in parsedData));

  if (missingKeys.length > 0) {
    return {
      valid: false,
      error: `Estrutura de save inválida. Chaves ausentes: ${missingKeys.join(
        ", "
      )}`,
    };
  }

  if (!parsedData.meta?.saveName || !parsedData.meta?.version) {
    return {
      valid: false,
      error: "Metadados (meta) inválidos ou incompletos.",
    };
  }

  return { valid: true };
}

function createMetadata(data: string, byteSize: number): SaveMetadata {
  return {
    version: SAVE_VERSION,
    timestamp: Date.now(),
    checksum: calculateChecksum(data),
    size: byteSize,
    compressed: false,
  };
}

async function ensureDirectories(): Promise<void> {
  await fs.mkdir(SAVES_DIR, { recursive: true });
  await fs.mkdir(BACKUPS_DIR, { recursive: true });
}

async function createBackup(filePath: string): Promise<void> {
  try {
    const filename = path.basename(filePath);
    const timestamp = Date.now();
    const backupFilename = `${filename.replace(
      ".json",
      ""
    )}_${timestamp}.backup.json`;
    const backupPath = path.join(BACKUPS_DIR, backupFilename);

    await fs.copyFile(filePath, backupPath);
    console.log(`[BACKUP] Criado: ${backupFilename}`);

    await rotateBackups(filename);
  } catch (error) {
    console.error("[BACKUP] Falha não-crítica ao criar backup:", error);
  }
}

async function rotateBackups(originalFilename: string): Promise<void> {
  try {
    const files = await fs.readdir(BACKUPS_DIR);
    const baseFilename = originalFilename.replace(".json", "");

    const backups = files
      .filter((f) => f.startsWith(baseFilename) && f.endsWith(".backup.json"))
      .map((f) => ({
        name: f,
        path: path.join(BACKUPS_DIR, f),
        timestamp: parseInt(f.match(/_(\d+)\.backup\.json$/)?.[1] || "0"),
      }))
      .sort((a, b) => b.timestamp - a.timestamp);

    for (let i = MAX_BACKUPS; i < backups.length; i++) {
      await fs.unlink(backups[i].path);
      console.log(`[BACKUP] Rotação: Removido ${backups[i].name}`);
    }
  } catch (error) {
    console.error("[BACKUP] Erro na rotação:", error);
  }
}

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    fullscreen: false,
    resizable: true,
    minimizable: true,
    movable: true,
    icon: path.join(process.env.VITE_PUBLIC || DIST, "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
    backgroundColor: "#0f172a",
    show: false,
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.maximize();
    mainWindow?.show();
  });

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(DIST, "index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

ipcMain.handle(
  "save-game",
  async (_event, filename: string, data: string): Promise<SaveResult> => {
    try {
      await ensureDirectories();

      const byteSize = Buffer.byteLength(data, "utf-8");
      if (byteSize > MAX_SAVE_SIZE_BYTES) {
        throw new Error(
          `O arquivo excede o limite de segurança (${MAX_SAVE_SIZE_MB}MB). Tamanho atual: ${(
            byteSize /
            1024 /
            1024
          ).toFixed(2)}MB`
        );
      }

      const safeFilename = sanitizeFilename(filename);
      if (!safeFilename) {
        throw new Error("Nome de arquivo inválido ou vazio.");
      }

      let parsedData;
      try {
        parsedData = JSON.parse(data);
      } catch {
        throw new Error("Falha ao processar JSON: Formato malformado.");
      }

      const validation = validateSaveStructure(parsedData);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const filePath = path.join(SAVES_DIR, `${safeFilename}.json`);
      const tempPath = `${filePath}.tmp`;

      try {
        await fs.access(filePath);
        await createBackup(filePath);
      } catch {
        // Arquivo não existe
      }

      const metadata = createMetadata(data, byteSize);
      const finalData = JSON.stringify({
        metadata,
        gameState: parsedData,
      });

      await fs.writeFile(tempPath, finalData, "utf-8");

      await fs.rename(tempPath, filePath);

      console.log(
        `[IPC] ✅ Save: ${filePath} (${(byteSize / 1024).toFixed(2)} KB)`
      );

      return { success: true, metadata };
    } catch (error) {
      console.error("[IPC] ❌ Erro Crítico ao Salvar:", error);

      if (filename) {
        try {
          const safeFilename = sanitizeFilename(filename);
          await fs.unlink(path.join(SAVES_DIR, `${safeFilename}.json.tmp`));
        } catch {
          // Ignorar erros de limpeza
        }
      }

      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Erro desconhecido de I/O",
      };
    }
  }
);

ipcMain.handle(
  "load-game",
  async (_event, filename: string): Promise<LoadResult> => {
    try {
      const safeFilename = sanitizeFilename(filename);
      const filePath = path.join(SAVES_DIR, `${safeFilename}.json`);

      try {
        await fs.access(filePath);
      } catch {
        throw new Error(`Arquivo de save não encontrado: ${filename}`);
      }

      const rawData = await fs.readFile(filePath, "utf-8");
      const parsed = JSON.parse(rawData);

      if (parsed.metadata && parsed.gameState) {
        const metadata = parsed.metadata as SaveMetadata;

        // TODO Isso é custoso para arquivos grandes, mas garante segurança.
        // Em produção, pode ser opcional ou feito apenas em Load.
        const gameStateStr = JSON.stringify(parsed.gameState);
        const currentChecksum = calculateChecksum(gameStateStr);

        if (currentChecksum !== metadata.checksum) {
          console.warn(
            `[IPC] ⚠️ ALERTA DE INTEGRIDADE: O Checksum do save ${filename} não confere.`
          );
        }

        console.log(`[IPC] ✅ Load: ${filename} (v${metadata.version})`);

        return {
          success: true,
          data: gameStateStr,
          metadata,
        };
      } else {
        console.log(`[IPC] ⚠️ Load (Legado): ${filename}`);
        return {
          success: true,
          data: rawData,
        };
      }
    } catch (error) {
      console.error("[IPC] ❌ Erro ao Carregar:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Arquivo corrompido ou ilegível",
      };
    }
  }
);

ipcMain.handle("list-saves", async (): Promise<string[]> => {
  try {
    await ensureDirectories();
    const files = await fs.readdir(SAVES_DIR);

    return files
      .filter((file) => file.endsWith(".json") && !file.endsWith(".tmp"))
      .map((file) => file.replace(".json", ""))
      .sort((a, b) => b.localeCompare(a));
  } catch (error) {
    console.error("[IPC] Erro ao listar:", error);
    return [];
  }
});

ipcMain.handle(
  "delete-save",
  async (_event, filename: string): Promise<SaveResult> => {
    try {
      const safeFilename = sanitizeFilename(filename);
      const filePath = path.join(SAVES_DIR, `${safeFilename}.json`);

      const result = await dialog.showMessageBox({
        type: "question",
        buttons: ["Cancelar", "Deletar Permanentemente"],
        defaultId: 0,
        title: "Confirmar Exclusão",
        message: `Deseja apagar o save "${filename}"?`,
        detail: "Esta ação não pode ser desfeita.",
        noLink: true,
      });

      if (result.response === 1) {
        await fs.unlink(filePath);
        console.log(`[IPC] 🗑️ Deletado: ${filePath}`);
        return { success: true };
      }

      return { success: false, error: "Cancelado pelo usuário" };
    } catch (error) {
      console.error("[IPC] ❌ Erro ao Deletar:", error);
      return { success: false, error: "Erro ao deletar arquivo" };
    }
  }
);

ipcMain.handle(
  "get-save-info",
  async (_event, filename: string): Promise<SaveMetadata | null> => {
    try {
      const safeFilename = sanitizeFilename(filename);
      const filePath = path.join(SAVES_DIR, `${safeFilename}.json`);

      // TODO: No futuro, separar header do body em arquivos físicos diferentes para performance extrema.
      const rawData = await fs.readFile(filePath, "utf-8");
      const parsed = JSON.parse(rawData);

      if (parsed.metadata) {
        return parsed.metadata;
      }

      const stats = await fs.stat(filePath);
      return {
        version: "legacy",
        timestamp: stats.mtimeMs,
        checksum: "",
        size: stats.size,
        compressed: false,
      };
    } catch {
      return null;
    }
  }
);

ipcMain.handle("open-saves-folder", async () => {
  const { shell } = await import("electron");
  await ensureDirectories();
  shell.openPath(SAVES_DIR);
});

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  console.log("[APP] Encerrando aplicação...");
});
