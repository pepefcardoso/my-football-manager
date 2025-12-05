import type { GameState, Match, Player } from "../domain/models";
import { FinanceService } from "../services/FinanceService";
import { contractService } from "../services/ContractService";

export class GameEngine {
  private currentDate: Date;
  private gameState: GameState | null = null;

  constructor(initialDate?: string) {
    this.currentDate = initialDate
      ? new Date(initialDate)
      : new Date("2025-01-01");
  }

  setGameState(state: GameState) {
    this.gameState = state;
  }

  getGameState(): GameState | null {
    return this.gameState;
  }

  getCurrentDate(): string {
    return this.currentDate.toISOString().split("T")[0];
  }

  advanceDay(): string {
    this.currentDate.setDate(this.currentDate.getDate() + 1);
    return this.getCurrentDate();
  }

  advanceDays(days: number): string {
    for (let i = 0; i < days; i++) {
      this.advanceDay();
    }
    return this.getCurrentDate();
  }

  getWeekday(): string {
    const days = [
      "Domingo",
      "Segunda",
      "Terça",
      "Quarta",
      "Quinta",
      "Sexta",
      "Sábado",
    ];
    return days[this.currentDate.getDay()];
  }

  isMatchDay(): boolean {
    const day = this.currentDate.getDay();
    return day === 3 || day === 6;
  }

  async processDailyUpdate(): Promise<DailyUpdateResult> {
    const updates: DailyUpdateResult = {
      date: this.getCurrentDate(),
      playersUpdated: 0,
      matchesPlayed: [],
      injuries: [],
      suspensions: [],
      contractExpiries: [],
      financialChanges: [],
    };

    if (this.gameState?.currentSeasonId && this.gameState?.playerTeamId) {
      const seasonId = this.gameState.currentSeasonId;
      const teamId = this.gameState.playerTeamId;
      const dateStr = this.getCurrentDate();

      try {
        await contractService.processDailyWages(teamId, dateStr, seasonId);

        if (FinanceService.isPayDay(dateStr)) {
          const expenseResult = await FinanceService.processMonthlyExpenses(
            teamId,
            dateStr,
            seasonId
          );

          if (expenseResult.success) {
            updates.financialChanges.push({
              type: "expense",
              amount: expenseResult.totalExpense,
              category: "monthly_wages",
              description: expenseResult.message,
            });
          }
        }

        // Opcional: Verificar saúde financeira diariamente para aplicar penalidades imediatas
        // await FinanceService.checkFinancialHealth(teamId);
      } catch (error) {
        console.error("Erro no processamento financeiro diário:", error);
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
  injuries: InjuryEvent[];
  suspensions: SuspensionEvent[];
  contractExpiries: ContractExpiryEvent[];
  financialChanges: FinancialChange[];
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

export interface GameSave {
  gameState: GameState;
  currentDate: string;
  version: string;
  timestamp: string;
}

export class SaveManager {
  static createSave(gameState: GameState, currentDate: string): GameSave {
    return {
      gameState,
      currentDate,
      version: "1.0.0",
      timestamp: new Date().toISOString(),
    };
  }

  static validateSave(save: GameSave): boolean {
    return !!(
      save.gameState &&
      save.currentDate &&
      save.version &&
      save.timestamp
    );
  }
}
