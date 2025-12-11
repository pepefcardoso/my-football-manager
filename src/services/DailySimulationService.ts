import { BaseService } from "./BaseService";
import type { ServiceResult } from "./types/ServiceResults";
import type { IRepositoryContainer } from "../repositories/IRepositories";
import { RandomEngine } from "../engine/RandomEngine";
import { InjuryEngine } from "../engine/InjuryEngine";
import { AttributeCalculator } from "../engine/AttributeCalculator";
import type { Player } from "../domain/models";
import { TrainingFocus, Position } from "../domain/enums";
import type { TeamStaffImpact } from "../domain/types";
import { getBalanceValue } from "../engine/GameBalanceConfig";

const TRAINING_CONFIG = getBalanceValue("TRAINING");
const MORAL_CONFIG = TRAINING_CONFIG.MORAL;
const ENERGY_COST = TRAINING_CONFIG.ENERGY_COST;
const FITNESS_CHANGE = TRAINING_CONFIG.FITNESS_CHANGE;
const INJURY_CONFIG = TRAINING_CONFIG.INJURY;
const GROWTH_CONFIG = TRAINING_CONFIG.GROWTH;

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

export interface ProcessTeamDailyLoopInput {
  teamId: number;
  trainingFocus: TrainingFocus;
  staffImpact: TeamStaffImpact;
}

export class DailySimulationService extends BaseService {
  constructor(repositories: IRepositoryContainer) {
    super(repositories, "DailySimulationService");
  }

  async processTeamDailyLoop(
    teamId: number,
    trainingFocus: TrainingFocus,
    staffImpact: TeamStaffImpact
  ): Promise<ServiceResult<TeamTrainingResult>> {
    return this.execute(
      "processTeamDailyLoop",
      { teamId, trainingFocus, staffImpact },
      async ({ teamId, trainingFocus, staffImpact }) => {
        this.logger.info(
          `🏋️ Iniciando treino diário para time ${teamId}. Foco: ${trainingFocus.toUpperCase()}`
        );
        this.logger.debug("Impacto do Staff aplicado:", staffImpact);

        const logs: string[] = [];
        const playerUpdates: PlayerTrainingUpdate[] = [];

        logs.push(`Treino do dia: ${this.translateFocus(trainingFocus)}`);

        const players = await this.repos.players.findByTeamId(teamId);
        this.logger.info(`Processando ${players.length} jogadores...`);

        for (const player of players) {
          if (player.isInjured) {
            const update = await this.processInjuredPlayer(player);
            playerUpdates.push(update);

            if (update.injuryDays === 0 && player.injuryDaysRemaining > 0) {
              const msg = `🚑 ${player.firstName} ${player.lastName} recuperou-se da lesão.`;
              logs.push(msg);
              this.logger.info(
                `[Recuperação] Jogador ${player.id} está recuperado.`
              );
            }
            continue;
          }

          const update = await this.processHealthyPlayer(
            player,
            trainingFocus,
            staffImpact,
            logs
          );
          playerUpdates.push(update);
        }

        if (playerUpdates.length > 0) {
          await this.repos.players.updateDailyStatsBatch(playerUpdates);
        }

        this.logger.info(
          `Treino finalizado. ${playerUpdates.length} jogadores processados e atualizados.`
        );

        return { playerUpdates, logs };
      }
    );
  }

  private async processInjuredPlayer(
    player: Player
  ): Promise<PlayerTrainingUpdate> {
    const newDays = Math.max(0, player.injuryDaysRemaining - 1);

    return {
      id: player.id,
      energy: player.energy,
      fitness: Math.max(0, player.fitness + FITNESS_CHANGE.REST),
      moral: player.moral,
      overall: player.overall,
      injuryDays: newDays,
      isInjured: newDays > 0,
    };
  }

