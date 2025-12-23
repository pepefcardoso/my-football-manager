import { BaseService } from "../BaseService";
import type { IRepositoryContainer } from "../../repositories/IRepositories";
import { Result } from "../../domain/ServiceResults";
import type { ServiceResult } from "../../domain/ServiceResults";
import type { AITransferDecisionMaker } from "./AITransferDecisionMaker";
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

        for (const team of aiTeams) {
          const actionResult =
            await this.aiDecisionMaker.determineTransferAction(
              team.id,
              currentDate
            );

          if (Result.isSuccess(actionResult)) {
            const action = actionResult.data;
            if (action.action === "make_offer" && action.targetPlayerId) {
              const result = await this.handleMakeOffer(
                team.id,
                action.targetPlayerId,
                action.offerFee!,
                action.offerWage!,
                currentDate,
                currentSeasonId
              );

              if (Result.isSuccess(result)) {
                actionsCount++;
              }
            }
          } else {
            this.logger.error(
              `Falha ao determinar ação para ${team.shortName}:`,
              actionResult.error.message
            );
          }
        }

        for (const team of aiTeams) {
          const offersForMyPlayers =
            await this.repos.transferProposals.findWhereTeamIsSeller(team.id);

          const offersToBuy =
            await this.repos.transferProposals.findWhereTeamIsBuyer(team.id);

          const allProposals = [...offersForMyPlayers, ...offersToBuy];

          for (const proposal of allProposals) {
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
                  proposal.toTeamId === team.id
                ) {
                  const finalizeResult =
                    await this.transferService.finalizeTransfer(proposal.id);
                  if (Result.isSuccess(finalizeResult)) {
                    actionsCount++;
                    this.logger.info(
                      `🤖 AI (${team.shortName}) finalizou a compra da proposta #${proposal.id}`
                    );
                  }
                }
              }
            }
          }
        }

        const expiredCount = await this.repos.transferProposals.expireProposals(
          currentDate
        );

        if (expiredCount > 0) {
          this.logger.info(
            `📅 ${expiredCount} propostas expiradas por falta de resposta.`
          );
        }

        actionsCount += expiredCount;

        this.logger.info(
          `✅ Processamento da IA concluído. ${actionsCount} ações de mercado realizadas.`
        );
        return actionsCount;
      }
    );
  }

  private async handleMakeOffer(
    buyingTeamId: number,
    targetPlayerId: number,
    fee: number,
    wageOffer: number,
    currentDate: string,
    seasonId: number
  ): Promise<ServiceResult<number>> {
    const player = await this.repos.players.findById(targetPlayerId);

    if (!player || (player.teamId && player.teamId === buyingTeamId)) {
      return Result.notFound(
        `Jogador ${targetPlayerId} inválido ou já pertence ao time comprador.`
      );
    }

    const contractLength = 3;
    const transferType = TransferType.TRANSFER;

    const sellingTeamId = player.teamId || 0;

    this.logger.info(
      `🤖 AI (${buyingTeamId}) criando oferta: Jogador ${
        player.lastName
      } (Time Atual: ${sellingTeamId || "Free Agent"}) | Fee: ${fee}`
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
