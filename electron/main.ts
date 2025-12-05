import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { teamRepository } from "../src/repositories/TeamRepository";
import { playerRepository } from "../src/repositories/PlayerRepository";
import { staffRepository } from "../src/repositories/StaffRepository";
import { matchRepository } from "../src/repositories/MatchRepository";
import { competitionRepository } from "../src/repositories/CompetitionRepository";
import { gameState } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { StaffService } from "../src/services/StaffService";
import { dailySimulationService } from "../src/services/DailySimulationService";
import { db } from "../src/lib/db";
import { TrainingFocus } from "../src/domain/enums";
import { matchService } from "../src/services/MatchService";
import { FinanceService } from "../src/services/FinanceService";
import { contractService } from "../src/services/ContractService";
import { scoutingService } from "../src/services/ScoutingService";
import { infrastructureService } from "../src/services/InfrastructureService";
import { Logger } from "../src/lib/Logger";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logger = new Logger("electron-main");

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
      logger.error("IPC Error [get-teams]:", error);
      return [];
    }
  });

  ipcMain.handle("get-players", async (_, teamId: number) => {
    try {
      return await playerRepository.findByTeamId(teamId);
    } catch (error) {
      logger.error(`IPC Error [get-players] teamId=${teamId}:`, error);
      return [];
    }
  });

  ipcMain.handle("get-staff", async (_, teamId: number) => {
    try {
      return await staffRepository.findByTeamId(teamId);
    } catch (error) {
      logger.error(`IPC Error [get-staff] teamId=${teamId}:`, error);
      return [];
    }
  });

  ipcMain.handle(
    "get-matches",
    async (_, { teamId, seasonId }: { teamId: number; seasonId: number }) => {
      try {
        return await matchRepository.findByTeamAndSeason(teamId, seasonId);
      } catch (error) {
        logger.error(`IPC Error [get-matches]:`, error);
        return [];
      }
    }
  );

  ipcMain.handle("get-competitions", async () => {
    try {
      return await competitionRepository.findAll();
    } catch (error) {
      logger.error("IPC Error [get-competitions]:", error);
      return [];
    }
  });

  ipcMain.handle("advance-day", async () => {
    try {
      logger.info("Advancing day process started...");

      const currentState = await db.select().from(gameState).limit(1);
      if (!currentState[0]) throw new Error("No game state found");

      const state = currentState[0];
      const nextDateRaw = new Date(state.currentDate);
      nextDateRaw.setDate(nextDateRaw.getDate() + 1);
      const nextDate = nextDateRaw.toISOString().split("T")[0];

      const logs: string[] = [`📅 Dia avançado para ${nextDate}`];

      if (FinanceService.isPayDay(nextDate) && state.currentSeasonId) {
        logger.info(
          "Dia de pagamento detectado! Processando salários mensais..."
        );

        const allTeams = await teamRepository.findAll();

        for (const team of allTeams) {
          const result = await FinanceService.processMonthlyExpenses(
            team.id,
            nextDate,
            state.currentSeasonId
          );

          if (result.success) {
            logs.push(
              `💸 ${
                team.name
              }: Despesas mensais €${result.totalExpense.toLocaleString(
                "pt-PT"
              )}`
            );
            logs.push(
              `   └─ Jogadores: €${result.playerWages.toLocaleString(
                "pt-PT"
              )} | Staff: €${result.staffWages.toLocaleString("pt-PT")}`
            );

            const health = await FinanceService.checkFinancialHealth(team.id);

            if (!health.isHealthy) {
              logs.push(`⚠️ ${team.name}: CRISE FINANCEIRA DETECTADA`);
              logs.push(
                `   └─ Orçamento: €${health.currentBudget.toLocaleString(
                  "pt-PT"
                )} (${health.severity.toUpperCase()})`
              );

              health.penaltiesApplied.forEach((penalty) => {
                logs.push(`   └─ ⚠️ ${penalty}`);
              });

              if (health.severity === "critical") {
                logs.push(`   └─ 🚨 ATENÇÃO: Situação financeira CRÍTICA!`);
              }
            } else {
              logs.push(
                `   └─ Orçamento: €${result.newBudget.toLocaleString(
                  "pt-PT"
                )} ✅`
              );
            }
          } else {
            logs.push(`❌ ${team.name}: Erro ao processar despesas`);
          }
        }
      }

      if (state.playerTeamId && !FinanceService.isPayDay(nextDate)) {
        const health = await FinanceService.checkFinancialHealth(
          state.playerTeamId
        );

        if (!health.isHealthy) {
          logs.push(`⚠️ Alerta: Seu clube ainda está com orçamento negativo`);
          logs.push(
            `   └─ Saldo: €${health.currentBudget.toLocaleString("pt-PT")}`
          );

          if (health.hasTransferBan) {
            logs.push(`   └─ 🚫 Transfer Ban ativo - Contratações bloqueadas`);
          }
        }
      }

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

      if (state.currentSeasonId) {
        const expirations = await contractService.checkExpiringContracts(
          nextDate
        );

        if (expirations.playersReleased > 0) {
          logs.push(
            `📋 ${expirations.playersReleased} jogador(es) liberado(s) por término de contrato`
          );
        }

        if (expirations.staffReleased > 0) {
          logs.push(
            `📋 ${expirations.staffReleased} membro(s) do staff liberado(s) por término de contrato`
          );
        }
      }

      if (state.currentSeasonId) {
        const matchResults = await matchService.simulateMatchesOfDate(nextDate);

        if (matchResults.matchesPlayed > 0) {
          logs.push(`⚽ ${matchResults.matchesPlayed} partida(s) simulada(s)`);

          for (const { matchId, result } of matchResults.results) {
            const match = await matchRepository.findById(matchId);
            if (match) {
              const homeTeam = await teamRepository.findById(match.homeTeamId!);
              const awayTeam = await teamRepository.findById(match.awayTeamId!);

              logs.push(
                `   └─ ${homeTeam?.shortName} ${result.homeScore} x ${result.awayScore} ${awayTeam?.shortName}`
              );
            }
          }
        }
      }

      try {
        await scoutingService.processDailyScouting(nextDate);
      } catch (error) {
        logger.error("Erro ao processar scouting diário:", error);
      }

      await db
        .update(gameState)
        .set({ currentDate: nextDate })
        .where(eq(gameState.id, state.id));

      logger.info("Daily processing complete.");

      return {
        date: nextDate,
        messages: logs,
      };
    } catch (error) {
      logger.error("IPC Error [advance-day]:", error);
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
      logger.error("IPC Error [update-training-focus]:", error);
      return false;
    }
  });

  ipcMain.handle("get-game-state", async () => {
    try {
      const state = await db.select().from(gameState).limit(1);
      return state[0];
    } catch (error) {
      logger.error("IPC Error [get-game-state]:", error);
      return null;
    }
  });

  ipcMain.handle("check-financial-health", async (_, teamId: number) => {
    try {
      return await FinanceService.checkFinancialHealth(teamId);
    } catch (error) {
      logger.error(
        `IPC Error [check-financial-health] teamId=${teamId}:`,
        error
      );
      return null;
    }
  });

  ipcMain.handle("can-make-transfers", async (_, teamId: number) => {
    try {
      return await FinanceService.canMakeTransfers(teamId);
    } catch (error) {
      logger.error(`IPC Error [can-make-transfers] teamId=${teamId}:`, error);
      return { allowed: false, reason: "Erro ao verificar permissões" };
    }
  });

  ipcMain.handle("get-wage-bill", async (_, teamId: number) => {
    try {
      return await contractService.calculateMonthlyWageBill(teamId);
    } catch (error) {
      logger.error(`IPC Error [get-wage-bill] teamId=${teamId}:`, error);
      return null;
    }
  });

  ipcMain.handle("start-match", async (_, matchId: number) => {
    try {
      const engine = await matchService.initializeMatch(matchId);
      if (!engine) return false;

      return matchService.startMatch(matchId);
    } catch (error) {
      logger.error(`IPC Error [start-match] matchId=${matchId}:`, error);
      return false;
    }
  });

  ipcMain.handle("pause-match", async (_, matchId: number) => {
    try {
      return matchService.pauseMatch(matchId);
    } catch (error) {
      logger.error(`IPC Error [pause-match] matchId=${matchId}:`, error);
      return false;
    }
  });

  ipcMain.handle("resume-match", async (_, matchId: number) => {
    try {
      return matchService.resumeMatch(matchId);
    } catch (error) {
      logger.error(`IPC Error [resume-match] matchId=${matchId}:`, error);
      return false;
    }
  });

  ipcMain.handle("simulate-match-minute", async (_, matchId: number) => {
    try {
      return matchService.simulateMinute(matchId);
    } catch (error) {
      logger.error(
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
      logger.error(
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
      logger.error(`IPC Error [get-match-state] matchId=${matchId}:`, error);
      return null;
    }
  });

  ipcMain.handle("simulate-matches-of-date", async (_, date: string) => {
    try {
      return await matchService.simulateMatchesOfDate(date);
    } catch (error) {
      logger.error(`IPC Error [simulate-matches-of-date] date=${date}:`, error);
      return { matchesPlayed: 0, results: [] };
    }
  });

  ipcMain.handle(
    "get-financial-records",
    async (_, { teamId, seasonId }: { teamId: number; seasonId: number }) => {
      try {
        return await FinanceService.getFinancialRecords(teamId, seasonId);
      } catch (error) {
        logger.error(
          `IPC Error [get-financial-records] teamId=${teamId} seasonId=${seasonId}:`,
          error
        );
        return [];
      }
    }
  );

  ipcMain.handle("get-financial-health", async (_, teamId: number) => {
    try {
      return await FinanceService.checkFinancialHealth(teamId);
    } catch (error) {
      logger.error(`IPC Error [get-financial-health] teamId=${teamId}:`, error);
      return null;
    }
  });

  ipcMain.handle(
    "upgrade-infrastructure",
    async (_event, type, teamId, seasonId) => {
      if (type === "expand_stadium") {
        return await infrastructureService.expandStadium(teamId, seasonId);
      }
      if (type === "upgrade_stadium") {
        return await infrastructureService.upgradeFacility(
          teamId,
          seasonId,
          "stadium"
        );
      }
      if (type === "upgrade_training") {
        return await infrastructureService.upgradeFacility(
          teamId,
          seasonId,
          "training"
        );
      }
      if (type === "upgrade_youth") {
        return await infrastructureService.upgradeFacility(
          teamId,
          seasonId,
          "youth"
        );
      }
      return { success: false, message: "Tipo de operação inválido" };
    }
  );

  ipcMain.handle("get-scouted-player", async (_, { playerId, teamId }) => {
    try {
      return await scoutingService.getScoutedPlayer(playerId, teamId);
    } catch (error) {
      logger.error(
        `IPC Error [get-scouted-player] playerId=${playerId} teamId=${teamId}:`,
        error
      );
      return null;
    }
  });

  ipcMain.handle("get-scouting-list", async (_, teamId: number) => {
    try {
      return await scoutingService.getScoutingList(teamId);
    } catch (error) {
      logger.error(`IPC Error [get-scouting-list] teamId=${teamId}:`, error);
      return [];
    }
  });

  ipcMain.handle(
    "assign-scout",
    async (_, { scoutId, playerId }: { scoutId: number; playerId: number }) => {
      try {
        return await scoutingService.assignScoutToPlayer(scoutId, playerId);
      } catch (error) {
        logger.error(
          `IPC Error [assign-scout] scoutId=${scoutId} playerId=${playerId}:`,
          error
        );
        return false;
      }
    }
  );
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
