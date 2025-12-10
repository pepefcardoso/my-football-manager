import { BaseService } from "../BaseService";
import type { IRepositoryContainer } from "../../repositories/IRepositories";
import { Result } from "../types/ServiceResults";
import type { ServiceResult } from "../types/ServiceResults";
import type { PromotionRelegationService } from "./PromotionRelegationService";
import type { SeasonService, SeasonSummary } from "../SeasonService";

export class SeasonTransitionManager extends BaseService {
  private promotionRelegationService: PromotionRelegationService;
  private seasonService: SeasonService;

  constructor(
    repositories: IRepositoryContainer,
    promotionRelegationService: PromotionRelegationService,
    seasonService: SeasonService
  ) {
    super(repositories, "SeasonTransitionManager");
    this.promotionRelegationService = promotionRelegationService;
    this.seasonService = seasonService;
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

        const outcomeResult =
          await this.promotionRelegationService.calculateOutcome(
            currentSeasonId
          );

        if (Result.isFailure(outcomeResult)) {
          throw new Error(outcomeResult.error.message);
        }

        const { championName, relegatedTeams, promotedTeams } =
          outcomeResult.data;

        this.logger.info(`🏆 Campeão da Temporada: ${championName}`);
        this.logger.info(`🔻 Rebaixados: [${relegatedTeams.join(", ")}]`);
        this.logger.info(`🔺 Promovidos: [${promotedTeams.join(", ")}]`);

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
          championName,
          promotedTeams,
          relegatedTeams,
        };
      }
    );
  }
}
