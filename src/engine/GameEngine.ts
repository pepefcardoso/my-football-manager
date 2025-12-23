import type { GameState, Match, Player } from "../domain/models";
import type { MatchResult, GameEvent } from "../domain/types";
import { FinanceService } from "../services/FinanceService";
import { ServiceContainer } from "../services/ServiceContainer";
import { Logger } from "../lib/Logger";
import { Result, type ServiceResult } from "../domain/ServiceResults";
import { TimeEngine } from "./TimeEngine";
import type { IRepositoryContainer } from "../repositories/IRepositories";
import type { GameSave, SaveValidationResult } from "../domain/GameSaveTypes";
import { SaveManager } from "./SaveManager";
import type { IUnitOfWork } from "../repositories/IUnitOfWork";
import { UnitOfWork } from "../repositories/UnitOfWork";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "../db/schema";
import type { NarrativeEvent } from "../domain/narrative";
import { StopConditionChecker } from "./StopConditionChecker";
import { TrainingFocus } from "../domain/enums";

const logger = new Logger("GameEngine");

export class GameEngine {
  private timeEngine: TimeEngine;
  private gameState: GameState | null = null;
  private stopChecker: StopConditionChecker;
  private readonly unitOfWork: IUnitOfWork;

  public readonly saveManager: SaveManager;

  constructor(
    repositories: IRepositoryContainer,
    db: BetterSQLite3Database<typeof schema>,
    initialDate?: string,
    unitOfWork?: IUnitOfWork
  ) {
    this.timeEngine = new TimeEngine(initialDate || "2025-01-15");
    this.unitOfWork = unitOfWork || new UnitOfWork(db);
    this.saveManager = new SaveManager(repositories, this.unitOfWork, db);
    this.stopChecker = new StopConditionChecker(repositories);
  }

  setGameState(state: GameState) {
    this.gameState = state;
    if (state.currentDate) {
      this.timeEngine.setDate(state.currentDate);
    }
  }

  getGameState(): GameState | null {
    return this.gameState;
  }

  getCurrentDate(): string {
    return this.timeEngine.getDateString();
  }

  advanceDay(): string {
    return this.timeEngine.advanceDay();
  }

  advanceDays(days: number): string {
    return this.timeEngine.addDays(days);
  }

  startSimulation(onUpdateUI: (data: DailyUpdateResult) => void) {
    this.timeEngine.setSimulationSpeed(
      this.gameState?.simulationSpeed === 2 ? 200 : 1000
    );

    this.timeEngine.start(async () => {
      const result = await this.advanceDayWithCheck();

      if (!result.advanced) {
        onUpdateUI({
          date: this.getCurrentDate(),
          playersUpdated: 0,
          matchesPlayed: [],
          matchResults: [],
          injuries: [],
          suspensions: [],
          contractExpiries: [],
          financialChanges: [],
          news: [],
          logs: [
            `Simulação pausada: ${this.translateStopReason(result.stopReason)}`,
          ],
          narrativeEvent: null,
          stopReason: result.stopReason,
        });
        this.stopSimulation();
        return;
      }

      if (result.result) {
        onUpdateUI(result.result);
      }
    });
  }

  stopSimulation() {
    this.timeEngine.stop();
  }

  getWeekday(): string {
    const date = new Date(this.getCurrentDate());
    const days = [
      "Domingo",
      "Segunda",
      "Terça",
      "Quarta",
      "Quinta",
      "Sexta",
      "Sábado",
    ];
    return days[date.getDay()];
  }

  isMatchDay(): boolean {
    const date = new Date(this.getCurrentDate());
    const day = date.getDay();
    return day === 3 || day === 6;
  }

