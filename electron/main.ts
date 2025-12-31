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
const SAVE_VERSION = "1.0.0";

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

async function ensureDirectories(): Promise<void> {
  try {
    await fs.access(SAVES_DIR);
  } catch {
    await fs.mkdir(SAVES_DIR, { recursive: true });
  }

  try {
    await fs.access(BACKUPS_DIR);
  } catch {
    await fs.mkdir(BACKUPS_DIR, { recursive: true });
  }
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

    await cleanOldBackups(filename);
  } catch (error) {
    console.error("[BACKUP] Erro ao criar backup:", error);
  }
}

async function cleanOldBackups(originalFilename: string): Promise<void> {
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
      console.log(`[BACKUP] Removido backup antigo: ${backups[i].name}`);
    }
  } catch (error) {
    console.error("[BACKUP] Erro ao limpar backups:", error);
  }
}

function validateSaveStructure(data: string): boolean {
  try {
    const parsed = JSON.parse(data);

    if (!parsed.meta || typeof parsed.meta !== "object") return false;
    if (!parsed.clubs || typeof parsed.clubs !== "object") return false;
    if (!parsed.players || typeof parsed.players !== "object") return false;

    return true;
  } catch {
    return false;
  }
}

function createMetadata(data: string): SaveMetadata {
  return {
    version: SAVE_VERSION,
    timestamp: Date.now(),
    checksum: calculateChecksum(data),
    size: Buffer.byteLength(data, "utf-8"),
    compressed: false, // TODO: Implementar compressão futura
  };
}

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
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
    mainWindow?.show();
  });

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
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

      const safeFilename = sanitizeFilename(filename);
      if (!safeFilename) {
        return { success: false, error: "Nome de arquivo inválido" };
      }

      const filePath = path.join(SAVES_DIR, `${safeFilename}.json`);
      const tempPath = `${filePath}.tmp`;

      if (!validateSaveStructure(data)) {
        return { success: false, error: "Estrutura de save inválida" };
      }

      try {
        await fs.access(filePath);
        await createBackup(filePath);
      } catch {
        //
      }

      const metadata = createMetadata(data);

      const finalData = JSON.stringify({
        metadata,
        gameState: JSON.parse(data),
      });

      await fs.writeFile(tempPath, finalData, "utf-8");

      await fs.rename(tempPath, filePath);

      console.log(`[IPC] ✅ Save bem-sucedido: ${filePath}`);
      console.log(`[IPC] 📊 Tamanho: ${(metadata.size / 1024).toFixed(2)} KB`);

      return { success: true, metadata };
    } catch (error) {
      console.error("[IPC] ❌ Erro ao salvar:", error);

      try {
        const tempPath = path.join(
          SAVES_DIR,
          `${sanitizeFilename(filename)}.json.tmp`
        );
        await fs.unlink(tempPath);
      } catch {
        //
      }

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro desconhecido ao salvar",
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

      const rawData = await fs.readFile(filePath, "utf-8");

      const parsed = JSON.parse(rawData);

      if (parsed.metadata && parsed.gameState) {
        const metadata = parsed.metadata as SaveMetadata;

        const gameStateStr = JSON.stringify(parsed.gameState);
        const currentChecksum = calculateChecksum(gameStateStr);

        if (currentChecksum !== metadata.checksum) {
          console.warn(
            "[IPC] ⚠️ Checksum não corresponde - possível corrupção"
          );
        }

        console.log(`[IPC] ✅ Load bem-sucedido: ${filePath}`);
        console.log(`[IPC] 📊 Versão: ${metadata.version}`);

        return {
          success: true,
          data: gameStateStr,
          metadata,
        };
      } else {
        console.log(`[IPC] ✅ Load bem-sucedido (formato legado): ${filePath}`);
        return {
          success: true,
          data: rawData,
        };
      }
    } catch (error) {
      console.error("[IPC] ❌ Erro ao carregar:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Save não encontrado ou corrompido",
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
    console.error("[IPC] ❌ Erro ao listar saves:", error);
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
        buttons: ["Cancelar", "Deletar"],
        defaultId: 0,
        title: "Confirmar Exclusão",
        message: `Tem certeza que deseja deletar o save "${filename}"?`,
        detail: "Esta ação não pode ser desfeita.",
      });

      if (result.response === 1) {
        await fs.unlink(filePath);
        console.log(`[IPC] 🗑️ Save deletado: ${filePath}`);
        return { success: true };
      }

      return { success: false, error: "Operação cancelada pelo utilizador" };
    } catch (error) {
      console.error("[IPC] ❌ Erro ao deletar:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro ao deletar save",
      };
    }
  }
);

ipcMain.handle(
  "get-save-info",
  async (_event, filename: string): Promise<SaveMetadata | null> => {
    try {
      const safeFilename = sanitizeFilename(filename);
      const filePath = path.join(SAVES_DIR, `${safeFilename}.json`);

      const rawData = await fs.readFile(filePath, "utf-8");
      const parsed = JSON.parse(rawData);

      if (parsed.metadata) {
        return parsed.metadata as SaveMetadata;
      }

      const stats = await fs.stat(filePath);
      return {
        version: "legacy",
        timestamp: stats.mtime.getTime(),
        checksum: "",
        size: stats.size,
        compressed: false,
      };
    } catch (error) {
      console.error("[IPC] ❌ Erro ao obter info:", error);
      return null;
    }
  }
);

ipcMain.handle("open-saves-folder", async (): Promise<void> => {
  const { shell } = await import("electron");
  await ensureDirectories();
  shell.openPath(SAVES_DIR);
});

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  console.log("[APP] 🛑 Encerrando aplicação...");
});
