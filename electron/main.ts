import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { teamRepository } from "../src/repositories/TeamRepository";
import { playerRepository } from "../src/repositories/PlayerRepository";
import { staffRepository } from "../src/repositories/StaffRepository";
import { matchRepository } from "../src/repositories/MatchRepository";
import { competitionRepository } from "../src/repositories/CompetitionRepository";
// import { GameEngine } from "../src/engine/GameEngine";
import { db } from "../src/db/client";
import { gameState } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { StaffService } from "../src/services/StaffService";
import { TrainingFocus } from "../src/domain/types";
import { matchService } from "../src/services/MatchService";
import { dailySimulationService } from "../src/services/DailySimulationService";
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
      console.log("⏳ Advancing day process started...");

      const currentState = await db.select().from(gameState).limit(1);
      if (!currentState[0]) throw new Error("No game state found");

      const state = currentState[0];
      const nextDateRaw = new Date(state.currentDate);
      nextDateRaw.setDate(nextDateRaw.getDate() + 1);
      const nextDate = nextDateRaw.toISOString().split("T")[0];

      const logs: string[] = [`Dia avançado para ${nextDate}`];

      if (state.playerTeamId) {
        const players = await playerRepository.findByTeamId(state.playerTeamId);

        const staffService = new StaffService();
        const staffImpact = await staffService.getStaffImpact(
          state.playerTeamId
        );

        const focus =
          (state.trainingFocus as TrainingFocus) || TrainingFocus.TECHNICAL;

        const simResult = dailySimulationService.processTeamDailyLoop(
          players,
          focus,
          staffImpact
        );

        await playerRepository.updateDailyStatsBatch(simResult.playerUpdates);

        logs.push(...simResult.logs);
      }

      await db
        .update(gameState)
        .set({ currentDate: nextDate })
        .where(eq(gameState.id, state.id));

      console.log("✅ Daily processing complete.");

      return {
        date: nextDate,
        messages: logs,
      };
    } catch (error) {
      console.error("IPC Error [advance-day]:", error);
      throw error;
    }
  });

  ipcMain.handle("update-training-focus", async (_, focus: string) => {
    try {
      const currentState = await db.select().from(gameState).limit(1);
      if (!currentState[0]) return false;

      await db
        .update(gameState)
        .set({ trainingFocus: focus })
        .where(eq(gameState.id, currentState[0].id));

      return true;
    } catch (error) {
      console.error("IPC Error [update-training-focus]:", error);
      return false;
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

  ipcMain.handle("start-match", async (_, matchId: number) => {
    try {
      const engine = await matchService.initializeMatch(matchId);
      if (!engine) return false;

      return matchService.startMatch(matchId);
    } catch (error) {
      console.error(`IPC Error [start-match] matchId=${matchId}:`, error);
      return false;
    }
  });

  ipcMain.handle("pause-match", async (_, matchId: number) => {
    try {
      return matchService.pauseMatch(matchId);
    } catch (error) {
      console.error(`IPC Error [pause-match] matchId=${matchId}:`, error);
      return false;
    }
  });

  ipcMain.handle("resume-match", async (_, matchId: number) => {
    try {
      return matchService.resumeMatch(matchId);
    } catch (error) {
      console.error(`IPC Error [resume-match] matchId=${matchId}:`, error);
      return false;
    }
  });

  ipcMain.handle("simulate-match-minute", async (_, matchId: number) => {
    try {
      return matchService.simulateMinute(matchId);
    } catch (error) {
      console.error(
        `IPC Error [simulate-match-minute] matchId=${matchId}:`,
        error
      );
      return null;
    }
  });

  ipcMain.handle("simulate-full-match", async (_, matchId: number) => {
    try {
      return await matchService.simulateFullMatch(matchId);
    } catch (error) {
      console.error(
        `IPC Error [simulate-full-match] matchId=${matchId}:`,
        error
      );
      return null;
    }
  });

  ipcMain.handle("get-match-state", async (_, matchId: number) => {
    try {
      return matchService.getMatchState(matchId);
    } catch (error) {
      console.error(`IPC Error [get-match-state] matchId=${matchId}:`, error);
      return null;
    }
  });

  ipcMain.handle("simulate-matches-of-date", async (_, date: string) => {
    try {
      return await matchService.simulateMatchesOfDate(date);
    } catch (error) {
      console.error(
        `IPC Error [simulate-matches-of-date] date=${date}:`,
        error
      );
      return { matchesPlayed: 0, results: [] };
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
      preload: path.join(__dirname, "preload.mjs"),
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
