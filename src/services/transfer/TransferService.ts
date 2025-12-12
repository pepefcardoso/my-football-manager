import { BaseService } from "../BaseService";
import type { IRepositoryContainer } from "../../repositories/IRepositories";
import type { IUnitOfWork } from "../../repositories/IUnitOfWork";
import type { TransferProposalInsert } from "../../repositories/TransferProposalRepository";
import { GameEventBus } from "../events/GameEventBus";
import { GameEventType } from "../events/GameEventTypes";
import { Result } from "../types/ServiceResults";
import type { ServiceResult } from "../types/ServiceResults";
import {
  TransferStatus,
  TransferType,
  FinancialCategory,
} from "../../domain/enums";
import { getBalanceValue } from "../../engine/GameBalanceConfig";
import {
  TransferValidator,
  type TransferValidationContext,
} from "./validators/TransferValidator";

export interface CreateProposalInput {
  playerId: number;
  fromTeamId: number;
  toTeamId: number;
  type: TransferType;
  fee: number;
  wageOffer: number;
  contractLength: number;
  currentDate: string;
  seasonId: number;
}

export interface RespondProposalInput {
  proposalId: number;
  response: "accept" | "reject" | "counter";
  counterOfferFee?: number;
  rejectionReason?: string;
  currentDate: string;
}

const TRANSFER_CONFIG = getBalanceValue("TRANSFER");

export class TransferService extends BaseService {
  private unitOfWork: IUnitOfWork;
  private eventBus: GameEventBus;
  private transferValidator: TransferValidator;

  constructor(
    repositories: IRepositoryContainer,
    unitOfWork: IUnitOfWork,
    eventBus: GameEventBus
  ) {
    super(repositories, "TransferService");
    this.unitOfWork = unitOfWork;
    this.eventBus = eventBus;
    this.transferValidator = new TransferValidator(repositories);
  }

  async createProposal(
    input: CreateProposalInput
  ): Promise<ServiceResult<number>> {
    return this.execute(
      "createProposal",
      input,
      async ({
        playerId,
        fromTeamId,
        toTeamId,
        type,
        fee,
        wageOffer,
        contractLength,
        currentDate,
        seasonId,
      }) => {
        const validationContext: TransferValidationContext = {
          playerId,
          fromTeamId,
          toTeamId,
          fee,
          wageOffer,
          contractLength,
          transferType: type as any,
          currentDate,
          seasonId,
        };

        const validationResult = await this.transferValidator.validateTransfer(
          validationContext
        );

        if (Result.isFailure(validationResult)) {
          return validationResult as any;
        }

        const validationData = validationResult.data;

        if (!validationData.isValid) {
          const errorMessage = validationData.errors.join(" | ");
          return Result.businessRule(errorMessage);
        }

        const existing = await this.repos.transferProposals.findActiveProposal(
          playerId,
          fromTeamId,
          toTeamId
        );
        if (existing) {
          return Result.conflict(
            "Já existe uma negociação ativa para este jogador."
          );
        }

        const buyingTeam = await this.repos.teams.findById(toTeamId);

        if (!buyingTeam) {
          return Result.notFound(
            "Time comprador não encontrado, apesar da validação inicial."
          );
        }

        const deadlineDate = new Date(currentDate);
        deadlineDate.setDate(
          deadlineDate.getDate() + TRANSFER_CONFIG.PROPOSAL_RESPONSE_DAYS
        );
        const responseDeadline = deadlineDate.toISOString().split("T")[0];

        const proposalId = await this.repos.transferProposals.create({
          playerId,
          fromTeamId,
          toTeamId,
          type,
          status: TransferStatus.PENDING,
          fee,
          wageOffer,
          contractLength,
          createdAt: currentDate,
          responseDeadline,
        });

        this.logger.info(
          `Proposta #${proposalId} criada: ${buyingTeam.shortName} -> Jogador #${playerId} (€${fee})`
        );

        await this.eventBus.publish(GameEventType.PROPOSAL_RECEIVED, {
          proposalId,
          playerId,
          fromTeamId: toTeamId,
          toTeamId: fromTeamId,
          fee,
        });

        return proposalId;
      }
    );
  }

  async respondToProposal(
    input: RespondProposalInput
  ): Promise<ServiceResult<void>> {
    if (
      input.response === "counter" &&
      (!input.counterOfferFee || input.counterOfferFee <= 0)
    ) {
      return Result.validation("Contra-proposta requer um valor válido.");
    }

    return this.executeVoid(
      "respondToProposal",
      input,
      async ({
        proposalId,
        response,
        counterOfferFee,
        rejectionReason,
        currentDate,
      }) => {
        const proposal = await this.repos.transferProposals.findById(
          proposalId
        );
        if (!proposal)
          throw new Error(`Proposta ${proposalId} não encontrada.`);

        if (
          proposal.status !== TransferStatus.PENDING &&
          proposal.status !== TransferStatus.NEGOTIATING
        ) {
          throw new Error(
            `Não é possível responder a uma proposta com status: ${proposal.status}`
          );
        }

        const updateData: Partial<TransferProposalInsert> = {};

        if (response === "accept") {
          updateData.status = TransferStatus.ACCEPTED;
          this.logger.info(`Proposta #${proposalId} ACEITA.`);
        } else if (response === "reject") {
          updateData.status = TransferStatus.REJECTED;
          updateData.rejectionReason = rejectionReason || "Proposta rejeitada.";
          this.logger.info(`Proposta #${proposalId} REJEITADA.`);
        } else if (response === "counter") {
          updateData.status = TransferStatus.NEGOTIATING;
          updateData.counterOfferFee = counterOfferFee;

          const newDeadline = new Date(currentDate);
          newDeadline.setDate(
            newDeadline.getDate() + TRANSFER_CONFIG.COUNTER_RESPONSE_DAYS
          );
          updateData.responseDeadline = newDeadline.toISOString().split("T")[0];

          this.logger.info(
            `Contra-proposta para #${proposalId}: €${counterOfferFee}`
          );
        }

        await this.repos.transferProposals.update(proposalId, updateData);
      }
    );
  }

