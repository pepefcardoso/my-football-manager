import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { teamRepository } from "../src/repositories/TeamRepository";
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
import { GameEventType } from "../src/services/events/GameEventTypes";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logger = new Logger("electron-main");

process.env.APP_ROOT = path.join(__dirname, "..");

export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

function setupTransferNotifications(win: BrowserWindow) {
  const getPlayerTeamId = async () => {
    const currentState = await db.select().from(gameState).limit(1);
    return currentState[0]?.playerTeamId;
  };

  const logger = new Logger("TransferNotificationIPC");

  serviceContainer.eventBus.subscribe(
    GameEventType.PROPOSAL_RECEIVED,
    async (payload) => {
      const playerTeamId = await getPlayerTeamId();
      if (payload.toTeamId === playerTeamId) {
        const player = await serviceContainer.player.getPlayerWithContract(
          payload.playerId
        );
        const playerLastName =
          Result.isSuccess(player) && player.data
            ? player.data.lastName
            : `Jogador #${payload.playerId}`;

        logger.info(
          `Notificando UI: Nova proposta recebida por ${playerLastName}`
        );

        win.webContents.send("transfer:notification", {
          type: "PROPOSAL_RECEIVED",
          message: `Nova Proposta Recebida por ${playerLastName}!`,
          details: payload,
        });
      }
    }
  );

  serviceContainer.eventBus.subscribe(
    GameEventType.TRANSFER_COMPLETED,
    async (payload) => {
      const playerTeamId = await getPlayerTeamId();

      if (
        payload.toTeamId === playerTeamId ||
        payload.fromTeamId === playerTeamId
      ) {
        const player = await serviceContainer.player.getPlayerWithContract(
          payload.playerId
        );
        const playerLastName =
          Result.isSuccess(player) && player.data
            ? player.data.lastName
            : `Jogador #${payload.playerId}`;

        const action =
          payload.toTeamId === playerTeamId ? "COMPRADO" : "VENDIDO";

        logger.info(
          `Notificando UI: Transferência concluída: ${playerLastName} (${action})`
        );

        win.webContents.send("transfer:notification", {
          type: "TRANSFER_COMPLETED",
          message: `TRANSFERÊNCIA FINALIZADA: ${playerLastName} (${action})`,
          details: payload,
        });
      }
    }
  );
}

