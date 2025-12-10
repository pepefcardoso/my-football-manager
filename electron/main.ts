import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { teamRepository } from "../src/repositories/TeamRepository";
import { playerRepository } from "../src/repositories/PlayerRepository";
import { staffRepository } from "../src/repositories/StaffRepository";
import { matchRepository } from "../src/repositories/MatchRepository";
import { competitionRepository } from "../src/repositories/CompetitionRepository";
import { seasonRepository } from "../src/repositories/SeasonRepository";
import { gameState } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { Logger } from "../src/lib/Logger";
import { serviceContainer } from "../src/services/ServiceContainer";
import { FinanceService } from "../src/services/FinanceService";
import { Result } from "../src/services/types/ServiceResults";
import { TrainingFocus } from "../src/domain/enums";

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

      const logs = [`📅 Dia avançado para ${nextDate}`];

      const [, month, day] = nextDate.split("-").map(Number);

      if (month === 12 && day === 15) {
        const activeSeason = await seasonRepository.findActiveSeason();

        if (activeSeason) {
          const summaryResult =
            await serviceContainer.seasonTransition.processEndOfSeason(
              activeSeason.id
            );

          if (Result.isSuccess(summaryResult)) {
            const summary = summaryResult.data;
            logs.push(`🏆 TEMPORADA ${summary.seasonYear} ENCERRADA!`);
            logs.push(`🥇 Campeão Nacional: ${summary.championName}`);
            logs.push(`📅 Temporada ${summary.seasonYear + 1} iniciada.`);

            const nextSeasonStart = `${summary.seasonYear + 1}-01-15`;

            await db
              .update(gameState)
              .set({
                currentDate: nextSeasonStart,
                currentSeasonId: activeSeason.id + 1,
              })
              .where(eq(gameState.id, state.id));

            return {
              date: nextSeasonStart,
              messages: logs,
              seasonRollover: summary,
            };
          }
        }
      }

      if (FinanceService.isPayDay(nextDate) && state.currentSeasonId) {
        const allTeams = await teamRepository.findAll();

        for (const team of allTeams) {
          const result = await serviceContainer.finance.processMonthlyExpenses({
            teamId: team.id,
            currentDate: nextDate,
            seasonId: state.currentSeasonId,
          });

          if (Result.isSuccess(result)) {
            const data = result.data;
            logs.push(
              `💸 ${
                team.name
              }: Despesas mensais €${data.totalExpense.toLocaleString("pt-PT")}`
            );
            logs.push(
              `   └─ Jogadores: €${data.playerWages.toLocaleString(
                "pt-PT"
              )} | Staff: €${data.staffWages.toLocaleString("pt-PT")}`
            );

            const healthResult =
              await serviceContainer.finance.checkFinancialHealth(team.id);

            if (Result.isSuccess(healthResult)) {
              const health = healthResult.data;
              if (!health.isHealthy) {
                logs.push(`⚠️ ${team.name}: CRISE FINANCEIRA DETECTADA`);
                logs.push(
                  `   └─ Orçamento: €${health.currentBudget.toLocaleString(
                    "pt-PT"
                  )} (${health.severity.toUpperCase()})`
                );

                health.penaltiesApplied.forEach((penalty: string) => {
                  logs.push(`   └─ ⚠️ ${penalty}`);
                });

                if (health.severity === "critical") {
                  logs.push(`   └─ 🚨 ATENÇÃO: Situação financeira CRÍTICA!`);
                }
              } else {
                logs.push(
                  `   └─ Orçamento: €${data.newBudget.toLocaleString(
                    "pt-PT"
                  )} ✅`
                );
              }
            }
          } else {
            logs.push(`❌ ${team.name}: Erro ao processar despesas`);
          }
        }
      }

      if (state.playerTeamId && !FinanceService.isPayDay(nextDate)) {
        const healthResult =
          await serviceContainer.finance.checkFinancialHealth(
            state.playerTeamId
          );

        if (Result.isSuccess(healthResult)) {
          const health = healthResult.data;
          if (!health.isHealthy) {
            logs.push(`⚠️ Alerta: Seu clube ainda está com orçamento negativo`);
            logs.push(
              `   └─ Saldo: €${health.currentBudget.toLocaleString("pt-PT")}`
            );

            if (health.hasTransferBan) {
              logs.push(
                `   └─ 🚫 Transfer Ban ativo - Contratações bloqueadas`
              );
            }
          }
        }
      }

      if (state.playerTeamId) {
        const staffImpactResult = await serviceContainer.staff.getStaffImpact(
          state.playerTeamId
        );

        if (Result.isSuccess(staffImpactResult)) {
          const focus =
            (state.trainingFocus as TrainingFocus) || TrainingFocus.TECHNICAL;

          const simResult =
            await serviceContainer.dailySimulation.processTeamDailyLoop(
              state.playerTeamId,
              focus,
              staffImpactResult.data
            );

          if (Result.isSuccess(simResult)) {
            logs.push(...simResult.data.logs);
          }
        }
      }

      if (state.currentSeasonId) {
        const expirationsResult =
          await serviceContainer.contract.checkExpiringContracts(nextDate);

        if (Result.isSuccess(expirationsResult)) {
          const expirations = expirationsResult.data;
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
      }

      if (state.currentSeasonId) {
        const matchResultsWrapper =
          await serviceContainer.match.simulateMatchesOfDate(nextDate);

        if (Result.isSuccess(matchResultsWrapper)) {
          const matchData = matchResultsWrapper.data;
          if (matchData.matchesPlayed > 0) {
            logs.push(`⚽ ${matchData.matchesPlayed} partida(s) simulada(s)`);

            for (const { matchId, result } of matchData.results) {
              const match = await matchRepository.findById(matchId);
              if (match) {
                const homeTeam = await teamRepository.findById(
                  match.homeTeamId!
                );
                const awayTeam = await teamRepository.findById(
                  match.awayTeamId!
                );

                logs.push(
                  `   └─ ${homeTeam?.shortName} ${result.homeScore} x ${result.awayScore} ${awayTeam?.shortName}`
                );
              }
            }
          }
        }
      }

      try {
        await serviceContainer.scouting.processDailyScouting(nextDate);
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
      const result = await serviceContainer.finance.checkFinancialHealth(
        teamId
      );
      return Result.unwrapOr(result, null);
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
      const result = await serviceContainer.finance.canMakeTransfers(teamId);
      return Result.unwrapOr(result, {
        allowed: false,
        reason: "Erro desconhecido",
      });
    } catch (error) {
      logger.error(`IPC Error [can-make-transfers] teamId=${teamId}:`, error);
      return { allowed: false, reason: "Erro ao verificar permissões" };
    }
  });

  ipcMain.handle("get-wage-bill", async (_, teamId: number) => {
    try {
      const result = await serviceContainer.contract.calculateMonthlyWageBill(
        teamId
      );
      return Result.unwrapOr(result, null);
    } catch (error) {
      logger.error(`IPC Error [get-wage-bill] teamId=${teamId}:`, error);
      return null;
    }
  });

  ipcMain.handle("start-match", async (_, matchId: number) => {
    try {
      const initResult = await serviceContainer.match.initializeMatch(matchId);
      if (Result.isFailure(initResult)) return false;

      const startResult = await serviceContainer.match.startMatch(matchId);
      return Result.isSuccess(startResult);
    } catch (error) {
      logger.error(`IPC Error [start-match] matchId=${matchId}:`, error);
      return false;
    }
  });

  ipcMain.handle("pause-match", async (_, matchId: number) => {
    try {
      const result = await serviceContainer.match.pauseMatch(matchId);
      return Result.isSuccess(result);
    } catch (error) {
      logger.error(`IPC Error [pause-match] matchId=${matchId}:`, error);
      return false;
    }
  });

  ipcMain.handle("resume-match", async (_, matchId: number) => {
    try {
      const result = await serviceContainer.match.resumeMatch(matchId);
      return Result.isSuccess(result);
    } catch (error) {
      logger.error(`IPC Error [resume-match] matchId=${matchId}:`, error);
      return false;
    }
  });

  ipcMain.handle("simulate-match-minute", async (_, matchId: number) => {
    try {
      const result = await serviceContainer.match.simulateMinute(matchId);
      return Result.unwrapOr(result, null);
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
      const result = await serviceContainer.match.simulateFullMatch(matchId);
      return Result.unwrapOr(result, null);
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
      const result = await serviceContainer.match.getMatchState(matchId);
      return Result.unwrapOr(result, null);
    } catch (error) {
      logger.error(`IPC Error [get-match-state] matchId=${matchId}:`, error);
      return null;
    }
  });

  ipcMain.handle("simulate-matches-of-date", async (_, date: string) => {
    try {
      const result = await serviceContainer.match.simulateMatchesOfDate(date);
      return Result.unwrapOr(result, { matchesPlayed: 0, results: [] });
    } catch (error) {
      logger.error(`IPC Error [simulate-matches-of-date] date=${date}:`, error);
      return { matchesPlayed: 0, results: [] };
    }
  });

  ipcMain.handle(
    "get-financial-records",
    async (_, { teamId, seasonId }: { teamId: number; seasonId: number }) => {
      try {
        return await serviceContainer.finance.getFinancialRecords(
          teamId,
          seasonId
        );
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
      const result = await serviceContainer.finance.checkFinancialHealth(
        teamId
      );
      return Result.unwrapOr(result, null);
    } catch (error) {
      logger.error(`IPC Error [get-financial-health] teamId=${teamId}:`, error);
      return null;
    }
  });

  ipcMain.handle(
    "upgrade-infrastructure",
    async (_event, type, teamId, seasonId) => {
      let result;
      if (type === "expand_stadium") {
        result = await serviceContainer.infrastructure.expandStadium(
          teamId,
          seasonId
        );
      } else if (type === "upgrade_stadium") {
        result = await serviceContainer.infrastructure.upgradeFacility(
          teamId,
          seasonId,
          "stadium"
        );
      } else if (type === "upgrade_training") {
        result = await serviceContainer.infrastructure.upgradeFacility(
          teamId,
          seasonId,
          "training"
        );
      } else if (type === "upgrade_youth") {
        result = await serviceContainer.infrastructure.upgradeFacility(
          teamId,
          seasonId,
          "youth"
        );
      } else {
        return { success: false, message: "Tipo de operação inválido" };
      }

      if (Result.isSuccess(result)) {
        return { success: true, message: "Upgrade realizado com sucesso!" };
      }
      return { success: false, message: result.error.message };
    }
  );

  ipcMain.handle("get-scouted-player", async (_, { playerId, teamId }) => {
    try {
      const result = await serviceContainer.scouting.getScoutedPlayer(
        playerId,
        teamId
      );
      return Result.unwrapOr(result, null);
    } catch (error) {
      logger.error(
        `IPC Error [get-scouted-player] playerId=${playerId} teamId=${teamId}:`,
        error
      );
      return null;
    }
  });

  ipcMain.handle(
    "assign-scout",
    async (_, { scoutId, playerId }: { scoutId: number; playerId: number }) => {
      try {
        const result = await serviceContainer.scouting.assignScoutToPlayer(
          scoutId,
          playerId
        );
        return Result.isSuccess(result);
      } catch (error) {
        logger.error(
          `IPC Error [assign-scout] scoutId=${scoutId} playerId=${playerId}:`,
          error
        );
        return false;
      }
    }
  );

  ipcMain.handle("get-scouting-list", async (_, teamId: number) => {
    try {
      const result = await serviceContainer.scouting.getScoutingList(teamId);
      return Result.unwrapOr(result, []);
    } catch (error) {
      logger.error(`IPC Error [get-scouting-list] teamId=${teamId}:`, error);
      return [];
    }
  });

  ipcMain.handle("getTeamForm", async (_, teamId, competitionId, seasonId) => {
    return await competitionRepository.getTeamForm(
      teamId,
      competitionId,
      seasonId
    );
  });

  ipcMain.handle("getTopScorers", async (_, competitionId, seasonId) => {
    return await competitionRepository.getTopScorers(competitionId, seasonId);
  });

  ipcMain.handle("getTopGoalkeepers", async (_, competitionId, seasonId) => {
    return await competitionRepository.getTopGoalkeepers(
      competitionId,
      seasonId
    );
  });

  ipcMain.handle("getStandings", async (_, competitionId, seasonId) => {
    return await competitionRepository.getStandings(competitionId, seasonId);
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
