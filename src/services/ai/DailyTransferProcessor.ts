import { BaseService } from "../BaseService";
import type { IRepositoryContainer } from "../../repositories/IRepositories";
import { Result } from "../../domain/ServiceResults";
import type { ServiceResult } from "../../domain/ServiceResults";
import type { AITransferDecisionMaker } from "./AITransferDecisionMaker";
import type { TransferService } from "../transfer/TransferService";
import type { SquadAnalysisService } from "./SquadAnalysisService";
import { InterestLevel, TransferType } from "../../domain/enums";
import type { Player, Team } from "../../domain/models";
import { TransferValuation } from "../../domain/logic/TransferValuation";
import { RandomEngine } from "../../engine/RandomEngine";

export class DailyTransferProcessor extends BaseService {
  private aiDecisionMaker: AITransferDecisionMaker;
  private transferService: TransferService;
  private squadAnalysisService: SquadAnalysisService;

  constructor(
    repositories: IRepositoryContainer,
    aiDecisionMaker: AITransferDecisionMaker,
    transferService: TransferService,
    squadAnalysisService: SquadAnalysisService
  ) {
    super(repositories, "DailyTransferProcessor");
    this.aiDecisionMaker = aiDecisionMaker;
    this.transferService = transferService;
    this.squadAnalysisService = squadAnalysisService;
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
              `Falha ao determinar ação de compra para ${team.shortName}:`,
              actionResult.error.message
            );
          }

          if (RandomEngine.chance(40)) {
            const salesCount = await this.processAISales(
              team.id,
              currentDate,
              currentSeasonId,
              allTeams
            );
            actionsCount += salesCount;
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

  private async processAISales(
    teamId: number,
    currentDate: string,
    seasonId: number,
    allTeams: Team[]
  ): Promise<number> {
    const sellableResult =
      await this.squadAnalysisService.identifySellablePlayers(teamId);
    let interestsCreated = 0;

    if (Result.isSuccess(sellableResult)) {
      const playersToSell = sellableResult.data.slice(0, 3);

      for (const player of playersToSell) {
        const existingInterests = await this.repos.clubInterests.findByPlayerId(
          player.id
        );

        if (existingInterests.length === 0) {
          const marketValue = TransferValuation.calculateMarketValue(player);
          const potentialBuyerId = this.findPotentialBuyer(
            player,
            marketValue,
            teamId,
            allTeams
          );

          if (potentialBuyerId) {
            await this.repos.clubInterests.upsert({
              teamId: potentialBuyerId,
              playerId: player.id,
              interestLevel: InterestLevel.INTERESTED,
              priority: 1,
              maxFeeWillingToPay: Math.round(marketValue * 1.1),
              dateAdded: currentDate,
            });

            this.logger.info(
              `📢 Mercado: ${player.lastName} (Time ${teamId}) gerou interesse no Time ${potentialBuyerId}.`
            );

            const estimatedWage =
              TransferValuation.calculateSuggestedWage(player);

            const attractiveFee = Math.round(marketValue * 0.95);

            await this.handleMakeOffer(
              potentialBuyerId,
              player.id,
              attractiveFee,
              estimatedWage,
              currentDate,
              seasonId
            );

            interestsCreated++;
          }
        }
      }
    }
    return interestsCreated;
  }

  private findPotentialBuyer(
    player: Player,
    marketValue: number,
    sellingTeamId: number,
    allTeams: Team[]
  ): number | null {
    const candidates = allTeams.filter(
      (t) =>
        t.id !== sellingTeamId &&
        (t.budget || 0) > marketValue * 1.2 &&
        Math.abs((t.reputation || 0) - player.overall * 100) < 2000
    );

    if (candidates.length === 0) return null;

    const selected = RandomEngine.pickOne(candidates);
    return selected.id;
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
