import { RandomEngine } from "../engine/RandomEngine";
import { GameEngine } from "../engine/GameEngine";
import type { Player } from "../domain/models";
import { TrainingFocus } from "../domain/enums";
import type { TeamStaffImpact } from "../domain/types";

export interface PlayerTrainingUpdate {
  id: number;
  energy: number;
  fitness: number;
  moral: number;
  overall: number;
  isInjured: boolean;
  injuryDays: number;
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

      let newOverall = player.overall;

      if (!isInjured && trainingFocus !== TrainingFocus.REST) {
        const growthChance = player.age < 23 ? 5 : player.age < 29 ? 2 : 0.5;
        const declineChance =
          player.age > 32 && trainingFocus === TrainingFocus.PHYSICAL ? 2 : 0;

        if (RandomEngine.chance(growthChance)) {
          if (player.overall < player.potential) {
            newOverall += 1;
            logs.push(
              `📈 ${player.firstName} ${player.lastName} evoluiu nos treinos (+1).`
            );
          }
        } else if (RandomEngine.chance(declineChance)) {
          newOverall -= 1;
          logs.push(
            `📉 ${player.firstName} ${player.lastName} caiu de rendimento (-1).`
          );
        }
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