  private async processHealthyPlayer(
    player: Player,
    trainingFocus: TrainingFocus,
    staffImpact: TeamStaffImpact,
    logs: string[]
  ): Promise<PlayerTrainingUpdate> {
    const { energyDelta, fitnessDelta } = this.calculateTrainingEffects(
      trainingFocus,
      staffImpact
    );

    const newEnergy = Math.max(0, Math.min(100, player.energy + energyDelta));
    const newFitness = Math.max(
      0,
      Math.min(100, player.fitness + fitnessDelta)
    );

    const { isInjured, injuryDays } = this.checkInjuryRisk(
      player,
      trainingFocus,
      staffImpact
    );

    if (isInjured) {
      const msg = `🩹 ${player.firstName} ${player.lastName} sentiu uma lesão no treino (${injuryDays} dias).`;
      logs.push(msg);
      this.logger.warn(
        `[Lesão] Jogador ${player.id} lesionado por ${injuryDays} dias.`
      );
    }

    const { attributesChanged, updatedStats, newOverall } =
      await this.processAttributeGrowth(player, trainingFocus, isInjured, logs);

    let newMoral = player.moral;
    if (player.moral > MORAL_CONFIG.NEUTRAL_THRESHOLD)
      newMoral -= MORAL_CONFIG.NATURAL_DECAY_RATE;
    if (player.moral < MORAL_CONFIG.NEUTRAL_THRESHOLD)
      newMoral += MORAL_CONFIG.NATURAL_RECOVERY_RATE;

    return {
      id: player.id,
      energy: newEnergy,
      fitness: newFitness,
      moral: Math.round(newMoral),
      overall: newOverall,
      isInjured: isInjured,
      injuryDays: injuryDays,
      ...(attributesChanged ? updatedStats : {}),
    };
  }

  private calculateTrainingEffects(
    trainingFocus: TrainingFocus,
    staffImpact: TeamStaffImpact
  ): { energyDelta: number; fitnessDelta: number } {
    let energyDelta = 0;
    let fitnessDelta = 0;

    switch (trainingFocus) {
      case TrainingFocus.REST:
        energyDelta = ENERGY_COST.REST + staffImpact.energyRecoveryBonus;
        fitnessDelta = FITNESS_CHANGE.REST;
        break;
      case TrainingFocus.PHYSICAL:
        energyDelta = ENERGY_COST.PHYSICAL;
        fitnessDelta =
          FITNESS_CHANGE.PHYSICAL_BASE +
          staffImpact.energyRecoveryBonus *
            TRAINING_CONFIG.STAFF_BONUS_TO_FITNESS_MULTIPLIER;
        break;
      case TrainingFocus.TACTICAL:
        energyDelta = ENERGY_COST.TACTICAL;
        fitnessDelta = FITNESS_CHANGE.TACTICAL;
        break;
      case TrainingFocus.TECHNICAL:
        energyDelta = ENERGY_COST.TECHNICAL;
        fitnessDelta = FITNESS_CHANGE.TECHNICAL;
        break;
    }

    return { energyDelta, fitnessDelta };
  }

  private checkInjuryRisk(
    player: Player,
    trainingFocus: TrainingFocus,
    staffImpact: TeamStaffImpact
  ): { isInjured: boolean; injuryDays: number } {
    if (trainingFocus === TrainingFocus.REST) {
      return { isInjured: false, injuryDays: 0 };
    }

    const injuryRiskBase =
      (100 - player.energy) * INJURY_CONFIG.RISK_PER_MISSING_ENERGY_PERCENT +
      (trainingFocus === TrainingFocus.PHYSICAL
        ? INJURY_CONFIG.PHYSICAL_TRAINING_PENALTY
        : 0);

    const mitigatedRisk = Math.max(
      0,
      injuryRiskBase -
        staffImpact.energyRecoveryBonus / INJURY_CONFIG.STAFF_MITIGATION_DIVISOR
    );

    const isInjured = RandomEngine.chance(mitigatedRisk);

    if (isInjured) {
      const injuryDays = InjuryEngine.generateInjuryDuration(
        "light",
        staffImpact.injuryRecoveryMultiplier
      );
      return { isInjured: true, injuryDays };
    }

    return { isInjured: false, injuryDays: 0 };
  }

  private async processAttributeGrowth(
    player: Player,
    trainingFocus: TrainingFocus,
    isInjured: boolean,
    logs: string[]
  ): Promise<{
    attributesChanged: boolean;
    updatedStats: any;
    newOverall: number;
  }> {
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

    if (!isInjured && trainingFocus !== TrainingFocus.REST) {
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
          ] as const);
          if (updatedStats[attr] < 99) {
            updatedStats[attr]++;
            attributesChanged = true;
            logs.push(
              `📈 ${player.firstName} ${player.lastName} melhorou em ${attr}!`
            );
            this.logger.debug(`[Evolução] Jogador ${player.id} +1 ${attr}`);
          }
        } else if (trainingFocus === TrainingFocus.PHYSICAL) {
          const attr = RandomEngine.pickOne(["physical", "pace"] as const);
          if (updatedStats[attr] < 99) {
            updatedStats[attr]++;
            attributesChanged = true;
            logs.push(
              `💪 ${player.firstName} ${player.lastName} melhorou em ${attr}!`
            );
            this.logger.debug(`[Evolução] Jogador ${player.id} +1 ${attr}`);
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

    return { attributesChanged, updatedStats, newOverall };
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
