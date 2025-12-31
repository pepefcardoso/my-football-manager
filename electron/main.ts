import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SAVES_DIR = path.join(app.getPath("userData"), "saves");
const DIST = path.join(__dirname, "../dist");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];

let win: BrowserWindow | null;

async function ensureSavesDir() {
  try {
    await fs.access(SAVES_DIR);
  } catch {
    await fs.mkdir(SAVES_DIR, { recursive: true });
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(process.env.VITE_PUBLIC || DIST, "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(DIST, "index.html"));
  }
}

ipcMain.handle("save-game", async (_event, filename: string, data: string) => {
  await ensureSavesDir();
  const safeFilename = filename.replace(/[^a-z0-9\-_]/gi, "_");
  const filePath = path.join(SAVES_DIR, `${safeFilename}.json`);
  const tempPath = `${filePath}.tmp`;

  try {
    await fs.writeFile(tempPath, data, "utf-8");
    await fs.rename(tempPath, filePath);

    console.log(`[IPC] Jogo salvo em: ${filePath}`);
    return { success: true };
  } catch (error) {
    console.error("[IPC] Erro ao salvar:", error);
    try {
      await fs.unlink(tempPath);
    } catch {}

    return { success: false, error: "Falha na escrita do disco." };
  }
});

ipcMain.handle("load-game", async (_event, filename: string) => {
  const safeFilename = filename.replace(/[^a-z0-9\-_]/gi, "_");
  const filePath = path.join(SAVES_DIR, `${safeFilename}.json`);

  try {
    const data = await fs.readFile(filePath, "utf-8");
    return { success: true, data };
  } catch (error) {
    console.error("[IPC] Erro ao carregar:", error);
    return { success: false, error: "Save não encontrado ou corrompido." };
  }
});

ipcMain.handle("list-saves", async () => {
  await ensureSavesDir();
  try {
    const files = await fs.readdir(SAVES_DIR);
    return files
      .filter((file) => file.endsWith(".json"))
      .map((file) => file.replace(".json", ""));
  } catch (error) {
    console.error("[IPC] Erro ao listar saves:", error);
    return [];
  }
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
