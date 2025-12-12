import { BaseService } from "../BaseService";
import type { IRepositoryContainer } from "../../repositories/IRepositories";
import { Result } from "../types/ServiceResults";
import type { ServiceResult } from "../types/ServiceResults";
import type {
  AITransferDecisionMaker,
  AIBuyerAction,
} from "./AITransferDecisionMaker";
import type { TransferService } from "../transfer/TransferService";
import { TransferType } from "../../domain/enums";

export class DailyTransferProcessor extends BaseService {
  private aiDecisionMaker: AITransferDecisionMaker;
  private transferService: TransferService;

  constructor(
    repositories: IRepositoryContainer,
    aiDecisionMaker: AITransferDecisionMaker,
    transferService: TransferService
  ) {
    super(repositories, "DailyTransferProcessor");
    this.aiDecisionMaker = aiDecisionMaker;
    this.transferService = transferService;
  }

  /**
   * Processa a lógica diária de transferências para todos os clubes controlados
   * pela Inteligência Artificial.
   * * @param currentDate Data atual do jogo (YYYY-MM-DD).
   * @param currentSeasonId ID da temporada ativa.
   * @returns ServiceResult com o número de ações executadas.
   */
  async processDailyTransfers(
    currentDate: string,
    currentSeasonId: number
  ): Promise<ServiceResult<number>> {
    return this.execute(
      "processDailyTransfers",
      { currentDate, currentSeasonId },
      async ({ currentDate, currentSeasonId }) => {
        this.logger.info(
          `🤖 Iniciando processamento diário de transferências da IA em ${currentDate}...`
        );

        const allTeams = await this.repos.teams.findAll();
        const aiTeams = allTeams.filter((t) => !t.isHuman);

        let actionsCount = 0;
        const allActions: { teamId: number; action: AIBuyerAction }[] = [];

        for (const team of aiTeams) {
          const actionResult =
            await this.aiDecisionMaker.determineTransferAction(
              team.id,
              currentDate
            );

          if (Result.isSuccess(actionResult)) {
            allActions.push({ teamId: team.id, action: actionResult.data });
          } else {
            this.logger.error(
              `Falha ao determinar ação para ${team.shortName}:`,
              actionResult.error.message
            );
          }
        }

        for (const { teamId: buyingTeamId, action } of allActions) {
          if (action.action === "make_offer" && action.targetPlayerId) {
            const result = await this.handleMakeOffer(
              buyingTeamId,
              action.targetPlayerId,
              action.offerFee!,
              action.offerWage!,
              currentDate,
              currentSeasonId
            );
            if (Result.isSuccess(result)) {
              actionsCount++;

              const targetPlayer = await this.repos.players.findById(
                action.targetPlayerId
              );
              const sellingTeam = await this.repos.teams.findById(
                targetPlayer?.teamId || 0
              );

              if (sellingTeam && !sellingTeam.isHuman) {
                const evaluationResult =
                  await this.aiDecisionMaker.evaluateIncomingProposal(
                    result.data,
                    currentDate
                  );

                if (
                  Result.isSuccess(evaluationResult) &&
                  evaluationResult.data.decision === "accept"
                ) {
                  await this.transferService.finalizeTransfer(result.data);
                  actionsCount++;
                  this.logger.info(
                    `💰 Transferência entre AI FINALIZADA: Jogador ${targetPlayer?.lastName} para ${sellingTeam.shortName}.`
                  );
                }
              }
            }
          }
        }

        for (const team of aiTeams) {
          const proposals =
            await this.repos.transferProposals.findReceivedByTeam(team.id);
          for (const proposal of proposals) {
            if (
              proposal.status === "pending" ||
              proposal.status === "negotiating"
            ) {
              const evaluationResult =
                await this.aiDecisionMaker.evaluateIncomingProposal(
                  proposal.id,
                  currentDate
                );
              if (Result.isSuccess(evaluationResult)) {
                actionsCount++;
                
                if (
                  evaluationResult.data.decision === "accept" &&
                  proposal.toTeamId
                ) {
                  await this.transferService.finalizeTransfer(proposal.id);
                  actionsCount++;
                }
              }
            }
          }
        }

        const expiredCount = await this.repos.transferProposals.expireProposals(
          currentDate
        );
        this.logger.info(`📅 ${expiredCount} propostas expiradas.`);
        actionsCount += expiredCount;

        this.logger.info(
          `✅ Processamento da IA concluído. ${actionsCount} ações de mercado realizadas.`
        );
        return actionsCount;
      }
    );
  }

  /**
   * Tenta criar uma proposta de transferência.
   */
  private async handleMakeOffer(
    buyingTeamId: number,
    targetPlayerId: number,
    fee: number,
    wageOffer: number,
    currentDate: string,
    seasonId: number
  ): Promise<ServiceResult<number>> {
    const player = await this.repos.players.findById(targetPlayerId);
    if (!player || !player.teamId || player.teamId === buyingTeamId) {
      return Result.notFound(
        `Jogador ${targetPlayerId} ou o time vendedor é o mesmo que o comprador.`
      );
    }

    const contractLength = 3;
    const transferType = TransferType.TRANSFER;

    const sellingTeamId = player.teamId;

    this.logger.info(
      `Attempting to create proposal: ${buyingTeamId} (Comprador) -> ${player.lastName} @ ${sellingTeamId} (Vendedor)`
    );

    const proposalResult = await this.transferService.createProposal({
      playerId: targetPlayerId,
      fromTeamId: sellingTeamId,
      toTeamId: buyingTeamId,
      type: transferType,
      fee: fee,
      wageOffer: wageOffer,
      contractLength: contractLength,
      currentDate,
      seasonId,
    });

    return proposalResult;
  }
}
