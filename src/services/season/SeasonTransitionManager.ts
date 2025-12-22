import { BaseService } from "../BaseService";
import type { IRepositoryContainer } from "../../repositories/IRepositories";
import { Result } from "../../domain/ServiceResults";
import type { ServiceResult } from "../../domain/ServiceResults";
import type { SeasonService, SeasonSummary } from "../SeasonService";
import { getBalanceValue } from "../../engine/GameBalanceConfig";
import type { YouthAcademyService } from "../YouthAcademyService";
import { InfrastructureEconomics } from "../../engine/InfrastructureEconomics";
import type { FacilityType } from "../../domain/types/InfrastructureTypes";

interface PromotionRelegationResult {
  championName: string;
  promotedTeams: number[];
  relegatedTeams: number[];
}

const SLOTS = getBalanceValue("SEASON").PROMOTION_RELEGATION_SLOTS;

export class SeasonTransitionManager extends BaseService {
  private seasonService: SeasonService;
  private youthAcademyService: YouthAcademyService;

  constructor(
    repositories: IRepositoryContainer,
    seasonService: SeasonService,
    youthAcademyService: YouthAcademyService
  ) {
    super(repositories, "SeasonTransitionManager");
    this.seasonService = seasonService;
    this.youthAcademyService = youthAcademyService;
  }

  async processEndOfSeason(
    currentSeasonId: number
  ): Promise<ServiceResult<SeasonSummary>> {
    return this.execute(
      "processEndOfSeason",
      currentSeasonId,
      async (currentSeasonId) => {
        this.logger.info(
          `🏁 Iniciando processamento de fim de temporada (ID: ${currentSeasonId})...`
        );

        const activeSeason = await this.repos.seasons.findActiveSeason();

        if (!activeSeason) {
          throw new Error("Nenhuma temporada ativa encontrada para finalizar.");
        }

        const outcome = await this.calculatePromotionRelegation(
          currentSeasonId
        );

        this.logOutcome(outcome);

        await this.applyPromotionRelegationEffects(outcome);

        await this.processInfrastructureDegradation();

        await this.processSquadUpdates();

        await this.processYouthIntake();

        await this.cleanupInactiveData();

        const nextSeasonResult = await this.seasonService.startNewSeason(
          activeSeason.year + 1
        );

        if (Result.isFailure(nextSeasonResult)) {
          throw new Error(
            `Erro ao iniciar próxima temporada: ${nextSeasonResult.error.message}`
          );
        }

        return {
          seasonYear: activeSeason.year,
          championName: outcome.championName,
          promotedTeams: outcome.promotedTeams,
          relegatedTeams: outcome.relegatedTeams,
        };
      }
    );
  }

  private async processInfrastructureDegradation(): Promise<void> {
    this.logger.info("🏗️ Processando degradação anual de infraestrutura...");

    const allTeams = await this.repos.teams.findAll();
    const facilityTypes: FacilityType[] = [
      "stadium_quality",
      "training_center_quality",
      "youth_academy_quality",
      "medical_center_quality",
      "administrative_center_quality",
    ];

    let totalDegradedLevels = 0;

    for (const team of allTeams) {
      const updates: any = {};
      let changed = false;

      const levels: Record<FacilityType, number> = {
        stadium_capacity: team.stadiumCapacity,
        stadium_quality: team.stadiumQuality,
        training_center_quality: team.trainingCenterQuality,
        youth_academy_quality: team.youthAcademyQuality,
        medical_center_quality: team.medicalCenterQuality,
        administrative_center_quality: team.administrativeCenterQuality,
      };

      for (const type of facilityTypes) {
        const currentLevel = levels[type];
        if (currentLevel > 0) {
          const loss =
            InfrastructureEconomics.calculateAnnualDegradation(currentLevel);
          const newLevel = Math.max(0, currentLevel - loss);

          if (newLevel !== currentLevel) {
            switch (type) {
              case "stadium_quality":
                updates.stadiumQuality = newLevel;
                break;
              case "training_center_quality":
                updates.trainingCenterQuality = newLevel;
                break;
              case "youth_academy_quality":
                updates.youthAcademyQuality = newLevel;
                break;
              case "medical_center_quality":
                updates.medicalCenterQuality = newLevel;
                break;
              case "administrative_center_quality":
                updates.administrativeCenterQuality = newLevel;
                break;
            }
            changed = true;
            totalDegradedLevels += loss;
          }
        }
      }

      if (changed) {
        await this.repos.teams.update(team.id, updates);
        // Opcional: Enviar notificação para o jogador humano se for o time dele
        if (team.isHuman) {
          // TODO: Criar evento de notificação de degradação
          this.logger.info(
            `Time humano ${team.name} sofreu degradação nas instalações.`
          );
        }
      }
    }

    this.logger.info(
      `✅ Degradação concluída. Total de níveis perdidos na liga: ${totalDegradedLevels}`
    );
  }

