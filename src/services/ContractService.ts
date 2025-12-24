import { BaseService } from "./BaseService";
import { Result } from "../domain/ServiceResults";
import type { ServiceResult } from "../domain/ServiceResults";
import type { IRepositoryContainer } from "../repositories/IRepositories";
import { FinancialOperationValidator } from "../domain/validators/FinancialOperationValidator";
import type { GameEventBus } from "../lib/GameEventBus";
import { GameEventType } from "../domain/GameEventTypes";
import { FinancialBalance } from "../engine/FinancialBalanceConfig";
import { FinancialCategory } from "../domain/enums";
import { TransferValuation } from "../domain/logic/TransferValuation";

export interface WageBillDetails {
  playerWages: number;
  staffWages: number;
  total: number;
  playerCount: number;
  staffCount: number;
}

export interface ContractExpirationResult {
  playersReleased: number;
  staffReleased: number;
}

export interface ProcessDailyWagesInput {
  teamId: number;
  currentDate: string;
  seasonId: number;
}

export interface RenewContractInput {
  playerId: number;
  newWage: number;
  newEndDate: string;
}

export class ContractService extends BaseService {
  private eventBus: GameEventBus;

  constructor(repositories: IRepositoryContainer, eventBus: GameEventBus) {
    super(repositories, "ContractService");
    this.eventBus = eventBus;
  }

  async calculateMonthlyWageBill(
    teamId: number
  ): Promise<ServiceResult<WageBillDetails>> {
    return this.execute("calculateMonthlyWageBill", teamId, async (teamId) => {
      const [playerWages, staffWages] = await Promise.all([
        this.calculatePlayerWages(teamId),
        this.calculateStaffWages(teamId),
      ]);

      return {
        playerWages: playerWages.monthly,
        staffWages: staffWages.monthly,
        total: playerWages.monthly + staffWages.monthly,
        playerCount: playerWages.count,
        staffCount: staffWages.count,
      };
    });
  }

  async checkExpiringContracts(
    currentDate: string
  ): Promise<ServiceResult<ContractExpirationResult>> {
    return this.execute("checkExpiringContracts", currentDate, async (date) => {
      const [playersReleased, staffReleased] = await Promise.all([
        this.processExpiringPlayerContracts(date),
        this.processExpiringStaffContracts(date),
      ]);

      return { playersReleased, staffReleased };
    });
  }

  async processDailyWages(
    input: ProcessDailyWagesInput
  ): Promise<ServiceResult<void>> {
    return this.executeVoid("processDailyWages", input, async ({ teamId }) => {
      const wageBillResult = await this.calculateMonthlyWageBill(teamId);

      if (Result.isFailure(wageBillResult)) {
        this.logger.warn(
          `Falha ao calcular salários diários para time ${teamId}`
        );
        return;
      }

      const wageBill = wageBillResult.data;
      const dailyTotal = Math.round(wageBill.total / 30);

      this.logger.debug(
        `Custo diário estimado de salários (Time ${teamId}): €${dailyTotal.toLocaleString(
          "pt-PT"
        )}`
      );
    });
  }

  async renewPlayerContract(
    input: RenewContractInput
  ): Promise<ServiceResult<void>> {
    const validation = FinancialOperationValidator.validateWage(input.newWage);
    if (!validation.isValid) {
      return Result.validation(validation.errors!.join(", "));
    }

    return this.executeVoid(
      "renewPlayerContract",
      input,
      async ({ playerId, newWage, newEndDate }) => {
        const currentContract = await this.repos.contracts.findActiveByPlayerId(
          playerId
        );
        if (!currentContract)
          throw new Error(
            `Nenhum contrato ativo encontrado para jogador ${playerId}`
          );

        const team = await this.repos.teams.findById(currentContract.teamId);
        if (!team)
          throw new Error(`Time ${currentContract.teamId} não encontrado.`);

        const player = await this.repos.players.findById(playerId);
        if (!player) throw new Error(`Jogador ${playerId} não encontrado.`);

        const renewalFee = this.calculateRenewalFee(newWage);
        const currentBudget = team.budget || 0;

        if (currentBudget < renewalFee) {
          throw new Error(
            `Orçamento insuficiente. Custo: €${renewalFee.toLocaleString()}, Disponível: €${currentBudget.toLocaleString()}`
          );
        }

        await this.repos.teams.updateBudget(
          team.id,
          currentBudget - renewalFee
        );
        const gameState = await this.repos.gameState.findCurrent();
        const currentSeasonId = gameState?.currentSeasonId || 1;
        const currentDate =
          gameState?.currentDate || new Date().toISOString().split("T")[0];

        await this.repos.financial.addRecord({
          teamId: team.id,
          seasonId: currentSeasonId,
          date: currentDate,
          type: "expense",
          category: FinancialCategory.SALARY,
          amount: renewalFee,
          description: `Bônus de Renovação - ${player.firstName} ${player.lastName}`,
        });

        const marketValue = TransferValuation.calculateMarketValue(player);
        const multiplier =
          FinancialBalance.CONTRACT_ECONOMICS.RELEASE_CLAUSE
            .RECOMMENDED_MULTIPLIER;
        const newReleaseClause = Math.round(marketValue * multiplier);

        await this.repos.contracts.updateTerms(
          currentContract.id,
          newWage,
          newEndDate,
          newReleaseClause
        );

        this.logger.info(
          `Contrato renovado: ${player.firstName} ${
            player.lastName
          }. Nova Cláusula: €${newReleaseClause.toLocaleString()}`
        );
      }
    );
  }

