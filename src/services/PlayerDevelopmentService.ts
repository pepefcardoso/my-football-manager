import { BaseService } from "./BaseService";
import type { IRepositoryContainer } from "../repositories/IRepositories";
import { RandomEngine } from "../engine/RandomEngine";
import { AttributeCalculator } from "../engine/AttributeCalculator";
import { TrainingFocus, Position } from "../domain/enums";
import type { Player } from "../domain/models";
import { getBalanceValue } from "../engine/GameBalanceConfig";

const GROWTH_CONFIG = getBalanceValue("TRAINING").GROWTH;

export interface AttributeGrowthResult {
  attributesChanged: boolean;
  newOverall: number;
  updatedStats: Partial<Player>;
  logs: string[];
}

export class PlayerDevelopmentService extends BaseService {
  constructor(repositories: IRepositoryContainer) {
    super(repositories, "PlayerDevelopmentService");
  }

  async processAttributeGrowth(
    player: Player,
    trainingFocus: TrainingFocus
  ): Promise<AttributeGrowthResult> {
    const logs: string[] = [];
    let attributesChanged = false;

    const updatedStats: any = {
      finishing: player.finishing,
      passing: player.passing,
      dribbling: player.dribbling,
      defending: player.defending,
      physical: player.physical,
      pace: player.pace,
      shooting: player.shooting,
    };

    if (trainingFocus !== TrainingFocus.REST) {
      const growthChance =
        player.age < 21
          ? GROWTH_CONFIG.CHANCE_YOUTH_UNDER_21
          : player.age < 25
          ? GROWTH_CONFIG.CHANCE_YOUNG_21_TO_25
          : GROWTH_CONFIG.CHANCE_PRIME_OVER_25;

      if (RandomEngine.chance(growthChance)) {
        if (trainingFocus === TrainingFocus.TECHNICAL) {
          const attr = RandomEngine.pickOne([
            "passing",
            "dribbling",
            "shooting",
            "finishing",
            "defending",
          ] as const);

          if (updatedStats[attr] < 99) {
            updatedStats[attr]++;
            attributesChanged = true;
            logs.push(
              `📈 ${player.firstName} ${player.lastName} evoluiu em ${attr}!`
            );
          }
        } else if (trainingFocus === TrainingFocus.PHYSICAL) {
          const attr = RandomEngine.pickOne(["physical", "pace"] as const);

          if (updatedStats[attr] < 99) {
            updatedStats[attr]++;
            attributesChanged = true;
            logs.push(
              `💪 ${player.firstName} ${player.lastName} melhorou a condição física (${attr})!`
            );
          }
        } else if (trainingFocus === TrainingFocus.TACTICAL) {
          if (updatedStats.defending < 99 && RandomEngine.chance(50)) {
            updatedStats.defending++;
            attributesChanged = true;
            logs.push(
              `🧠 ${player.firstName} ${player.lastName} melhorou taticamente (defending)!`
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

    return { attributesChanged, newOverall, updatedStats, logs };
  }

  async checkAging(
    player: Player,
    currentDate: string
  ): Promise<AttributeGrowthResult | null> {
    if (!(player as any).birthDate) return null;

    const birthDate = new Date((player as any).birthDate);
    const today = new Date(currentDate);

    if (
      birthDate.getUTCDate() === today.getUTCDate() &&
      birthDate.getUTCMonth() === today.getUTCMonth()
    ) {
      const newAge = player.age + 1;
      const logs: string[] = [
        `🎂 Parabéns! ${player.firstName} ${player.lastName} completou ${newAge} anos.`,
      ];

      const updatedStats: any = {};
      let attributesChanged = false;

      if (newAge > 32) {
        if (player.pace > 10) {
          updatedStats.pace = player.pace - 1;
          attributesChanged = true;
          logs.push(
            `📉 Com a idade, ${player.firstName} perdeu um pouco de velocidade.`
          );
        }
        if (player.physical > 10 && RandomEngine.chance(50)) {
          updatedStats.physical = player.physical - 1;
          attributesChanged = true;
          logs.push(`📉 ${player.firstName} perdeu capacidade física.`);
        }
      }

      let newOverall = player.overall;
      if (attributesChanged) {
        const fullStats = {
          finishing: player.finishing,
          passing: player.passing,
          dribbling: player.dribbling,
          defending: player.defending,
          physical: updatedStats.physical || player.physical,
          pace: updatedStats.pace || player.pace,
          shooting: player.shooting,
        };

        newOverall = AttributeCalculator.calculateOverall(
          player.position as Position,
          fullStats
        );
      }

      return {
        attributesChanged: true,
        newOverall,
        updatedStats: { ...updatedStats, age: newAge },
        logs,
      };
    }

    return null;
  }
}