  async processDailyUpdate(
    isPlayerMatchDay: boolean = false
  ): Promise<DailyUpdateResult> {
    const updates: DailyUpdateResult = {
      date: this.getCurrentDate(),
      playersUpdated: 0,
      matchesPlayed: [],
      matchResults: [],
      injuries: [],
      suspensions: [],
      contractExpiries: [],
      financialChanges: [],
      news: [],
      logs: [],
      narrativeEvent: null,
    };

    if (!this.gameState?.currentSeasonId || !this.gameState?.playerTeamId) {
      return updates;
    }

    const seasonId = this.gameState.currentSeasonId;
    const teamId = this.gameState.playerTeamId;

    try {
      return await this.unitOfWork.execute(async (txRepos) => {
        const txServices = new ServiceContainer(txRepos, this.unitOfWork);

        const newDateStr = this.timeEngine.advanceDay();
        updates.date = newDateStr;

        const constructionFinished =
          await txServices.infrastructure.processDailyConstruction(
            teamId,
            newDateStr
          );
        if (
          Result.isSuccess(constructionFinished) &&
          constructionFinished.data
        ) {
          updates.logs.push("🏗️ Obra de infraestrutura concluída com sucesso!");
          updates.news.push({
            type: "news",
            title: "Obras Concluídas",
            description:
              "As melhorias nas instalações do clube foram finalizadas.",
            importance: "high",
            date: newDateStr,
            relatedEntityId: teamId,
          });
        }

        const dateObj = new Date(newDateStr);
        if (dateObj.getDate() === 1) {
          const maintResult =
            await txServices.infrastructure.applyMonthlyMaintenance(
              teamId,
              newDateStr,
              seasonId
            );

          if (Result.isSuccess(maintResult) && maintResult.data > 0) {
            updates.financialChanges.push({
              type: "expense",
              amount: maintResult.data,
              category: "stadium_maintenance",
              description: "Manutenção Mensal de Infraestrutura",
            });
            updates.logs.push(
              `💸 Manutenção de infraestrutura paga: €${maintResult.data.toLocaleString()}`
            );
          }
        }

        const currentFocus =
          (this.gameState!.trainingFocus as TrainingFocus) ||
          TrainingFocus.TECHNICAL;

        const staffImpactResult = await txServices.staff.getStaffImpact(teamId);
        if (Result.isSuccess(staffImpactResult)) {
          const trainingResult =
            await txServices.dailySimulation.processTeamDailyLoop(
              teamId,
              currentFocus,
              staffImpactResult.data
            );
          if (Result.isSuccess(trainingResult)) {
            updates.playersUpdated = trainingResult.data.playerUpdates.length;
            updates.logs.push(...trainingResult.data.logs);
          }
        }

        await txServices.cpuSimulation.processAllAITeams();

        await txServices.contract.processDailyWages({
          teamId,
          currentDate: newDateStr,
          seasonId,
        });

        if (FinanceService.isPayDay(newDateStr)) {
          const expenseResult = await txServices.finance.processMonthlyExpenses(
            {
              teamId,
              currentDate: newDateStr,
              seasonId,
            }
          );

          if (Result.isSuccess(expenseResult)) {
            updates.financialChanges.push({
              type: "expense",
              amount: expenseResult.data.totalExpense,
              category: "monthly_wages",
              description: expenseResult.data.message,
            });
          }
        }

        const eventResult =
          await txServices.narrativeService.processDailyEvents(
            teamId,
            newDateStr
          );
        if (Result.isSuccess(eventResult) && eventResult.data) {
          updates.narrativeEvent = eventResult.data;
          updates.logs.push(`🔔 Novo evento: ${eventResult.data.title}`);
        }

        if (isPlayerMatchDay) {
          const todaysMatches = await txRepos.matches.findPendingMatchesByDate(
            newDateStr
          );
          const cpuMatches = todaysMatches.filter(
            (m) => m.homeTeamId !== teamId && m.awayTeamId !== teamId
          );

          if (cpuMatches.length > 0) {
            const cpuResults: MatchResult[] = [];
            for (const m of cpuMatches) {
              const simResult = await txServices.match.simulateFullMatch(m.id);
              if (Result.isSuccess(simResult)) {
                cpuResults.push(simResult.data);
              }
            }
            updates.matchResults = cpuResults;
            updates.logs.push(
              `${cpuMatches.length} jogos de outros times simulados.`
            );
          }
        } else {
          const simulationResults =
            await txServices.match.simulateMatchesOfDate(newDateStr);
          if (Result.isSuccess(simulationResults)) {
            const simData = simulationResults.data;
            if (simData.matchesPlayed > 0) {
              updates.matchResults = simData.results.map((r) => r.result);
            }
          }
        }

        await txServices.dailyTransferProcessor.processDailyTransfers(
          newDateStr,
          seasonId
        );

        if (this.gameState) {
          this.gameState.currentDate = newDateStr;
          await txRepos.gameState.save({
            ...this.gameState,
            currentDate: newDateStr,
            lastPlayedAt: new Date().toISOString(),
          });
        }

        return updates;
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logger.error(
        `[FALHA CRÍTICA] Erro no processamento diário: ${errorMessage}`,
        {
          stack: error instanceof Error ? error.stack : undefined,
          date: updates.date,
        }
      );

      const previousDate = new Date(this.getCurrentDate());
      previousDate.setDate(previousDate.getDate() - 1);
      this.timeEngine.setDate(previousDate.toISOString().split("T")[0]);

      updates.logs.push(
        `❌ ERRO CRÍTICO: A simulação foi interrompida. Detalhes: ${errorMessage}`
      );
      return updates;
    }
  }

  calculatePlayerMoralChange(
    result: "win" | "draw" | "loss",
    teamReputation: number,
    opponentReputation: number
  ): number {
    const reputationDiff = opponentReputation - teamReputation;
    if (result === "win") {
      return Math.max(5, Math.min(15, 10 + reputationDiff / 500));
    } else if (result === "loss") {
      return Math.min(-5, Math.max(-15, -10 - reputationDiff / 500));
    } else {
      return reputationDiff > 0 ? 2 : -2;
    }
  }

  calculateEnergyRecovery(
    restDays: number,
    staffEnergyBonus: number,
    trainingCenterQuality: number
  ): number {
    const baseRecovery = restDays * 15;
    const coachBonus = staffEnergyBonus;
    const facilityBonus = (trainingCenterQuality - 50) * 0.1;
    return Math.min(100, baseRecovery + coachBonus + facilityBonus);
  }

  calculateInjuryRisk(
    fitness: number,
    energy: number,
    age: number,
    physical: number
  ): number {
    let risk = 0;
    if (fitness < 70) risk += (70 - fitness) * 0.5;
    if (energy < 50) risk += (50 - energy) * 0.8;
    if (age > 30) risk += (age - 30) * 2;
    risk -= (physical - 50) * 0.3;
    return Math.max(0, Math.min(100, risk));
  }

  applyMatchFatigue(player: Player, minutesPlayed: number): Player {
    const fatigueAmount = minutesPlayed * 0.5;
    const newEnergy = Math.max(0, player.energy - fatigueAmount);
    return {
      ...player,
      energy: Math.round(newEnergy),
    };
  }

  calculatePlayerForm(recentPerformances: number[]): number {
    if (recentPerformances.length === 0) return 50;
    const average =
      recentPerformances.reduce((sum, val) => sum + val, 0) /
      recentPerformances.length;
    return Math.round(Math.max(0, Math.min(100, average)));
  }

  shouldInjuryOccur(injuryRisk: number): boolean {
    return Math.random() * 100 < injuryRisk;
  }

  generateInjuryDuration(
    severity: "light" | "moderate" | "severe",
    medicalMultiplier: number = 1.0
  ): number {
    let baseDuration = 0;
    switch (severity) {
      case "light":
        baseDuration = Math.floor(Math.random() * 7) + 3;
        break;
      case "moderate":
        baseDuration = Math.floor(Math.random() * 21) + 14;
        break;
      case "severe":
        baseDuration = Math.floor(Math.random() * 90) + 60;
        break;
    }
    return Math.max(1, Math.round(baseDuration * medicalMultiplier));
  }

  canPlayerPlay(player: Player): boolean {
    return (
      !player.isInjured &&
      player.suspensionGamesRemaining === 0 &&
      player.energy > 30 &&
      player.fitness > 40
    );
  }

  getPlayerAvailabilityStatus(player: Player): string {
    if (player.isInjured)
      return `Lesionado (${player.injuryDaysRemaining} dias)`;
    if (player.suspensionGamesRemaining ?? 0 > 0)
      return `Suspenso (${player.suspensionGamesRemaining} jogos)`;
    if (player.energy < 30) return "Exausto";
    if (player.fitness < 40) return "Fora de forma";
    return "Disponível";
  }

  async createGameSave(filename: string): Promise<ServiceResult<GameSave>> {
    return this.saveManager.createSaveContext({
      filename,
      matchHistoryLimit: 500,
      financialRecordLimit: 1000,
    });
  }

  validateGameSave(save: GameSave): SaveValidationResult {
    return this.saveManager.validateSave(save);
  }

  async loadGameSave(saveData: GameSave): Promise<ServiceResult<void>> {
    const restoreResult = await this.saveManager.loadSave(saveData);
    if (Result.isFailure(restoreResult)) {
      return restoreResult;
    }
    this.timeEngine = new TimeEngine(saveData.gameState.currentDate);
    const newState: GameState = {
      id: 1,
      saveId: saveData.gameState.saveId,
      currentDate: saveData.gameState.currentDate,
      currentSeasonId: saveData.gameState.currentSeasonId,
      managerName: saveData.gameState.managerName,
      playerTeamId: saveData.gameState.playerTeamId,
      simulationSpeed: saveData.gameState.simulationSpeed,
      trainingFocus: saveData.gameState.trainingFocus,
      totalPlayTime: saveData.gameState.totalPlayTime,
    };
    this.setGameState(newState);
    return Result.success(undefined, "Game loaded and engine state updated.");
  }

  async advanceDayWithCheck(): Promise<{
    advanced: boolean;
    stopReason?: string;
    stopMetadata?: any;
    date: string;
    result?: DailyUpdateResult;
  }> {
    const currentPlayerTeamId = this.gameState?.playerTeamId || null;

    if (currentPlayerTeamId) {
      const pendingMatchToday = await this.stopChecker.checkPlayerTeamMatch(
        this.getCurrentDate(),
        currentPlayerTeamId
      );

      if (pendingMatchToday.shouldStop) {
        this.stopSimulation();
        return {
          advanced: false,
          stopReason: "match_day",
          stopMetadata: pendingMatchToday.metadata,
          date: this.getCurrentDate(),
        };
      }
    }

    const currentDateObj = new Date(this.getCurrentDate());
    currentDateObj.setDate(currentDateObj.getDate() + 1);
    const nextDate = currentDateObj.toISOString().split("T")[0];

    const condition = await this.stopChecker.checkStopConditions(
      nextDate,
      this.gameState?.playerTeamId || null
    );

    if (condition.shouldStop && condition.reason !== "match_day") {
      this.stopSimulation();
      return {
        advanced: false,
        stopReason: condition.reason,
        stopMetadata: condition.metadata,
        date: this.getCurrentDate(),
      };
    }

    const isPlayerMatchDay =
      condition.shouldStop && condition.reason === "match_day";

    const result = await this.processDailyUpdate(isPlayerMatchDay);

    if (isPlayerMatchDay) {
      this.stopSimulation();
      return {
        advanced: true,
        date: this.getCurrentDate(),
        result,
        stopReason: "match_day",
        stopMetadata: condition.metadata,
      };
    }

    return {
      advanced: true,
      date: this.getCurrentDate(),
      result,
    };
  }

  private translateStopReason(reason?: string): string {
    switch (reason) {
      case "match_day":
        return "Dia de Jogo - Você tem uma partida pendente!";
      case "season_end":
        return "Fim de Temporada";
      case "transfer_proposal":
        return "Proposta de Transferência";
      case "financial_crisis":
        return "Crise Financeira";
      default:
        return "Evento Importante";
    }
  }
}

export interface DailyUpdateResult {
  date: string;
  playersUpdated: number;
  matchesPlayed: Match[];
  matchResults: MatchResult[];
  injuries: InjuryEvent[];
  suspensions: SuspensionEvent[];
  contractExpiries: ContractExpiryEvent[];
  financialChanges: FinancialChange[];
  news: GameEvent[];
  logs: string[];
  narrativeEvent?: NarrativeEvent | null;
  stopReason?: string;
}

export interface InjuryEvent {
  playerId: number;
  playerName: string;
  injuryType: string;
  duration: number;
}

export interface SuspensionEvent {
  playerId: number;
  playerName: string;
  teamId: number;
  games: number;
  reason: string;
}

export interface ContractExpiryEvent {
  playerId: number;
  playerName: string;
  teamId: number;
}

export interface FinancialChange {
  type: "income" | "expense";
  amount: number;
  category: string;
  description: string;
}