  async finalizeTransfer(proposalId: number): Promise<ServiceResult<void>> {
    const proposal = await this.repos.transferProposals.findById(proposalId);
    if (!proposal) return Result.notFound("Proposta");

    if (proposal.status !== TransferStatus.ACCEPTED) {
      return Result.businessRule(
        "Apenas propostas ACEITAS podem ser finalizadas."
      );
    }

    const activeSeason = await this.repos.seasons.findActiveSeason();
    if (!activeSeason || !activeSeason.id) {
      return Result.businessRule(
        "Não foi possível encontrar a temporada ativa para registrar finanças."
      );
    }
    const currentSeasonId = activeSeason.id;

    return this.executeVoid("finalizeTransfer", proposalId, async () => {
      await this.unitOfWork.execute(async (transactionalRepos) => {
        this.logger.info(
          `🔄 Iniciando transação da transferência #${proposalId}...`
        );

        const buyingTeam = await transactionalRepos.teams.findById(
          proposal.toTeamId!
        );
        const sellingTeam = await transactionalRepos.teams.findById(
          proposal.fromTeamId
        );
        const player = await transactionalRepos.players.findById(
          proposal.playerId
        );

        if (!buyingTeam || !player) {
          throw new Error("Entidades inválidas no momento da finalização.");
        }

        if (buyingTeam.budget < proposal.fee) {
          throw new Error(
            `Falha na transação: O comprador ${buyingTeam.name} não tem fundos (€${buyingTeam.budget} < €${proposal.fee}).`
          );
        }

        await transactionalRepos.teams.updateBudget(
          buyingTeam.id,
          buyingTeam.budget - proposal.fee
        );

        await transactionalRepos.financial.addRecord({
          teamId: buyingTeam.id,
          seasonId: currentSeasonId,
          date: new Date().toISOString().split("T")[0],
          type: "expense",
          category: FinancialCategory.TRANSFER_OUT,
          amount: proposal.fee,
          description: `Compra de ${player.firstName} ${player.lastName}`,
        });

        if (sellingTeam) {
          await transactionalRepos.teams.updateBudget(
            sellingTeam.id,
            sellingTeam.budget + proposal.fee
          );

          await transactionalRepos.financial.addRecord({
            teamId: sellingTeam.id,
            seasonId: currentSeasonId,
            date: new Date().toISOString().split("T")[0],
            type: "income",
            category: FinancialCategory.TRANSFER_IN,
            amount: proposal.fee,
            description: `Venda de ${player.firstName} ${player.lastName}`,
          });
        }

        await transactionalRepos.players.update(player.id, {
          teamId: buyingTeam.id,
          moral: TRANSFER_CONFIG.PLAYER_MORAL_ON_TRANSFER,
        });

        await transactionalRepos.transfers.create({
          playerId: player.id,
          fromTeamId: proposal.fromTeamId,
          toTeamId: buyingTeam.id,
          fee: proposal.fee,
          date: new Date().toISOString().split("T")[0],
          seasonId: currentSeasonId,
          type: proposal.type,
        });

        await transactionalRepos.transferProposals.update(proposal.id, {
          status: TransferStatus.COMPLETED,
        });

        this.logger.info(
          `✅ Transação concluída: ${player.lastName} -> ${buyingTeam.shortName}`
        );
      });

      await this.eventBus.publish(GameEventType.TRANSFER_COMPLETED, {
        playerId: proposal.playerId,
        fromTeamId: proposal.fromTeamId,
        toTeamId: proposal.toTeamId!,
        fee: proposal.fee,
        date: new Date().toISOString().split("T")[0],
      });
    });
  }

  /**
   * Busca todas as propostas de transferência recebidas por um time.
   * Inclui os dados do jogador e do time proponente (fromTeam).
   */
  async getReceivedProposals(teamId: number): Promise<ServiceResult<any[]>> {
    return this.execute("getReceivedProposals", teamId, async (teamId) => {
      const proposals = await this.repos.transferProposals.findReceivedByTeam(
        teamId
      );
      return proposals;
    });
  }

  /**
   * Busca todas as propostas de transferência enviadas por um time.
   * Inclui os dados do jogador e do time alvo (toTeam).
   */
  async getSentProposals(teamId: number): Promise<ServiceResult<any[]>> {
    return this.execute("getSentProposals", teamId, async (teamId) => {
      const proposals = await this.repos.transferProposals.findSentByTeam(
        teamId
      );
      return proposals;
    });
  }
}
