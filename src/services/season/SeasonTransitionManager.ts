import { BaseService } from "../BaseService";
import type { IRepositoryContainer } from "../../repositories/IRepositories";
import { Result } from "../../domain/ServiceResults";
import type { ServiceResult } from "../../domain/ServiceResults";
import type {
  PromotionRelegationService,
  PromotionRelegationResult,
} from "./PromotionRelegationService";
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

  /**
   * Orquestra todo o processo de transição de temporada.
   * Calcula resultados, aplica efeitos nos times/jogadores e inicia o novo ano.
   * * @param currentSeasonId ID da temporada que está encerrando
   */
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

        const outcome = outcomeResult.data;
        this.logOutcome(outcome);

        await this.applyPromotionRelegationEffects(outcome);

        await this.processSquadUpdates();

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

  /**
   * Atualiza reputação e orçamento baseando-se no sucesso/fracasso esportivo.
   */
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

  /**
   * Processa o envelhecimento de todos os jogadores e aposentadorias.
   */
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
          // Aposenta o jogador (remove do time, remove contrato)
          // Em uma implementação futura, isso poderia mover para uma tabela de "Lendas"
          await this.repos.players.update(player.id, {
            teamId: null,
            moral: 0,
          });
          // Opcional: Remover contrato ativo se existir (depende da implementação do repo)
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

  /**
   * Remove dados que não são mais necessários para a nova temporada
   * para manter a performance do banco de dados.
   */
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
