import { BaseService } from "./BaseService";
import type { ServiceResult } from "../domain/ServiceResults";
import type { IRepositoryContainer } from "../repositories/IRepositories";
import { RandomEngine } from "../engine/RandomEngine";
import { InjuryEngine } from "../engine/InjuryEngine";
import { PhysiologyEngine } from "../engine/PhysiologyEngine";
import type { Player } from "../domain/models";
import { TrainingFocus } from "../domain/enums";
import type { TeamStaffImpact } from "../domain/types";
import type { PlayerDevelopmentService } from "./PlayerDevelopmentService";
import type { ScoutingService } from "./ScoutingService";
import type {
  MedicalCenterBenefits,
  TrainingCenterBenefits,
} from "../domain/types/InfrastructureTypes";
import { InfrastructureEconomics } from "../engine/InfrastructureEconomics";

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
  private scoutingService: ScoutingService;

  constructor(
    repositories: IRepositoryContainer,
    developmentService: PlayerDevelopmentService,
    scoutingService: ScoutingService
  ) {
    super(repositories, "DailySimulationService");
    this.developmentService = developmentService;
    this.scoutingService = scoutingService;
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
        const team = await this.repos.teams.findById(teamId);
        if (!team) throw new Error("Time não encontrado");

        if (this.scoutingService) {
          await this.scoutingService.processDailyScoutingProgress(teamId);
        }

        if (team.isHuman && this.scoutingService) {
          const gameState = await this.repos.gameState.findCurrent();
          const currentDate =
            gameState?.currentDate || new Date().toISOString();

          if (team.scoutingSlots) {
            for (const slot of team.scoutingSlots) {
              if (slot.isActive) {
                await this.scoutingService.executeSlotSearch(
                  teamId,
                  slot,
                  currentDate
                );
              }
            }
          }
        }

        const medicalLevel = team.medicalCenterQuality || 0;
        const medicalBenefits =
          InfrastructureEconomics.getMedicalBenefits(medicalLevel);

        const trainingLevel = team.trainingCenterQuality || 0;
        const trainingBenefits =
          InfrastructureEconomics.getTrainingBenefits(trainingLevel);

        this.logger.info(
          `🏋️ Treino Diário | Foco: ${trainingFocus} | Medical Lv: ${medicalLevel} | Training Lv: ${trainingLevel}`
        );

        const logs: string[] = [];
        const playerUpdates: PlayerTrainingUpdate[] = [];

        const players = await this.repos.players.findByTeamId(teamId);

        for (const player of players) {
          if (player.isInjured) {
            const update = await this.processInjuredPlayer(
              player,
              staffImpact.injuryRecoveryMultiplier,
              medicalBenefits.recoverySpeedBonus
            );
            playerUpdates.push(update);

            if (update.injuryDays === 0 && player.injuryDaysRemaining > 0) {
              logs.push(
                `🚑 ${player.firstName} ${player.lastName} recuperou-se da lesão.`
              );
            }
            continue;
          }

          const update = await this.processHealthyPlayer(
            player,
            trainingFocus,
            staffImpact,
            medicalBenefits,
            trainingBenefits,
            logs
          );
          playerUpdates.push(update);
        }

        if (playerUpdates.length > 0) {
          await this.repos.players.updateDailyStatsBatch(playerUpdates);
        }

        return { playerUpdates, logs };
      }
    );
  }

  private async processInjuredPlayer(
    player: Player,
    injuryRecoveryMultiplier: number,
    facilitySpeedBonus: number
  ): Promise<PlayerTrainingUpdate> {
    const { daysRemaining, isHealed } = PhysiologyEngine.processInjuryHealing(
      player,
      injuryRecoveryMultiplier,
      facilitySpeedBonus
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
    medicalBenefits: MedicalCenterBenefits,
    trainingBenefits: TrainingCenterBenefits,
    logs: string[]
  ): Promise<PlayerTrainingUpdate> {
    const newEnergy = PhysiologyEngine.calculateEnergyRecovery(
      player,
      trainingFocus,
      staffImpact.energyRecoveryBonus,
      medicalBenefits.recoverySpeedBonus
    );

    const newFitness = PhysiologyEngine.calculateFitnessChange(
      player,
      trainingFocus,
      staffImpact.energyRecoveryBonus
    );

    const injuryRisk = PhysiologyEngine.calculateInjuryRisk(
      player,
      trainingFocus,
      staffImpact.energyRecoveryBonus,
      medicalBenefits.injuryChanceReduction
    );

    const isInjured = RandomEngine.chance(injuryRisk);
    let injuryDays = 0;

    if (isInjured) {
      injuryDays = InjuryEngine.generateInjuryDuration(
        "light",
        staffImpact.injuryRecoveryMultiplier
      );
      logs.push(
        `🩹 ${player.firstName} ${player.lastName} sentiu uma lesão (${injuryDays} dias).`
      );
    }

    let updatedStats = {};
    let newOverall = player.overall;

    if (!isInjured) {
      const growthResult = await this.developmentService.processAttributeGrowth(
        player,
        trainingFocus,
        trainingBenefits.xpMultiplier
      );

      if (growthResult.attributesChanged) {
        updatedStats = { ...updatedStats, ...growthResult.updatedStats };
        newOverall = growthResult.newOverall;
        logs.push(...growthResult.logs);
      }
    }
    const newMoral = player.moral;

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
}
