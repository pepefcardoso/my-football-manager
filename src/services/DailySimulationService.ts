import { RandomEngine } from "../engine/RandomEngine";
import { GameEngine } from "../engine/GameEngine";
import { AttributeCalculator } from "../engine/AttributeCalculator";
import type { Player } from "../domain/models";
import { TrainingFocus, Position } from "../domain/enums";
import type { TeamStaffImpact } from "../domain/types";

export interface PlayerTrainingUpdate {
  id: number;
  energy: number;
  fitness: number;
  moral: number;
  overall: number;
  isInjured: boolean;
  injuryDays: number;
  finishing?: number;
  passing?: number;
  dribbling?: number;
  defending?: number;
  physical?: number;
  pace?: number;
  shooting?: number;
}

export interface TeamTrainingResult {
  playerUpdates: PlayerTrainingUpdate[];
  logs: string[];
}

export class DailySimulationService {
  private gameEngine: GameEngine;

  constructor() {
    this.gameEngine = new GameEngine();
  }

  public processTeamDailyLoop(
    players: Player[],
    trainingFocus: TrainingFocus,
    staffImpact: TeamStaffImpact
  ): TeamTrainingResult {
    const logs: string[] = [];
    const playerUpdates: PlayerTrainingUpdate[] = [];

    logs.push(`Treino do dia: ${this.translateFocus(trainingFocus)}`);

    for (const player of players) {
      if (player.isInjured) {
        const newDays = Math.max(0, player.injuryDaysRemaining - 1);
        playerUpdates.push({
          id: player.id,
          energy: player.energy,
          fitness: Math.max(0, player.fitness - 1),
          moral: player.moral,
          overall: player.overall,
          injuryDays: newDays,
          isInjured: newDays > 0,
        });

        if (newDays === 0 && player.injuryDaysRemaining > 0) {
          logs.push(
            `🚑 ${player.firstName} ${player.lastName} recuperou-se da lesão.`
          );
        }
        continue;
      }

      let energyDelta = 0;
      let fitnessDelta = 0;

      switch (trainingFocus) {
        case TrainingFocus.REST:
          energyDelta = 15 + staffImpact.energyRecoveryBonus;
          fitnessDelta = -1;
          break;
        case TrainingFocus.PHYSICAL:
          energyDelta = -10;
          fitnessDelta = 2 + staffImpact.energyRecoveryBonus * 0.1;
          break;
        case TrainingFocus.TACTICAL:
          energyDelta = -5;
          fitnessDelta = 0;
          break;
        case TrainingFocus.TECHNICAL:
          energyDelta = -7;
          fitnessDelta = 1;
          break;
      }

      const newEnergy = Math.max(0, Math.min(100, player.energy + energyDelta));
      const newFitness = Math.max(
        0,
        Math.min(100, player.fitness + fitnessDelta)
      );

      const injuryRiskBase =
        (100 - player.energy) * 0.05 +
        (trainingFocus === TrainingFocus.PHYSICAL ? 2 : 0);
      const mitigatedRisk = Math.max(
        0,
        injuryRiskBase - staffImpact.energyRecoveryBonus / 5
      );

      let isInjured = false;
      let injuryDays = 0;

      if (
        trainingFocus !== TrainingFocus.REST &&
        RandomEngine.chance(mitigatedRisk)
      ) {
        isInjured = true;
        injuryDays = this.gameEngine.generateInjuryDuration(
          "light",
          staffImpact.injuryRecoveryMultiplier
        );
        logs.push(
          `🩹 ${player.firstName} ${player.lastName} sentiu uma lesão no treino (${injuryDays} dias).`
        );
      }

      let attributesChanged = false;
      const updatedStats = {
        finishing: player.finishing,
        passing: player.passing,
        dribbling: player.dribbling,
        defending: player.defending,
        physical: player.physical,
        pace: player.pace,
        shooting: player.shooting,
      };

      if (!isInjured && trainingFocus !== TrainingFocus.REST) {
        const growthChance = player.age < 21 ? 15 : player.age < 25 ? 8 : 2;

        if (RandomEngine.chance(growthChance)) {
          if (trainingFocus === TrainingFocus.TECHNICAL) {
            const attr = RandomEngine.pickOne([
              "passing",
              "dribbling",
              "shooting",
              "finishing",
            ] as const);
            if (updatedStats[attr] < 99) {
              updatedStats[attr]++;
              attributesChanged = true;
              logs.push(
                `📈 ${player.firstName} ${player.lastName} melhorou em ${attr}!`
              );
            }
          } else if (trainingFocus === TrainingFocus.PHYSICAL) {
            const attr = RandomEngine.pickOne(["physical", "pace"] as const);
            if (updatedStats[attr] < 99) {
              updatedStats[attr]++;
              attributesChanged = true;
              logs.push(
                `💪 ${player.firstName} ${player.lastName} melhorou em ${attr}!`
              );
            }
          }
        }
      }

      let newOverall = player.overall;
      if (attributesChanged) {
        newOverall = AttributeCalculator.calculateOverall(
          player.position as Position,
          updatedStats
        );
      }

      let newMoral = player.moral;
      if (player.moral > 50) newMoral -= 0.5;
      if (player.moral < 50) newMoral += 0.5;

      playerUpdates.push({
        id: player.id,
        energy: newEnergy,
        fitness: newFitness,
        moral: Math.round(newMoral),
        overall: newOverall,
        isInjured: isInjured,
        injuryDays: injuryDays,
        ...updatedStats,
      });
    }

    return { playerUpdates, logs };
  }

  private translateFocus(focus: TrainingFocus): string {
    const map = {
      [TrainingFocus.REST]: "Descanso e Recuperação",
      [TrainingFocus.PHYSICAL]: "Condicionamento Físico",
      [TrainingFocus.TACTICAL]: "Tático e Posicionamento",
      [TrainingFocus.TECHNICAL]: "Técnico e Fundamentos",
    };
    return map[focus] || focus;
  }
}

export const dailySimulationService = new DailySimulationService();
