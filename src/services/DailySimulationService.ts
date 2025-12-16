import { BaseService } from "./BaseService";
import type { ServiceResult } from "./types/ServiceResults";
import type { IRepositoryContainer } from "../repositories/IRepositories";
import { RandomEngine } from "../engine/RandomEngine";
import { InjuryEngine } from "../engine/InjuryEngine";
import { PhysiologyEngine } from "../engine/PhysiologyEngine";
import type { Player } from "../domain/models";
import { TrainingFocus } from "../domain/enums";
import type { TeamStaffImpact } from "../domain/types";
import { getBalanceValue } from "../engine/GameBalanceConfig";
import type { PlayerDevelopmentService } from "./PlayerDevelopmentService";

const TRAINING_CONFIG = getBalanceValue("TRAINING");
const MORAL_CONFIG = TRAINING_CONFIG.MORAL;

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
  private developmentService: PlayerDevelopmentService;

  constructor(
    repositories: IRepositoryContainer,
    developmentService: PlayerDevelopmentService
  ) {
    super(repositories, "DailySimulationService");
    this.developmentService = developmentService;
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
            const update = await this.processInjuredPlayer(
              player,
              staffImpact.injuryRecoveryMultiplier
            );
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
    player: Player,
    injuryRecoveryMultiplier: number
  ): Promise<PlayerTrainingUpdate> {
    const { daysRemaining, isHealed } = PhysiologyEngine.processInjuryHealing(
      player,
      injuryRecoveryMultiplier
    );

    const newEnergy = Math.min(100, player.energy + 5);

    return {
      id: player.id,
      energy: newEnergy,
      fitness: Math.max(0, player.fitness - 1),
      moral: player.moral,
      overall: player.overall,
      injuryDays: daysRemaining,
      isInjured: !isHealed,
    };
  }

  private async processHealthyPlayer(
    player: Player,
    trainingFocus: TrainingFocus,
    staffImpact: TeamStaffImpact,
    logs: string[]
  ): Promise<PlayerTrainingUpdate> {
    const newEnergy = PhysiologyEngine.calculateEnergyRecovery(
      player,
      trainingFocus,
      staffImpact.energyRecoveryBonus
    );

    const newFitness = PhysiologyEngine.calculateFitnessChange(
      player,
      trainingFocus,
      staffImpact.energyRecoveryBonus
    );

    const injuryRisk = PhysiologyEngine.calculateInjuryRisk(
      player,
      trainingFocus,
      staffImpact.energyRecoveryBonus
    );

    const isInjured = RandomEngine.chance(injuryRisk);
    let injuryDays = 0;

    if (isInjured) {
      injuryDays = InjuryEngine.generateInjuryDuration(
        "light",
        staffImpact.injuryRecoveryMultiplier
      );
      const msg = `🩹 ${player.firstName} ${player.lastName} sentiu uma lesão no treino (${injuryDays} dias).`;
      logs.push(msg);
      this.logger.warn(
        `[Lesão] Jogador ${player.id} lesionado por ${injuryDays} dias.`
      );
    }

    let updatedStats = {};
    let newOverall = player.overall;

    if (!isInjured) {
      const growthResult = await this.developmentService.processAttributeGrowth(
        player,
        trainingFocus
      );

      if (growthResult.attributesChanged) {
        updatedStats = { ...updatedStats, ...growthResult.updatedStats };
        newOverall = growthResult.newOverall;
        logs.push(...growthResult.logs);
      }
    }

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
      ...updatedStats,
    };
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