function registerIpcHandlers() {
  ipcMain.handle("team:getTeams", async () => {
    try {
      return await teamRepository.findAll();
    } catch (error) {
      logger.error("IPC Error [team:getTeams]:", error);
      return [];
    }
  });

  ipcMain.handle("player:getPlayers", async (_, teamId: number) => {
    try {
      const result = await serviceContainer.player.getPlayersByTeam(teamId);
      return Result.unwrapOr(result, []);
    } catch (error) {
      logger.error(`IPC Error [player:getPlayers] teamId=${teamId}:`, error);
      return [];
    }
  });

  ipcMain.handle("player:getYouthPlayers", async (_, teamId: number) => {
    try {
      const result = await serviceContainer.player.getYouthPlayers(teamId);
      return Result.unwrapOr(result, []);
    } catch (error) {
      logger.error(
        `IPC Error [player:getYouthPlayers] teamId=${teamId}:`,
        error
      );
      return [];
    }
  });

  ipcMain.handle("player:getFreeAgents", async () => {
    try {
      const result = await serviceContainer.player.getFreeAgents();
      return Result.unwrapOr(result, []);
    } catch (error) {
      logger.error(`IPC Error [player:getFreeAgents]:`, error);
      return [];
    }
  });

  ipcMain.handle(
    "player:getPlayerWithContract",
    async (_, playerId: number) => {
      try {
        const result = await serviceContainer.player.getPlayerWithContract(
          playerId
        );
        return Result.unwrapOr(result, null);
      } catch (error) {
        logger.error(
          `IPC Error [player:getPlayerWithContract] playerId=${playerId}:`,
          error
        );
        return null;
      }
    }
  );

  ipcMain.handle(
    "player:updatePlayerCondition",
    async (_, { playerId, ...updates }) => {
      try {
        const result = await serviceContainer.player.updatePlayerCondition({
          playerId,
          ...updates,
        });
        return Result.isSuccess(result);
      } catch (error) {
        logger.error(
          `IPC Error [player:updatePlayerCondition] playerId=${playerId}:`,
          error
        );
        return false;
      }
    }
  );

  ipcMain.handle("staff:getStaff", async (_, teamId: number) => {
    try {
      const result = await serviceContainer.staff.getStaffByTeam(teamId);
      return Result.unwrapOr(result, []);
    } catch (error) {
      logger.error(`IPC Error [staff:getStaff] teamId=${teamId}:`, error);
      return [];
    }
  });

  ipcMain.handle("staff:getFreeAgents", async () => {
    try {
      const result = await serviceContainer.staff.getFreeAgents();
      return Result.unwrapOr(result, []);
    } catch (error) {
      logger.error(`IPC Error [staff:getFreeAgents]:`, error);
      return [];
    }
  });

  ipcMain.handle(
    "staff:hireStaff",
    async (_, { teamId, staffId, salary, contractEnd }) => {
      try {
        const result = await serviceContainer.staff.hireStaff(
          teamId,
          staffId,
          salary,
          contractEnd
        );
        return Result.isSuccess(result);
      } catch (error) {
        logger.error(
          `IPC Error [staff:hireStaff] teamId=${teamId} staffId=${staffId}:`,
          error
        );
        return false;
      }
    }
  );

  ipcMain.handle("staff:fireStaff", async (_, staffId: number) => {
    try {
      const result = await serviceContainer.staff.fireStaff(staffId);
      return Result.isSuccess(result);
    } catch (error) {
      logger.error(`IPC Error [staff:fireStaff] staffId=${staffId}:`, error);
      return false;
    }
  });

  ipcMain.handle(
    "match:getMatches",
    async (_, { teamId, seasonId }: { teamId: number; seasonId: number }) => {
      try {
        return await matchRepository.findByTeamAndSeason(teamId, seasonId);
      } catch (error) {
        logger.error(`IPC Error [match:getMatches]:`, error);
        return [];
      }
    }
  );

  ipcMain.handle("match:startMatch", async (_, matchId: number) => {
    try {
      const initResult = await serviceContainer.match.initializeMatch(matchId);
      if (Result.isFailure(initResult)) return false;

      const startResult = await serviceContainer.match.startMatch(matchId);
      return Result.isSuccess(startResult);
    } catch (error) {
      logger.error(`IPC Error [match:startMatch] matchId=${matchId}:`, error);
      return false;
    }
  });

  ipcMain.handle("match:pauseMatch", async (_, matchId: number) => {
    try {
      const result = await serviceContainer.match.pauseMatch(matchId);
      return Result.isSuccess(result);
    } catch (error) {
      logger.error(`IPC Error [match:pauseMatch] matchId=${matchId}:`, error);
      return false;
    }
  });

  ipcMain.handle("match:resumeMatch", async (_, matchId: number) => {
    try {
      const result = await serviceContainer.match.resumeMatch(matchId);
      return Result.isSuccess(result);
    } catch (error) {
      logger.error(`IPC Error [match:resumeMatch] matchId=${matchId}:`, error);
      return false;
    }
  });

  ipcMain.handle("match:simulateMatchMinute", async (_, matchId: number) => {
    try {
      const result = await serviceContainer.match.simulateMinute(matchId);
      return Result.unwrapOr(result, null);
    } catch (error) {
      logger.error(
        `IPC Error [match:simulateMatchMinute] matchId=${matchId}:`,
        error
      );
      return null;
    }
  });

  ipcMain.handle("match:simulateFullMatch", async (_, matchId: number) => {
    try {
      const result = await serviceContainer.match.simulateFullMatch(matchId);
      return Result.unwrapOr(result, null);
    } catch (error) {
      logger.error(
        `IPC Error [match:simulateFullMatch] matchId=${matchId}:`,
        error
      );
      return null;
    }
  });

  ipcMain.handle("match:getMatchState", async (_, matchId: number) => {
    try {
      const result = await serviceContainer.match.getMatchState(matchId);
      return Result.unwrapOr(result, null);
    } catch (error) {
      logger.error(
        `IPC Error [match:getMatchState] matchId=${matchId}:`,
        error
      );
      return null;
    }
  });

  ipcMain.handle("match:simulateMatchesOfDate", async (_, date: string) => {
    try {
      const result = await serviceContainer.match.simulateMatchesOfDate(date);
      return Result.unwrapOr(result, { matchesPlayed: 0, results: [] });
    } catch (error) {
      logger.error(
        `IPC Error [match:simulateMatchesOfDate] date=${date}:`,
        error
      );
      return { matchesPlayed: 0, results: [] };
    }
  });

  ipcMain.handle("competition:getCompetitions", async () => {
    try {
      return await competitionRepository.findAll();
    } catch (error) {
      logger.error("IPC Error [competition:getCompetitions]:", error);
      return [];
    }
  });

  ipcMain.handle(
    "competition:getTeamForm",
    async (_, { teamId, competitionId, seasonId }) => {
      return await competitionRepository.getTeamForm(
        teamId,
        competitionId,
        seasonId
      );
    }
  );

  ipcMain.handle(
    "competition:getStandings",
    async (_, { competitionId, seasonId }) => {
      return await competitionRepository.getStandings(competitionId, seasonId);
    }
  );

  ipcMain.handle(
    "competition:getTopScorers",
    async (_, { competitionId, seasonId }) => {
      try {
        const result = await serviceContainer.stats.getTopScorers(
          competitionId,
          seasonId
        );
        return Result.unwrapOr(result, []);
      } catch (error) {
        logger.error(`IPC Error [competition:getTopScorers]:`, error);
        return [];
      }
    }
  );

  ipcMain.handle(
    "competition:getTopGoalkeepers",
    async (_, { competitionId, seasonId }) => {
      try {
        const result = await serviceContainer.stats.getTopGoalkeepers(
          competitionId,
          seasonId
        );
        return Result.unwrapOr(result, []);
      } catch (error) {
        logger.error(`IPC Error [competition:getTopGoalkeepers]:`, error);
        return [];
      }
    }
  );

  ipcMain.handle("game:getGameState", async () => {
    try {
      const state = await db.select().from(gameState).limit(1);
      return state[0];
    } catch (error) {
      logger.error("IPC Error [game:getGameState]:", error);
      return null;
    }
  });

  ipcMain.handle("game:advanceDay", async () => {
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

      if (state.currentSeasonId) {
        const aiTransferResult =
          await serviceContainer.dailyTransferProcessor.processDailyTransfers(
            nextDate,
            state.currentSeasonId
          );
        if (Result.isSuccess(aiTransferResult) && aiTransferResult.data > 0) {
          logs.push(
            `🤖 O mercado de transferências da IA teve ${aiTransferResult.data} ações.`
          );
        }
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
      logger.error("IPC Error [game:advanceDay]:", error);
      throw error;
    }
  });

  ipcMain.handle("game:updateTrainingFocus", async (_, focus: string) => {
    try {
      const currentState = await db.select().from(gameState).limit(1);
      if (!currentState[0]) return false;

      await db
        .update(gameState)
        .set({ trainingFocus: focus })
        .where(eq(gameState.id, currentState[0].id));

      return true;
    } catch (error) {
      logger.error("IPC Error [game:updateTrainingFocus]:", error);
      return false;
    }
  });

  ipcMain.handle("game:saveGame", async () => {
    return true;
  });

  ipcMain.handle("game:loadGame", async () => {
    return true;
  });

  ipcMain.handle("finance:checkFinancialHealth", async (_, teamId: number) => {
    try {
      const result = await serviceContainer.finance.checkFinancialHealth(
        teamId
      );
      return Result.unwrapOr(result, null);
    } catch (error) {
      logger.error(
        `IPC Error [finance:checkFinancialHealth] teamId=${teamId}:`,
        error
      );
      return null;
    }
  });

  ipcMain.handle("finance:canMakeTransfers", async (_, teamId: number) => {
    try {
      const result = await serviceContainer.finance.canMakeTransfers(teamId);
      return Result.unwrapOr(result, {
        allowed: false,
        reason: "Erro desconhecido",
      });
    } catch (error) {
      logger.error(
        `IPC Error [finance:canMakeTransfers] teamId=${teamId}:`,
        error
      );
      return { allowed: false, reason: "Erro ao verificar permissões" };
    }
  });

  ipcMain.handle(
    "finance:getFinancialRecords",
    async (_, { teamId, seasonId }: { teamId: number; seasonId: number }) => {
      try {
        return await serviceContainer.finance.getFinancialRecords(
          teamId,
          seasonId
        );
      } catch (error) {
        logger.error(
          `IPC Error [finance:getFinancialRecords] teamId=${teamId} seasonId=${seasonId}:`,
          error
        );
        return [];
      }
    }
  );

  ipcMain.handle("finance:getFinancialHealth", async (_, teamId: number) => {
    try {
      const result = await serviceContainer.finance.checkFinancialHealth(
        teamId
      );
      return Result.unwrapOr(result, null);
    } catch (error) {
      logger.error(
        `IPC Error [finance:getFinancialHealth] teamId=${teamId}:`,
        error
      );
      return null;
    }
  });

  ipcMain.handle(
    "finance:getMonthlyReport",
    async (_, { teamId, seasonId }: { teamId: number; seasonId: number }) => {
      try {
        const result = await serviceContainer.finance.getMonthlyReport(
          teamId,
          seasonId
        );
        return Result.unwrapOr(result, []);
      } catch (error) {
        logger.error(
          `IPC Error [finance:getMonthlyReport] teamId=${teamId} seasonId=${seasonId}:`,
          error
        );
        return [];
      }
    }
  );

  ipcMain.handle("contract:getWageBill", async (_, teamId: number) => {
    try {
      const result = await serviceContainer.contract.calculateMonthlyWageBill(
        teamId
      );
      return Result.unwrapOr(result, null);
    } catch (error) {
      logger.error(`IPC Error [contract:getWageBill] teamId=${teamId}:`, error);
      return null;
    }
  });

  ipcMain.handle(
    "contract:renewPlayerContract",
    async (_, { playerId, newWage, newEndDate }) => {
      try {
        const result = await serviceContainer.contract.renewPlayerContract({
          playerId,
          newWage,
          newEndDate,
        });
        return Result.isSuccess(result);
      } catch (error) {
        logger.error(
          `IPC Error [contract:renewPlayerContract] playerId=${playerId}:`,
          error
        );
        return false;
      }
    }
  );

  ipcMain.handle(
    "infrastructure:upgradeInfrastructure",
    async (_event, { type, teamId, seasonId }) => {
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

  ipcMain.handle(
    "infrastructure:getInfrastructureStatus",
    async (_, teamId: number) => {
      try {
        const result =
          await serviceContainer.infrastructure.getInfrastructureStatus(teamId);
        return Result.unwrapOr(result, null);
      } catch (error) {
        logger.error(
          `IPC Error [infrastructure:getInfrastructureStatus] teamId=${teamId}:`,
          error
        );
        return null;
      }
    }
  );

  ipcMain.handle(
    "infrastructure:getUpgradeCost",
    async (_, { teamId, type }) => {
      try {
        const result = await serviceContainer.infrastructure.getUpgradeCost(
          teamId,
          type
        );
        return Result.unwrapOr(result, null);
      } catch (error) {
        logger.error(
          `IPC Error [infrastructure:getUpgradeCost] teamId=${teamId} type=${type}:`,
          error
        );
        return null;
      }
    }
  );

  ipcMain.handle("infrastructure:getExpansionCost", async () => {
    try {
      const result = await serviceContainer.infrastructure.getExpansionCost();
      return Result.unwrapOr(result, 0);
    } catch (error) {
      logger.error(`IPC Error [infrastructure:getExpansionCost]:`, error);
      return 0;
    }
  });

  ipcMain.handle(
    "scouting:getScoutedPlayer",
    async (_, { playerId, teamId }) => {
      try {
        const result = await serviceContainer.scouting.getScoutedPlayer(
          playerId,
          teamId
        );
        return Result.unwrapOr(result, null);
      } catch (error) {
        logger.error(
          `IPC Error [scouting:getScoutedPlayer] playerId=${playerId} teamId=${teamId}:`,
          error
        );
        return null;
      }
    }
  );

  ipcMain.handle("scouting:getScoutingList", async (_, teamId: number) => {
    try {
      const result = await serviceContainer.scouting.getScoutingList(teamId);
      return Result.unwrapOr(result, []);
    } catch (error) {
      logger.error(
        `IPC Error [scouting:getScoutingList] teamId=${teamId}:`,
        error
      );
      return [];
    }
  });

  ipcMain.handle(
    "scouting:assignScout",
    async (_, { scoutId, playerId }: { scoutId: number; playerId: number }) => {
      try {
        const result = await serviceContainer.scouting.assignScoutToPlayer(
          scoutId,
          playerId
        );
        return Result.isSuccess(result);
      } catch (error) {
        logger.error(
          `IPC Error [scouting:assignScout] scoutId=${scoutId} playerId=${playerId}:`,
          error
        );
        return false;
      }
    }
  );

  ipcMain.handle(
    "scouting:calculateScoutingAccuracy",
    async (_, teamId: number) => {
      try {
        const result =
          await serviceContainer.scouting.calculateScoutingAccuracy(teamId);
        return Result.unwrapOr(result, 0);
      } catch (error) {
        logger.error(
          `IPC Error [scouting:calculateScoutingAccuracy] teamId=${teamId}:`,
          error
        );
        return 0;
      }
    }
  );

  ipcMain.handle("transfer:getReceivedProposals", async (_, teamId) => {
    const result = await serviceContainer.transfer.getReceivedProposals(teamId);

    if (Result.isSuccess(result)) {
      return result.data;
    }

    logger.error(
      "Erro no IPC de transfer:getReceivedProposals:",
      result.error.message
    );
    return [];
  });

  ipcMain.handle("transfer:getSentProposals", async (_, teamId) => {
    const result = await serviceContainer.transfer.getSentProposals(teamId);

    if (Result.isSuccess(result)) {
      return result.data;
    }

    logger.error(
      "Erro no IPC de transfer:getSentProposals:",
      result.error.message
    );
    return [];
  });

  ipcMain.handle("transfer:createProposal", async (_, input: any) => {
    try {
      const result = await serviceContainer.transfer.createProposal(input);
      if (Result.isSuccess(result)) {
        return {
          success: true,
          data: result.data,
          message: result.message || "Proposta criada.",
        };
      }
      return { success: false, message: result.error.message };
    } catch (error) {
      logger.error("IPC Error [transfer:createProposal]:", error);
      return { success: false, message: "Erro interno ao criar proposta." };
    }
  });

  ipcMain.handle("transfer:respondToProposal", async (_, input: any) => {
    try {
      const result = await serviceContainer.transfer.respondToProposal(input);
      if (Result.isSuccess(result)) {
        return {
          success: true,
          message: result.message || "Resposta enviada.",
        };
      }
      return { success: false, message: result.error.message };
    } catch (error) {
      logger.error("IPC Error [transfer:respondToProposal]:", error);
      return { success: false, message: "Erro interno ao responder proposta." };
    }
  });

  ipcMain.handle("transfer:finalizeTransfer", async (_, proposalId: number) => {
    try {
      const result = await serviceContainer.transfer.finalizeTransfer(
        proposalId
      );
      if (Result.isSuccess(result)) {
        return {
          success: true,
          message: result.message || "Transferência finalizada.",
        };
      }
      return { success: false, message: result.error.message };
    } catch (error) {
      logger.error(
        `IPC Error [transfer:finalizeTransfer] proposalId=${proposalId}:`,
        error
      );
      return {
        success: false,
        message: "Erro interno ao finalizar transferência.",
      };
    }
  });

  ipcMain.handle(
    "transfer:getTransferWindowStatus",
    async (_, date: string) => {
      try {
        const status = serviceContainer.transferWindow.getWindowStatus(date);
        return status;
      } catch (error) {
        logger.error(
          `IPC Error [transfer:getTransferWindowStatus] date=${date}:`,
          error
        );
        return "Erro ao verificar janela.";
      }
    }
  );

  ipcMain.handle("marketing:getFanSatisfaction", async (_, teamId: number) => {
    try {
      const result = await serviceContainer.marketing.getFanSatisfaction(
        teamId
      );
      return Result.unwrapOr(result, 50);
    } catch (error) {
      logger.error(
        `IPC Error [marketing:getFanSatisfaction] teamId=${teamId}:`,
        error
      );
      return 50;
    }
  });

  ipcMain.handle(
    "marketing:calculateTicketPriceImpact",
    async (_, { teamId, proposedPrice }) => {
      try {
        const result =
          await serviceContainer.marketing.calculateTicketPriceImpact(
            teamId,
            proposedPrice
          );
        return Result.unwrapOr(result, { impact: 0, message: "Erro" });
      } catch (error) {
        logger.error(
          `IPC Error [marketing:calculateTicketPriceImpact] teamId=${teamId}:`,
          error
        );
        return { impact: 0, message: "Erro interno" };
      }
    }
  );

  ipcMain.handle("season:getCurrentSeason", async () => {
    try {
      const result = await serviceContainer.season.getCurrentSeason();
      return Result.unwrapOr(result, null);
    } catch (error) {
      logger.error("IPC Error [season:getCurrentSeason]:", error);
      return null;
    }
  });

  ipcMain.handle(
    "season:getRelegationZone",
    async (_, { competitionId, seasonId, zoneSize }) => {
      try {
        const result = await serviceContainer.season.getRelegationZone(
          competitionId,
          seasonId,
          zoneSize
        );
        return Result.unwrapOr(result, []);
      } catch (error) {
        logger.error("IPC Error [season:getRelegationZone]:", error);
        return [];
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

  if (win) {
    setupTransferNotifications(win);
  }
});