  private async processYouthIntake(): Promise<void> {
    this.logger.info("👶 Iniciando processo de Youth Intake anual...");

    const allTeams = await this.repos.teams.findAll();
    let totalGenerated = 0;

    for (const team of allTeams) {
      try {
        const intakeResult = await this.youthAcademyService.generateYouthIntake(
          team.id
        );

        if (Result.isSuccess(intakeResult)) {
          totalGenerated += intakeResult.data.length;
        }
      } catch (error) {
        this.logger.error(`Erro ao gerar intake para time ${team.id}:`, error);
      }
    }

    this.logger.info(
      `✅ Youth Intake concluído. ${totalGenerated} novas promessas geradas.`
    );
  }

  private async calculatePromotionRelegation(
    seasonId: number
  ): Promise<PromotionRelegationResult> {
    const competitions = await this.repos.competitions.findAll();

    const tier1 = competitions.find((c) => c.tier === 1 && c.type === "league");
    const tier2 = competitions.find((c) => c.tier === 2 && c.type === "league");

    let championName = "Desconhecido";
    let relegated: number[] = [];
    let promoted: number[] = [];

    if (tier1) {
      const standingsT1 = await this.repos.competitions.getStandings(
        tier1.id,
        seasonId
      );

      if (standingsT1.length > 0) {
        championName = standingsT1[0].team?.name || "Desconhecido";
        const numberToSwap = SLOTS;
        relegated = standingsT1.slice(-numberToSwap).map((s) => s.teamId!);
      }
    }

    if (tier2) {
      const standingsT2 = await this.repos.competitions.getStandings(
        tier2.id,
        seasonId
      );
      const numberToSwap = SLOTS;
      promoted = standingsT2.slice(0, numberToSwap).map((s) => s.teamId!);
    }

    return {
      championName,
      promotedTeams: promoted,
      relegatedTeams: relegated,
    };
  }

  private async applyPromotionRelegationEffects(
    outcome: PromotionRelegationResult
  ): Promise<void> {
    this.logger.info("Aplicando efeitos de promoção e rebaixamento...");

    for (const teamId of outcome.promotedTeams) {
      const team = await this.repos.teams.findById(teamId);
      if (team) {
        const newReputation = (team.reputation || 0) + 1000;
        const budgetBonus = 10_000_000;

        await this.repos.teams.update(teamId, {
          reputation: newReputation,
          budget: (team.budget || 0) + budgetBonus,
        });

        this.logger.debug(
          `Time ${team.shortName} promovido: Reputação +1000, Orçamento +10M`
        );
      }
    }

    for (const teamId of outcome.relegatedTeams) {
      const team = await this.repos.teams.findById(teamId);
      if (team) {
        const newReputation = Math.max(0, (team.reputation || 0) - 1000);

        await this.repos.teams.update(teamId, {
          reputation: newReputation,
        });

        this.logger.debug(`Time ${team.shortName} rebaixado: Reputação -1000`);
      }
    }
  }

  private async processSquadUpdates(): Promise<void> {
    this.logger.info("🔄 Processando envelhecimento e renovação de elencos...");

    const allTeams = await this.repos.teams.findAll();
    let retiredCount = 0;
    let agedCount = 0;

    for (const team of allTeams) {
      const players = await this.repos.players.findByTeamId(team.id);

      for (const player of players) {
        const newAge = player.age + 1;

        const retirementAge = 39;

        if (newAge >= retirementAge) {
          await this.repos.players.update(player.id, {
            teamId: null,
            moral: 0,
          });
          retiredCount++;
        } else {
          let physicalChange = 0;
          let paceChange = 0;

          if (newAge > 32) {
            physicalChange = -2;
            paceChange = -3;
          }

          const newPhysical = Math.max(
            1,
            (player.physical || 50) + physicalChange
          );
          const newPace = Math.max(1, (player.pace || 50) + paceChange);

          await this.repos.players.update(player.id, {
            age: newAge,
            physical: newPhysical,
            pace: newPace,
          });
          agedCount++;
        }
      }
    }

    this.logger.info(
      `✅ Elencos atualizados: ${agedCount} jogadores envelheceram, ${retiredCount} se aposentaram.`
    );
  }

  private async cleanupInactiveData(): Promise<void> {
    this.logger.info("🧹 Executando limpeza de dados inativos...");

    const today = new Date().toISOString().split("T")[0];

    const interestsRemoved = await this.repos.clubInterests.deleteOlderThan(
      today
    );

    this.logger.info(
      `Limpeza concluída. ${interestsRemoved} interesses antigos removidos.`
    );
  }

  private logOutcome(outcome: PromotionRelegationResult) {
    this.logger.info(`=== RESULTADO DA TEMPORADA ===`);
    this.logger.info(`🏆 Campeão: ${outcome.championName}`);
    this.logger.info(`🔺 Promovidos: ${outcome.promotedTeams.join(", ")}`);
    this.logger.info(`🔻 Rebaixados: ${outcome.relegatedTeams.join(", ")}`);
    this.logger.info(`==============================`);
  }
}
