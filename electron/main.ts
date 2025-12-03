import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { teamRepository } from "../src/data/repositories/TeamRepository";
import { playerRepository } from "../src/data/repositories/PlayerRepository";
import { staffRepository } from "../src/data/repositories/StaffRepository";
import { matchRepository } from "../src/data/repositories/MatchRepository";
import { competitionRepository } from "../src/data/repositories/CompetitionRepository";
// import { GameEngine } from "../src/engine/GameEngine";
import { db } from "../src/db/client";
import { gameState } from "../src/db/schema";
import { eq } from "drizzle-orm";
// const gameEngine = new GameEngine();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, "..");

export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

function registerIpcHandlers() {
  ipcMain.handle("get-teams", async () => {
    try {
      return await teamRepository.findAll();
    } catch (error) {
      console.error("IPC Error [get-teams]:", error);
      return [];
    }
  });

  ipcMain.handle("get-players", async (_, teamId: number) => {
    try {
      return await playerRepository.findByTeamId(teamId);
    } catch (error) {
      console.error(`IPC Error [get-players] teamId=${teamId}:`, error);
      return [];
    }
  });

  ipcMain.handle("get-staff", async (_, teamId: number) => {
    try {
      return await staffRepository.findByTeamId(teamId);
    } catch (error) {
      console.error(`IPC Error [get-staff] teamId=${teamId}:`, error);
      return [];
    }
  });

  ipcMain.handle(
    "get-matches",
    async (_, { teamId, seasonId }: { teamId: number; seasonId: number }) => {
      try {
        return await matchRepository.findByTeamAndSeason(teamId, seasonId);
      } catch (error) {
        console.error(`IPC Error [get-matches]:`, error);
        return [];
      }
    }
  );

  ipcMain.handle("get-competitions", async () => {
    try {
      return await competitionRepository.findAll();
    } catch (error) {
      console.error("IPC Error [get-competitions]:", error);
      return [];
    }
  });

  ipcMain.handle("advance-day", async () => {
    try {
      console.log("⏳ Advancing day...");

      const currentState = await db.select().from(gameState).limit(1);
      if (!currentState[0]) throw new Error("No game state found");

      const current = new Date(currentState[0].currentDate);
      current.setDate(current.getDate() + 1);
      const nextDate = current.toISOString().split("T")[0];

      await db
        .update(gameState)
        .set({ currentDate: nextDate })
        .where(eq(gameState.id, currentState[0].id));

      return {
        date: nextDate,
        messages: ["Dia avançado com sucesso"],
      };
    } catch (error) {
      console.error("IPC Error [advance-day]:", error);
      throw error;
    }
  });

  ipcMain.handle("get-game-state", async () => {
    try {
      const state = await db.select().from(gameState).limit(1);
      return state[0];
    } catch (error) {
      console.error("IPC Error [get-game-state]:", error);
      return null;
    }
  });
}

let win: BrowserWindow | null;

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(process.env.VITE_PUBLIC as string, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();
});
