import { BaseService } from "../BaseService";
import type { IRepositoryContainer } from "../../repositories/IRepositories";
import type { ServiceResult } from "../types/ServiceResults";
import { Result } from "../types/ServiceResults";
import {
  TransferValuation,
  type EvaluationResult,
} from "../../domain/logic/TransferValuation";
import { InterestLevel } from "../../domain/enums";
import { RandomEngine } from "../../engine/RandomEngine";
import type { Player } from "../../domain/models";
import type { TransferService } from "../transfer/TransferService";
import type { SquadAnalysisService } from "./SquadAnalysisService";
import type { TransferWindowManager } from "../transfer/TransferWindowManager";
import type { FinancialHealthChecker } from "../finance/FinancialHealthChecker";

interface PlayerWithContractInfo extends Player {
  contractEnd: string | null | undefined;
}

export interface AIBuyerAction {
  action: "no_action" | "make_offer" | "scout_player";
  targetPlayerId?: number;
  offerFee?: number;
  offerWage?: number;
}

export class AITransferDecisionMaker extends BaseService {
  private transferService: TransferService;
  private squadAnalysisService: SquadAnalysisService;
  private transferWindowManager: TransferWindowManager;
  private financialHealthChecker: FinancialHealthChecker;

  constructor(
    repositories: IRepositoryContainer,
    transferService: TransferService,
    squadAnalysisService: SquadAnalysisService,
    transferWindowManager: TransferWindowManager,
    financialHealthChecker: FinancialHealthChecker
  ) {
    super(repositories, "AITransferDecisionMaker");
    this.transferService = transferService;
    this.squadAnalysisService = squadAnalysisService;
    this.transferWindowManager = transferWindowManager;
    this.financialHealthChecker = financialHealthChecker;
  }

  /**
   * @param proposalId ID da proposta recebida.
   * @param currentDate Data atual do jogo.
   * @returns ServiceResult com a decisão.
   */
  async evaluateIncomingProposal(
    proposalId: number,
    currentDate: string
  ): Promise<ServiceResult<EvaluationResult>> {
    return this.execute(
      "evaluateIncomingProposal",
      { proposalId, currentDate },
      async ({ proposalId, currentDate }) => {
        const proposal = await this.repos.transferProposals.findById(
          proposalId
        );

        if (!proposal) {
          throw new Error("Proposta de Transferência não encontrada.");
        }

        const player = (await this.repos.players.findById(
          proposal.playerId
        )) as PlayerWithContractInfo | undefined;
        const sellingTeam = await this.repos.teams.findById(
          proposal.fromTeamId
        );

        if (!player || !sellingTeam) {
          if (player && proposal.fromTeamId === null) {
            throw new Error(
              "Proposta para Agente Livre ignorada (deve ser tratada no chamador)."
            );
          }
          throw new Error(
            "Jogador ou Time vendedor não encontrado na avaliação."
          );
        }

        const currentYear = new Date(currentDate).getFullYear();
        const contractEndYear = player.contractEnd
          ? new Date(player.contractEnd).getFullYear()
          : currentYear + 2;
        const yearsLeft = Math.max(1, contractEndYear - currentYear);

        const evaluation = TransferValuation.evaluateOffer(
          player,
          proposal.fee,
          sellingTeam.transferStrategy,
          yearsLeft
        );

        this.logger.info(
          `AI Decisão para proposta #${proposalId} (${player.lastName}): ${evaluation.decision}. Razão: ${evaluation.reason}`
        );

        const responseInput = {
          proposalId,
          response: evaluation.decision as "accept" | "reject" | "counter",
          counterOfferFee: evaluation.counterOfferFee,
          rejectionReason: evaluation.reason,
          currentDate,
        };

        await this.transferService.respondToProposal(responseInput);

        return evaluation;
      }
    );
  }

  /**
   * @param teamId ID do time da AI.
   * @param currentDate Data atual do jogo.
   * @returns Ação de compra recomendada.
   */
  async determineTransferAction(
    teamId: number,
    currentDate: string
  ): Promise<ServiceResult<AIBuyerAction>> {
    return this.execute(
      "determineTransferAction",
      { teamId, currentDate },
      async ({ teamId, currentDate }) => {
        if (!this.transferWindowManager.isWindowOpen(currentDate)) {
          return { action: "no_action" };
        }

        const healthCheck = await this.financialHealthChecker.canMakeTransfers(
          teamId
        );
        if (Result.isFailure(healthCheck) || !healthCheck.data.allowed) {
          this.logger.debug(
            `AI ${teamId} não pode comprar: Transfer Ban ou Erro de Saúde Financeira.`
          );
          return { action: "no_action" };
        }

        const analysisResult = await this.squadAnalysisService.analyzeSquad(
          teamId
        );
        if (Result.isFailure(analysisResult)) {
          this.logger.error(
            "Falha na análise de elenco da AI:",
            analysisResult.error.message
          );
          return { action: "no_action" };
        }

        const analysis = analysisResult.data;
        const criticalNeeds = analysis.needs.filter(
          (n) => n.priority === "critical" || n.priority === "high"
        );

        if (criticalNeeds.length === 0) {
          this.logger.debug(
            `AI ${teamId} não tem necessidades críticas de transferência no momento.`
          );
          return { action: "no_action" };
        }

        const primaryNeed = criticalNeeds[0];

        const targets = await this.repos.clubInterests.findByTeamId(teamId);

        const relevantTargets = targets
          .filter((t) => t.player.position === primaryNeed.position)
          .filter((t) => t.player.overall >= primaryNeed.minOverall)
          .filter(
            (t) =>
              t.interestLevel === InterestLevel.HIGH_PRIORITY ||
              t.interestLevel === InterestLevel.CRITICAL
          )
          .sort((a, b) => b.priority - a.priority);

        if (relevantTargets.length > 0) {
          const targetPlayer = relevantTargets[0].player;
          const targetPlayerId = targetPlayer.id;

          const estimatedFee =
            TransferValuation.calculateTransferFee(targetPlayer);
          const estimatedWage =
            TransferValuation.calculateSuggestedWage(targetPlayer);

          const canAffordResult =
            await this.squadAnalysisService.canAffordPlayer(
              teamId,
              estimatedFee,
              estimatedWage
            );

          if (Result.isSuccess(canAffordResult) && canAffordResult.data) {
            const offerFee = Math.round(
              (estimatedFee * RandomEngine.getInt(85, 95)) / 100
            );
            const offerWage = Math.round(
              (estimatedWage * RandomEngine.getInt(100, 110)) / 100
            );

            this.logger.info(
              `AI ${teamId} decide fazer oferta por ${targetPlayer.lastName}. Fee: ${offerFee}, Wage: ${offerWage}.`
            );

            return {
              action: "make_offer",
              targetPlayerId,
              offerFee,
              offerWage,
            };
          } else {
            this.logger.debug(
              `AI ${teamId} identificou ${targetPlayer.lastName} como alvo, mas não pode pagar.`
            );
          }
        }

        if (RandomEngine.chance(20)) {
          this.logger.debug(
            `AI ${teamId} não encontrou alvo imediato, mas decidiu procurar (Scouting).`
          );
          return { action: "scout_player" };
        }

        return { action: "no_action" };
      }
    );
  }
}
