import { app, ipcMain } from "electron";
import path from "path";
import fs from "fs/promises";

const SAVES_DIR = path.join(app.getPath("userData"), "saves");

async function ensureSavesDir() {
  try {
    await fs.access(SAVES_DIR);
  } catch {
    await fs.mkdir(SAVES_DIR, { recursive: true });
  }
}

ipcMain.handle("save-game", async (_event, filename: string, data: string) => {
  await ensureSavesDir();
  const filePath = path.join(SAVES_DIR, `${filename}.json`);
  try {
    await fs.writeFile(filePath, data, "utf-8");
    return { success: true };
  } catch (error) {
    console.error("Erro ao salvar:", error);
    return { success: false, error: "Falha na escrita do disco." };
  }
});

ipcMain.handle("load-game", async (_event, filename: string) => {
  const filePath = path.join(SAVES_DIR, `${filename}.json`);
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return { success: true, data };
  } catch (error) {
    console.error("Erro ao carregar:", error);
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
    return [];
  }
});
