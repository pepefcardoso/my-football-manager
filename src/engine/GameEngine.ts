import type { GameState, Match, Player } from "../domain/models";
import type {
  MatchResult,
  GameEvent,
  GameSaveMetadata,
  GameSave,
} from "../domain/types";
import { FinanceService } from "../services/FinanceService";
import { serviceContainer } from "../services/ServiceContainer";
import { Logger } from "../lib/Logger";
import { Result, type ServiceResult } from "../services/types/ServiceResults";
import { TimeEngine } from "./TimeEngine";
import type { IRepositoryContainer } from "../repositories/IRepositories";

const logger = new Logger("GameEngine");

export class GameEngine {
  private timeEngine: TimeEngine;
  private gameState: GameState | null = null;
  public readonly saveManager: SaveManager;

  constructor(repositories: IRepositoryContainer, initialDate?: string) {
    this.timeEngine = new TimeEngine(initialDate || "2025-01-01");
    this.saveManager = new SaveManager(repositories);
  }

  setGameState(state: GameState) {
    this.gameState = state;

    if (state.currentDate) {
      this.timeEngine = new TimeEngine(state.currentDate);
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

  async processDailyUpdate(): Promise<DailyUpdateResult> {
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
    };

    if (this.gameState?.currentSeasonId && this.gameState?.playerTeamId) {
      const seasonId = this.gameState.currentSeasonId;
      const teamId = this.gameState.playerTeamId;
      const dateStr = this.getCurrentDate();

      try {
        await serviceContainer.contract.processDailyWages({
          teamId,
          currentDate: dateStr,
          seasonId,
        });

        if (FinanceService.isPayDay(dateStr)) {
          const expenseResult =
            await serviceContainer.finance.processMonthlyExpenses({
              teamId,
              currentDate: dateStr,
              seasonId,
            });

          if (Result.isSuccess(expenseResult)) {
            updates.financialChanges.push({
              type: "expense",
              amount: expenseResult.data.totalExpense,
              category: "monthly_wages",
              description: expenseResult.data.message,
            });
          }
        }

        const simulationResults =
          await serviceContainer.match.simulateMatchesOfDate(dateStr);

        if (Result.isSuccess(simulationResults)) {
          const simData = simulationResults.data;

          if (simData.matchesPlayed > 0) {
            updates.matchResults = simData.results.map(
              (r: { result: MatchResult }) => r.result
            );

            logger.info(
              `${simData.matchesPlayed} partidas simuladas neste dia.`
            );
          }
        }

        const aiTransferResult =
          await serviceContainer.dailyTransferProcessor.processDailyTransfers(
            dateStr,
            seasonId
          );

        if (Result.isSuccess(aiTransferResult) && aiTransferResult.data > 0) {
          updates.logs.push(
            `O mercado de transferências da IA teve ${aiTransferResult.data} ações.`
          );
        }

        const contractExpiryResult =
          await serviceContainer.contract.checkExpiringContracts(dateStr);
        if (
          Result.isSuccess(contractExpiryResult) &&
          contractExpiryResult.data.playersReleased > 0
        ) {
          updates.logs.push(
            `${contractExpiryResult.data.playersReleased} contratos de jogadores expiraram.`
          );
        }

        // TODO: Treinamento e Recuperação Diária de Jogadores
        // Implementar usando DailySimulationService (já existe no projeto)

        // Opcional: Verificar saúde financeira diariamente para aplicar penalidades imediatas
        // await FinanceService.checkFinancialHealth(teamId);
      } catch (error) {
        logger.error("Erro no processamento financeiro diário:", error);
      }
    }

    // Atualizar jogadores (moral, energia, fitness)
    // Implementar após ter acesso ao DB (PlayerRepository)

    // Processar partidas do dia
    // Implementar motor de partidas (MatchService)

    return updates;
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

export class SaveManager {
  private repos: IRepositoryContainer;

  constructor(repositories: IRepositoryContainer) {
    this.repos = repositories;
  }

  async createSaveContext(filename: string): Promise<ServiceResult<GameSave>> {
    try {
      const state = await this.repos.gameState.findCurrent();

      if (!state) {
        return Result.fail("Não há estado de jogo ativo para salvar.");
      }

      let teamName = "Desempregado";
      let teamReputation = 0;
      let primaryColor = "#333333";

      if (state.playerTeamId) {
        const team = await this.repos.teams.findById(state.playerTeamId);
        if (team) {
          teamName = team.name;
          teamReputation = team.reputation;
          primaryColor = team.primaryColor;
        }
      }

      let seasonYear = new Date(state.currentDate).getFullYear();
      if (state.currentSeasonId) {
        const activeSeason = await this.repos.seasons.findActiveSeason();
        if (activeSeason) seasonYear = activeSeason.year;
      }

      // TODO: Obter saveId real do estado (assumindo que foi adicionado ao schema)
      const saveId = (state as any).saveId || crypto.randomUUID();
      const totalPlayTime = (state as any).totalPlayTime || 0;

      const metadata: GameSaveMetadata = {
        id: saveId,
        filename: filename,
        managerName: state.managerName,
        teamName: teamName,
        teamId: state.playerTeamId || 0,
        currentDate: state.currentDate,
        seasonYear: seasonYear,
        reputation: teamReputation,
        playTimeSeconds: totalPlayTime,
        lastSaveTimestamp: new Date().toISOString(),
        version: "0.1.0",
        primaryColor: primaryColor,
      };

      return Result.success({
        metadata,
      });
    } catch (error) {
      logger.error("Erro ao criar contexto de save:", error);
      return Result.fail("Falha interna ao gerar dados de salvamento.");
    }
  }

  validateSaveCompatibility(metadata: GameSaveMetadata): boolean {
    const currentMajor = "0";
    const saveMajor = metadata.version.split(".")[0];
    return currentMajor === saveMajor;
  }
}