  private calculateRenewalFee(newWage: number): number {
    const config = FinancialBalance.CONTRACT_ECONOMICS.SIGNING_BONUS;
    const bonus = Math.round(newWage * config.NORMAL_TRANSFER_MULTIPLIER);
    return Math.max(config.MINIMUM, bonus);
  }

  private async calculatePlayerWages(
    teamId: number
  ): Promise<{ monthly: number; count: number }> {
    const activeContracts = await this.repos.contracts.findActiveByTeamId(
      teamId
    );

    const annualTotal = activeContracts.reduce(
      (sum, contract) => sum + (contract.wage || 0),
      0
    );
    return {
      monthly: Math.round(annualTotal / 12),
      count: activeContracts.length,
    };
  }

  private async calculateStaffWages(
    teamId: number
  ): Promise<{ monthly: number; count: number }> {
    const staffMembers = await this.repos.staff.findByTeamId(teamId);
    const annualTotal = staffMembers.reduce(
      (sum, member) => sum + (member.salary || 0),
      0
    );
    return {
      monthly: Math.round(annualTotal / 12),
      count: staffMembers.length,
    };
  }

  private async processExpiringPlayerContracts(
    currentDate: string
  ): Promise<number> {
    const expiringContracts = await this.repos.contracts.findExpiring(
      currentDate
    );

    for (const contract of expiringContracts) {
      await this.repos.contracts.updateStatus(contract.id, "expired");
      await this.repos.players.update(contract.playerId, { teamId: null });

      const player = await this.repos.players.findById(contract.playerId);
      const playerName = player
        ? `${player.firstName} ${player.lastName}`
        : "Jogador Desconhecido";

      await this.eventBus.publish(GameEventType.CONTRACT_EXPIRED, {
        playerId: contract.playerId,
        teamId: contract.teamId,
        playerName: playerName,
        contractEndDate: currentDate,
      });
    }

    return expiringContracts.length;
  }

  private async processExpiringStaffContracts(
    currentDate: string
  ): Promise<number> {
    const allStaff = await this.repos.staff.findFreeAgents();

    const expiredStaff = allStaff.filter((s) => s.contractEnd === currentDate);
    for (const member of expiredStaff) {
      await this.repos.staff.fire(member.id);
    }
    return expiredStaff.length;
  }

  async createContract(
    playerId: number,
    teamId: number,
    wage: number,
    endDate: string,
    type: string = "professional"
  ): Promise<ServiceResult<number>> {
    return this.execute("createContract", { playerId, teamId }, async () => {
      const player = await this.repos.players.findById(playerId);
      if (!player) throw new Error(`Jogador ${playerId} não encontrado.`);

      const marketValue = TransferValuation.calculateMarketValue(player);
      const multiplier =
        FinancialBalance.CONTRACT_ECONOMICS.RELEASE_CLAUSE
          .RECOMMENDED_MULTIPLIER;
      const releaseClause = Math.round(marketValue * multiplier);

      const contractId = await this.repos.contracts.create({
        playerId,
        teamId,
        startDate: new Date().toISOString().split("T")[0],
        endDate,
        wage,
        releaseClause,
        type,
        status: "active",
      });

      this.logger.info(
        `Contrato criado para ${
          player.lastName
        }. Cláusula: €${releaseClause.toLocaleString()}`
      );

      return contractId;
    });
  }
}
