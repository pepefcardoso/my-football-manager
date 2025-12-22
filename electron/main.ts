import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { existsSync, mkdirSync } from "node:fs";
import { db } from "../src/lib/db";
import { Logger } from "../src/lib/Logger";
import { serviceContainer } from "../src/services/ServiceContainer";
import { GameEngine } from "../src/engine/GameEngine";
import { repositoryContainer } from "../src/repositories/RepositoryContainer";
import { gameState, teams } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { GameEventType } from "../src/domain/GameEventTypes";
import { Result } from "../src/domain/ServiceResults";

app.name = "Football Manager 2D";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logger = new Logger("electron-main");

process.env.APP_ROOT = path.join(__dirname, "..");

export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

const USER_DATA_PATH = app.getPath("userData");
const SAVES_DIR = path.join(USER_DATA_PATH, "saves");

if (!existsSync(SAVES_DIR)) {
  mkdirSync(SAVES_DIR, { recursive: true });
}

const gameEngine = new GameEngine(repositoryContainer, db);

function setupTransferNotifications(win: BrowserWindow) {
  serviceContainer.eventBus.subscribe(
    GameEventType.PROPOSAL_RECEIVED,
    async (payload) => {
      const currentState = gameEngine.getGameState();
      const playerTeam = currentState?.playerTeamId;

      if (payload.toTeamId === playerTeam) {
        win.webContents.send("transfer:notification", {
          type: "PROPOSAL_RECEIVED",
          message: `Nova Proposta Recebida!`,
          details: payload,
        });
      }
    }
  );

  serviceContainer.eventBus.subscribe(
    GameEventType.TRANSFER_COMPLETED,
    async (payload) => {
      const currentState = gameEngine.getGameState();
      const playerTeamId = currentState?.playerTeamId;

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
    return await repositoryContainer.teams.findAll();
  });

  ipcMain.handle("player:getPlayers", async (_, teamId: number) => {
    const result = await serviceContainer.player.getPlayersByTeam(teamId);
    return Result.unwrapOr(result, []);
  });

  ipcMain.handle("player:getYouthPlayers", async (_, teamId: number) => {
    const result = await serviceContainer.player.getYouthPlayers(teamId);
    return Result.unwrapOr(result, []);
  });

  ipcMain.handle("player:getFreeAgents", async () => {
    const result = await serviceContainer.player.getFreeAgents();
    return Result.unwrapOr(result, []);
  });

  ipcMain.handle(
    "player:getPlayerWithContract",
    async (_, playerId: number) => {
      const result = await serviceContainer.player.getPlayerWithContract(
        playerId
      );
      return Result.unwrapOr(result, null);
    }
  );

  ipcMain.handle(
    "player:updatePlayerCondition",
    async (_, { playerId, ...updates }) => {
      const result = await serviceContainer.player.updatePlayerCondition({
        playerId,
        ...updates,
      });
      return Result.isSuccess(result);
    }
  );

  ipcMain.handle("youth:getPlayers", async (_, teamId: number) => {
    const result = await serviceContainer.youthAcademy.getAcademyPlayers(
      teamId
    );
    return Result.unwrapOr(result, []);
  });

  ipcMain.handle("youth:promote", async (_, { playerId, teamId }) => {
    const result = await serviceContainer.youthAcademy.promotePlayer(
      playerId,
      teamId
    );
    return Result.isSuccess(result);
  });

  ipcMain.handle("youth:release", async (_, { playerId, teamId }) => {
    const result = await serviceContainer.youthAcademy.releasePlayer(
      playerId,
      teamId
    );
    return Result.isSuccess(result);
  });

  ipcMain.handle("staff:getStaff", async (_, teamId: number) => {
    const result = await serviceContainer.staff.getStaffByTeam(teamId);
    return Result.unwrapOr(result, []);
  });

  ipcMain.handle("staff:getFreeAgents", async () => {
    const result = await serviceContainer.staff.getFreeAgents();
    return Result.unwrapOr(result, []);
  });

  ipcMain.handle(
    "staff:hireStaff",
    async (_, { teamId, staffId, salary, contractEnd }) => {
      const result = await serviceContainer.staff.hireStaff(
        teamId,
        staffId,
        salary,
        contractEnd
      );
      return Result.isSuccess(result);
    }
  );

  ipcMain.handle("staff:fireStaff", async (_, staffId: number) => {
    const result = await serviceContainer.staff.fireStaff(staffId);
    return Result.isSuccess(result);
  });

  ipcMain.handle("match:getMatches", async (_, { teamId, seasonId }) => {
    return await repositoryContainer.matches.findByTeamAndSeason(
      teamId,
      seasonId
    );
  });

  ipcMain.handle(
    "match:savePreMatchTactics",
    async (_, { matchId, homeLineup, awayLineup }) => {
      const result = await serviceContainer.match.savePreMatchTactics(
        matchId,
        homeLineup,
        awayLineup
      );
      return Result.isSuccess(result);
    }
  );

  ipcMain.handle(
    "match:substitutePlayer",
    async (_, { matchId, isHome, playerOutId, playerInId }) => {
      try {
        const result = await serviceContainer.match.substitutePlayer({
          matchId,
          isHome,
          playerOutId,
          playerInId,
        });

        if (Result.isSuccess(result)) {
          return {
            success: true,
            message: "Substituição realizada com sucesso!",
          };
        }

        return {
          success: false,
          message: result.error.message,
        };
      } catch (error) {
        logger.error("Erro ao realizar substituição:", error);
        return {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Erro desconhecido ao realizar substituição.",
        };
      }
    }
  );

  ipcMain.handle(
    "match:updateLiveTactics",
    async (_, { matchId, isHome, tactics }) => {
      try {
        const result = await serviceContainer.match.updateLiveTactics({
          matchId,
          isHome,
          tactics,
        });

        if (Result.isSuccess(result)) {
          return {
            success: true,
            message: "Táticas atualizadas com sucesso!",
          };
        }

        return {
          success: false,
          message: result.error.message,
        };
      } catch (error) {
        logger.error("Erro ao atualizar táticas:", error);
        return {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Erro desconhecido ao atualizar táticas.",
        };
      }
    }
  );

  ipcMain.handle("match:analyzeTactics", async (_, { matchId, isHome }) => {
    try {
      const result = await serviceContainer.match.analyzeTactics(
        matchId,
        isHome
      );

      if (Result.isSuccess(result)) {
        return result.data;
      }

      return null;
    } catch (error) {
      logger.error("Erro ao analisar táticas:", error);
      return null;
    }
  });

  ipcMain.handle("match:suggestTactics", async (_, { matchId, isHome }) => {
    try {
      const result = await serviceContainer.match.suggestTactics(
        matchId,
        isHome
      );

      if (Result.isSuccess(result)) {
        return result.data;
      }

      return null;
    } catch (error) {
      logger.error("Erro ao sugerir táticas:", error);
      return null;
    }
  });

  ipcMain.handle("match:startMatch", async (_, matchId: number) => {
    const initResult = await serviceContainer.match.initializeMatch(matchId);
    if (Result.isFailure(initResult)) return false;
    const startResult = await serviceContainer.match.startMatch(matchId);
    return Result.isSuccess(startResult);
  });

  ipcMain.handle("match:pauseMatch", async (_, matchId: number) => {
    const result = await serviceContainer.match.pauseMatch(matchId);
    return Result.isSuccess(result);
  });

  ipcMain.handle("match:resumeMatch", async (_, matchId: number) => {
    const result = await serviceContainer.match.resumeMatch(matchId);
    return Result.isSuccess(result);
  });

  ipcMain.handle("match:simulateMatchMinute", async (_, matchId: number) => {
    const result = await serviceContainer.match.simulateMinute(matchId);
    return Result.unwrapOr(result, null);
  });

  ipcMain.handle("match:simulateFullMatch", async (_, matchId: number) => {
    const result = await serviceContainer.match.simulateFullMatch(matchId);
    return Result.unwrapOr(result, null);
  });

  ipcMain.handle("match:getMatchState", async (_, matchId: number) => {
    const result = await serviceContainer.match.getMatchState(matchId);
    return Result.unwrapOr(result, null);
  });

  ipcMain.handle("match:simulateMatchesOfDate", async (_, date: string) => {
    const result = await serviceContainer.match.simulateMatchesOfDate(date);
    return Result.unwrapOr(result, { matchesPlayed: 0, results: [] });
  });

  ipcMain.handle("competition:getCompetitions", async () => {
    return await repositoryContainer.competitions.findAll();
  });

  ipcMain.handle(
    "competition:getTeamForm",
    async (_, { teamId, competitionId, seasonId }) => {
      return await repositoryContainer.competitions.getTeamForm(
        teamId,
        competitionId,
        seasonId
      );
    }
  );

  ipcMain.handle(
    "competition:getStandings",
    async (_, { competitionId, seasonId }) => {
      return await repositoryContainer.competitions.getStandings(
        competitionId,
        seasonId
      );
    }
  );

  ipcMain.handle(
    "competition:getTopScorers",
    async (_, { competitionId, seasonId }) => {
      const result = await serviceContainer.stats.getTopScorers(
        competitionId,
        seasonId
      );
      return Result.unwrapOr(result, []);
    }
  );

  ipcMain.handle(
    "competition:getTopGoalkeepers",
    async (_, { competitionId, seasonId }) => {
      const result = await serviceContainer.stats.getTopGoalkeepers(
        competitionId,
        seasonId
      );
      return Result.unwrapOr(result, []);
    }
  );

  ipcMain.handle(
    "game:startNewGame",
    async (_, { teamId, saveName, managerName }) => {
      try {
        const INITIAL_DATE = "2025-01-15";
        const activeSeason =
          await repositoryContainer.seasons.findActiveSeason();
        const seasonId = activeSeason ? activeSeason.id : 1;

        const current = await db.select().from(gameState).limit(1);

        const newStateData = {
          playerTeamId: teamId,
          managerName: managerName,
          saveId: saveName,
          currentDate: INITIAL_DATE,
          currentSeasonId: seasonId,
          totalPlayTime: 0,
          lastPlayedAt: new Date().toISOString(),
          simulationSpeed: 1,
          trainingFocus: "technical",
        };

        if (current.length > 0) {
          await db
            .update(gameState)
            .set(newStateData)
            .where(eq(gameState.id, current[0].id));
        } else {
          await db.insert(gameState).values(newStateData as any);
        }

        await db.update(teams).set({ isHuman: false });
        await db
          .update(teams)
          .set({ isHuman: true })
          .where(eq(teams.id, teamId));

        const saveResult = await gameEngine.createGameSave(saveName);

        if (Result.isFailure(saveResult)) {
          throw new Error(saveResult.error.message);
        }

        const gameSave = saveResult.data;
        const safeFilename = saveName.endsWith(".json")
          ? saveName
          : `${saveName}.json`;
        const filePath = path.join(SAVES_DIR, safeFilename);

        await fs.writeFile(filePath, JSON.stringify(gameSave, null, 2));

        await gameEngine.loadGameSave(gameSave);

        return { success: true, message: "Novo jogo configurado com sucesso!" };
      } catch (error) {
        logger.error("Erro fatal ao criar novo jogo:", error);
        return {
          success: false,
          message:
            error instanceof Error ? error.message : "Erro desconhecido.",
        };
      }
    }
  );

  ipcMain.handle("game:getGameState", async () => {
    const state = gameEngine.getGameState();
    if (state) return state;
    return await repositoryContainer.gameState.findCurrent();
  });

  ipcMain.handle("game:advanceDay", async () => {
    try {
      const result = await gameEngine.advanceDayWithCheck();

      if (!result.advanced) {
        return {
          date: result.date,
          messages: [],
          stopReason: result.stopReason,
          stopMetadata: result.stopMetadata,
        };
      }

      return {
        date: result.date,
        messages: result.result?.logs || [],
        narrativeEvent: result.result?.narrativeEvent || null,
        stopReason: undefined,
      };
    } catch (error) {
      logger.error("IPC Error [game:advanceDay]:", error);
      throw error;
    }
  });

  ipcMain.handle("game:updateTrainingFocus", async (_, focus: string) => {
    const currentState = await repositoryContainer.gameState.findCurrent();
    if (!currentState) return false;

    await repositoryContainer.gameState.save({
      ...currentState,
      trainingFocus: focus,
    });

    if (gameEngine.getGameState()) {
      const state = gameEngine.getGameState();
      if (state) state.trainingFocus = focus;
    }

    return true;
  });

  ipcMain.handle("game:saveGame", async (_, filename: string) => {
    const saveResult = await gameEngine.createGameSave(filename);

    if (Result.isFailure(saveResult)) {
      return { success: false, message: saveResult.error.message };
    }

    const gameSave = saveResult.data;
    const filePath = path.join(SAVES_DIR, `${filename}.json`);
    await fs.writeFile(filePath, JSON.stringify(gameSave, null, 2));

    return {
      success: true,
      message: "Jogo salvo com sucesso!",
      metadata: gameSave.metadata,
    };
  });

  ipcMain.handle("game:listSaves", async () => {
    try {
      const files = await fs.readdir(SAVES_DIR);
      const jsonFiles = files.filter((f) => f.endsWith(".json"));
      const savesMetadata = [];

      for (const file of jsonFiles) {
        try {
          const content = await fs.readFile(
            path.join(SAVES_DIR, file),
            "utf-8"
          );
          const save = JSON.parse(content);
          if (save.metadata) {
            savesMetadata.push({
              ...save.metadata,
              filename: file.replace(".json", ""),
            });
          }
        } catch (err) {
          logger.error(`Erro ao ler save ${file}:`, err);
          logger.warn(`Save corrompido ignorado: ${file}`);
        }
      }

      return savesMetadata.sort(
        (a, b) =>
          new Date(b.lastSaveTimestamp).getTime() -
          new Date(a.lastSaveTimestamp).getTime()
      );
    } catch (error) {
      logger.error("Erro ao listar saves:", error);
      return [];
    }
  });

  ipcMain.handle("game:loadGame", async (_, filename: string) => {
    try {
      const file = filename.endsWith(".json") ? filename : `${filename}.json`;
      const filePath = path.join(SAVES_DIR, file);
      const content = await fs.readFile(filePath, "utf-8");
      const gameSave = JSON.parse(content);

      const result = await gameEngine.loadGameSave(gameSave);

      if (Result.isFailure(result)) {
        return { success: false, message: result.error.message };
      }

      return { success: true, message: "Jogo carregado com sucesso!" };
    } catch (error) {
      logger.error("Erro ao carregar save:", error);
      return { success: false, message: "Falha ao ler arquivo de save." };
    }
  });

  ipcMain.handle("game:startAutoSimulation", () => {
    gameEngine.startSimulation((data) => {
      if (win) {
        win.webContents.send("game:dailyUpdate", data);
      }
    });
    return true;
  });

  ipcMain.handle("game:stopAutoSimulation", () => {
    gameEngine.stopSimulation();
    return true;
  });

  ipcMain.handle("finance:checkFinancialHealth", async (_, teamId: number) => {
    const result = await serviceContainer.financialHealth.checkFinancialHealth(
      teamId
    );
    return Result.unwrapOr(result, null);
  });

  ipcMain.handle("finance:canMakeTransfers", async (_, teamId: number) => {
    const result = await serviceContainer.financialHealth.canMakeTransfers(
      teamId
    );
    return Result.unwrapOr(result, {
      allowed: false,
      reason: "Erro desconhecido",
    });
  });

  ipcMain.handle(
    "finance:getFinancialRecords",
    async (_, { teamId, seasonId }) => {
      return await repositoryContainer.financial.findByTeamAndSeason(
        teamId,
        seasonId
      );
    }
  );

  ipcMain.handle("finance:getFinancialHealth", async (_, teamId: number) => {
    const result = await serviceContainer.financialHealth.checkFinancialHealth(
      teamId
    );
    return Result.unwrapOr(result, null);
  });

  ipcMain.handle(
    "finance:getMonthlyReport",
    async (_, { teamId, seasonId }) => {
      const result = await serviceContainer.finance.getMonthlyReport(
        teamId,
        seasonId
      );
      return Result.unwrapOr(result, []);
    }
  );

  ipcMain.handle("finance:getDashboard", async (_, { teamId, seasonId }) => {
    const result = await serviceContainer.finance.getFinancialDashboard(
      teamId,
      seasonId
    );
    return Result.unwrapOr(result, null);
  });

  ipcMain.handle(
    "finance:calculatePlayerSalary",
    async (_, { playerId, teamId, isFreeTransfer }) => {
      const result =
        await serviceContainer.valuationService.calculatePlayerSalary(
          playerId,
          teamId,
          isFreeTransfer
        );
      return Result.unwrapOr(result, null);
    }
  );

  ipcMain.handle("finance:getTeamWageBill", async (_, teamId) => {
    const result = await serviceContainer.contract.calculateMonthlyWageBill(
      teamId
    );
    return Result.unwrapOr(result, null);
  });

  ipcMain.handle(
    "finance:getOperationalCosts",
    async (_, { teamId, matchesPlayed }) => {
      const result =
        await serviceContainer.operationalCosts.calculateOperationalCosts(
          teamId,
          matchesPlayed
        );
      return Result.unwrapOr(result, null);
    }
  );

  ipcMain.handle(
    "finance:projectAnnualRevenue",
    async (_, { teamId, leaguePosition, homeMatches }) => {
      const result = await serviceContainer.revenueService.projectAnnualRevenue(
        teamId,
        leaguePosition,
        homeMatches
      );
      return Result.unwrapOr(result, null);
    }
  );

  ipcMain.handle("contract:getWageBill", async (_, teamId: number) => {
    const result = await serviceContainer.contract.calculateMonthlyWageBill(
      teamId
    );
    return Result.unwrapOr(result, null);
  });

  ipcMain.handle(
    "contract:renewPlayerContract",
    async (_, { playerId, newWage, newEndDate }) => {
      const result = await serviceContainer.contract.renewPlayerContract({
        playerId,
        newWage,
        newEndDate,
      });
      return Result.isSuccess(result);
    }
  );

  // No electron/main.ts

  // ... (handlers anteriores, ex: contract)

  // --- INFRASTRUCTURE HANDLERS ATUALIZADOS ---

  ipcMain.handle("infrastructure:getStatus", async (_, teamId: number) => {
    const result =
      await serviceContainer.infrastructure.getInfrastructureStatus(teamId);
    return Result.unwrapOr(result, null);
  });

  // Substitui expandStadium e upgradeFacility por um método unificado
  ipcMain.handle(
    "infrastructure:startUpgrade",
    async (_, { teamId, facilityType, amount }) => {
      try {
        const result = await serviceContainer.infrastructure.startUpgrade(
          teamId,
          facilityType,
          amount || 1 // Default para 1 se não for passado
        );

        if (Result.isSuccess(result)) {
          return {
            success: true,
            message: "Obra iniciada com sucesso!",
          };
        }

        return {
          success: false,
          message: result.error.message,
        };
      } catch (error) {
        logger.error(`Erro ao iniciar upgrade de ${facilityType}:`, error);
        return {
          success: false,
          message: error instanceof Error ? error.message : "Erro desconhecido",
        };
      }
    }
  );

  ipcMain.handle(
    "infrastructure:downgradeFacility",
    async (_, { teamId, facilityType, amount }) => {
      try {
        const result = await serviceContainer.infrastructure.downgradeFacility(
          teamId,
          facilityType,
          amount || 1
        );

        if (Result.isSuccess(result)) {
          return {
            success: true,
            message: "Instalação reduzida com sucesso.",
          };
        }

        return {
          success: false,
          message: result.error.message,
        };
      } catch (error) {
        logger.error(`Erro ao realizar downgrade de ${facilityType}:`, error);
        return {
          success: false,
          message: error instanceof Error ? error.message : "Erro desconhecido",
        };
      }
    }
  );

  ipcMain.handle(
    "scouting:getScoutedPlayer",
    async (_, { playerId, teamId }) => {
      const result = await serviceContainer.scouting.getScoutedPlayer(
        playerId,
        teamId
      );
      return Result.unwrapOr(result, null);
    }
  );

  ipcMain.handle("scouting:getScoutingList", async (_, teamId: number) => {
    const result = await serviceContainer.scouting.getScoutingList(teamId);
    return Result.unwrapOr(result, []);
  });

  ipcMain.handle("scouting:assignScout", async (_, { scoutId, playerId }) => {
    const result = await serviceContainer.scouting.assignScoutToPlayer(
      scoutId,
      playerId
    );
    return Result.isSuccess(result);
  });

  ipcMain.handle(
    "scouting:calculateScoutingAccuracy",
    async (_, teamId: number) => {
      const result = await serviceContainer.scouting.calculateScoutingAccuracy(
        teamId
      );
      return Result.unwrapOr(result, 0);
    }
  );

  ipcMain.handle("transfer:getTransferHistory", async (_, teamId: number) => {
    const result = await serviceContainer.transfer.getTransferHistory(teamId);
    return Result.unwrapOr(result, []);
  });

  ipcMain.handle("transfer:getReceivedProposals", async (_, teamId) => {
    const result = await serviceContainer.transfer.getReceivedProposals(teamId);
    return Result.unwrapOr(result, []);
  });

  ipcMain.handle("transfer:getSentProposals", async (_, teamId) => {
    const result = await serviceContainer.transfer.getSentProposals(teamId);
    return Result.unwrapOr(result, []);
  });

  ipcMain.handle("transfer:createProposal", async (_, input) => {
    const result = await serviceContainer.transfer.createProposal(input);
    if (Result.isSuccess(result)) {
      return {
        success: true,
        data: result.data,
        message: result.message || "Proposta criada.",
      };
    }
    return { success: false, message: result.error.message };
  });

  ipcMain.handle("transfer:respondToProposal", async (_, input) => {
    const result = await serviceContainer.transfer.respondToProposal(input);
    if (Result.isSuccess(result)) {
      return { success: true, message: result.message || "Resposta enviada." };
    }
    return { success: false, message: result.error.message };
  });

  ipcMain.handle("transfer:finalizeTransfer", async (_, proposalId: number) => {
    const result = await serviceContainer.transfer.finalizeTransfer(proposalId);
    if (Result.isSuccess(result)) {
      return {
        success: true,
        message: result.message || "Transferência finalizada.",
      };
    }
    return { success: false, message: result.error.message };
  });

  ipcMain.handle(
    "transfer:getTransferWindowStatus",
    async (_, date: string) => {
      return serviceContainer.transferWindow.getWindowStatus(date);
    }
  );

  ipcMain.handle("marketing:getFanSatisfaction", async (_, teamId: number) => {
    const result = await serviceContainer.marketing.getFanSatisfaction(teamId);
    return Result.unwrapOr(result, 50);
  });

  ipcMain.handle(
    "marketing:calculateTicketPriceImpact",
    async (_, { teamId, proposedPrice }) => {
      const result =
        await serviceContainer.marketing.calculateTicketPriceImpact(
          teamId,
          proposedPrice
        );
      return Result.unwrapOr(result, { impact: 0, message: "Erro" });
    }
  );

  ipcMain.handle("season:getCurrentSeason", async () => {
    const result = await serviceContainer.season.getCurrentSeason();
    return Result.unwrapOr(result, null);
  });

  ipcMain.handle(
    "season:getRelegationZone",
    async (_, { competitionId, seasonId, zoneSize }) => {
      const result = await serviceContainer.season.getRelegationZone(
        competitionId,
        seasonId,
        zoneSize
      );
      return Result.unwrapOr(result, []);
    }
  );

  ipcMain.handle(
    "game:respondToEvent",
    async (_, { eventId, optionId, teamId }) => {
      const result =
        await serviceContainer.narrativeService.processEventResponse(
          eventId,
          optionId,
          teamId
        );
      if (Result.isSuccess(result)) {
        return { success: true, message: result.data };
      }
      return { success: false, message: result.error.message };
    }
  );
}

let win: BrowserWindow | null;

function createWindow() {
  const iconName = process.platform === "win32" ? "icon.ico" : "icon.png";
  const iconPath = path.join(process.env.VITE_PUBLIC as string, iconName);
  const finalIcon = existsSync(iconPath)
    ? iconPath
    : path.join(process.env.VITE_PUBLIC as string, "icon.png");

  win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: finalIcon,
    title: "Football Manager 2D",
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
