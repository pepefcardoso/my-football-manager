import { BaseService } from "../../services/BaseService";
import type { IRepositoryContainer } from "../../repositories/IRepositories";
import { Result } from "../ServiceResults";
import type { ServiceResult } from "../ServiceResults";
import type { ValidationResult } from "../../services/BaseService";
import { getBalanceValue } from "../../engine/GameBalanceConfig";

const CONTRACT_CONFIG = getBalanceValue("CONTRACT");
const TRANSFER_VALIDATION_CONFIG = getBalanceValue("TRANSFER").VALIDATION;

export interface TransferValidationContext {
  playerId: number;
  fromTeamId: number;
  toTeamId: number;
  fee: number;
  wageOffer: number;
  contractLength: number;
  transferType: "transfer" | "loan";
  currentDate: string;
  seasonId: number;
}

export interface TransferValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class TransferValidator extends BaseService {
  constructor(repositories: IRepositoryContainer) {
    super(repositories, "TransferValidator");
  }

  /**
   * @param context - Contexto completo da transferência
   * @returns ServiceResult contendo o resultado da validação
   */
  async validateTransfer(
    context: TransferValidationContext
  ): Promise<ServiceResult<TransferValidationResult>> {
    return this.execute("validateTransfer", context, async (ctx) => {
      const errors: string[] = [];
      const warnings: string[] = [];

      const eligibilityCheck = await this.validatePlayerEligibility(
        ctx.playerId,
        ctx.seasonId
      );
      if (!eligibilityCheck.isValid) {
        errors.push(...(eligibilityCheck.errors || []));
      }

      const budgetCheck = await this.validateBuyerBudget(ctx.toTeamId, ctx.fee);
      if (!budgetCheck.isValid) {
        errors.push(...(budgetCheck.errors || []));
      }

      const ownershipCheck = await this.validatePlayerOwnership(
        ctx.playerId,
        ctx.fromTeamId
      );
      if (!ownershipCheck.isValid) {
        errors.push(...(ownershipCheck.errors || []));
      }

      const contractCheck = this.validateContractRules(
        ctx.contractLength,
        ctx.transferType
      );
      if (!contractCheck.isValid) {
        errors.push(...(contractCheck.errors || []));
      }

      const wageCheck = await this.validateWageOffer(
        ctx.playerId,
        ctx.wageOffer
      );
      if (!wageCheck.isValid) {
        errors.push(...(wageCheck.errors || []));
      }

      const squadCheck = await this.validateSquadLimit(ctx.toTeamId);
      if (!squadCheck.isValid) {
        warnings.push(...(squadCheck.errors || []));
      }

      const transferBanCheck = await this.validateTransferBan(ctx.toTeamId);
      if (!transferBanCheck.isValid) {
        errors.push(...(transferBanCheck.errors || []));
      }

      this.logger.debug("Validação de transferência concluída:", {
        playerId: ctx.playerId,
        errors: errors.length,
        warnings: warnings.length,
      });

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    });
  }

  /**
   * @param playerId - ID do jogador
   * @param seasonId - ID da temporada
   * @returns ValidationResult
   */
  private async validatePlayerEligibility(
    playerId: number,
    seasonId: number
  ): Promise<ValidationResult> {
    this.logger.debug(`Validando elegibilidade do jogador ${playerId}...`);

    const player = await this.repos.players.findById(playerId);
    if (!player) {
      return {
        isValid: false,
        errors: ["Jogador não encontrado no sistema."],
      };
    }

    if (
      player.isInjured &&
      (player.injuryDaysRemaining || 0) >
        TRANSFER_VALIDATION_CONFIG.MAX_INJURY_DAYS_FOR_TRANSFER
    ) {
      return {
        isValid: false,
        errors: [
          `${player.firstName} ${player.lastName} está lesionado e não pode ser transferido no momento.`,
        ],
      };
    }

    const recentTransfers = await this.repos.transfers.findByPlayerId(playerId);

    const transfersInCurrentSeason = recentTransfers.filter(
      (t) => t.seasonId === seasonId
    );

    if (transfersInCurrentSeason.length > 0) {
      return {
        isValid: false,
        errors: [
          `${player.firstName} ${player.lastName} já foi transferido nesta temporada e não pode ser negociado novamente.`,
        ],
      };
    }

    return { isValid: true };
  }

  /**
   * @param teamId - ID do time comprador
   * @param fee - Valor da transferência
   * @returns ValidationResult
   */
  private async validateBuyerBudget(
    teamId: number,
    fee: number
  ): Promise<ValidationResult> {
    this.logger.debug(`Validando orçamento do time ${teamId}...`);

    const team = await this.repos.teams.findById(teamId);
    if (!team) {
      return {
        isValid: false,
        errors: ["Time comprador não encontrado."],
      };
    }

    const currentBudget = team.budget || 0;

    if (currentBudget < fee) {
      return {
        isValid: false,
        errors: [
          `Orçamento insuficiente. Disponível: €${currentBudget.toLocaleString(
            "pt-PT"
          )}, Necessário: €${fee.toLocaleString("pt-PT")}`,
        ],
      };
    }

    const remainingBudget = currentBudget - fee;
    if (remainingBudget < TRANSFER_VALIDATION_CONFIG.BUDGET_WARNING_THRESHOLD) {
      this.logger.warn(
        `Time ${team.shortName} ficará com apenas €${remainingBudget} após esta transferência.`
      );
    }

    return { isValid: true };
  }

  /**
   * @param playerId - ID do jogador
   * @param fromTeamId - ID do time vendedor (0 = agente livre)
   * @returns ValidationResult
   */
  private async validatePlayerOwnership(
    playerId: number,
    fromTeamId: number
  ): Promise<ValidationResult> {
    this.logger.debug(`Validando posse do jogador ${playerId}...`);

    const player = await this.repos.players.findById(playerId);
    if (!player) {
      return {
        isValid: false,
        errors: ["Jogador não encontrado."],
      };
    }

    if (fromTeamId === TRANSFER_VALIDATION_CONFIG.FREE_AGENT_TEAM_ID) {
      if (player.teamId !== null) {
        return {
          isValid: false,
          errors: [
            `${player.firstName} ${player.lastName} não é um agente livre.`,
          ],
        };
      }
      return { isValid: true };
    }

    if (player.teamId !== fromTeamId) {
      return {
        isValid: false,
        errors: [
          `${player.firstName} ${player.lastName} não pertence ao time especificado.`,
        ],
      };
    }

    return { isValid: true };
  }

  /**
   * @param contractLength - Duração do contrato em anos
   * @param transferType - Tipo de transferência (transfer ou loan)
   * @returns ValidationResult
   */
  private validateContractRules(
    contractLength: number,
    transferType: "transfer" | "loan"
  ): ValidationResult {
    this.logger.debug(`Validando regras de contrato...`);

    if (!Number.isInteger(contractLength) || contractLength <= 0) {
      return {
        isValid: false,
        errors: ["A duração do contrato deve ser um número inteiro positivo."],
      };
    }

    if (transferType === "transfer") {
      if (
        contractLength < TRANSFER_VALIDATION_CONFIG.CONTRACT_MIN_YEARS ||
        contractLength > TRANSFER_VALIDATION_CONFIG.CONTRACT_MAX_YEARS
      ) {
        return {
          isValid: false,
          errors: [
            `Contratos permanentes devem ter entre ${TRANSFER_VALIDATION_CONFIG.CONTRACT_MIN_YEARS} e ${TRANSFER_VALIDATION_CONFIG.CONTRACT_MAX_YEARS} anos de duração.`,
          ],
        };
      }
    } else if (transferType === "loan") {
      if (contractLength > TRANSFER_VALIDATION_CONFIG.LOAN_MAX_YEARS) {
        return {
          isValid: false,
          errors: [
            `Empréstimos não podem exceder ${TRANSFER_VALIDATION_CONFIG.LOAN_MAX_YEARS} anos.`,
          ],
        };
      }
    }

    return { isValid: true };
  }

  /**
   * @param playerId - ID do jogador
   * @param wageOffer - Salário anual oferecido
   * @returns ValidationResult
   */
  private async validateWageOffer(
    playerId: number,
    wageOffer: number
  ): Promise<ValidationResult> {
    this.logger.debug(
      `Validando salário oferecido para jogador ${playerId}...`
    );

    const player = await this.repos.players.findById(playerId);
    if (!player) {
      return {
        isValid: false,
        errors: ["Jogador não encontrado."],
      };
    }

    const minWage = player.isYouth
      ? CONTRACT_CONFIG.MIN_WAGE_YOUTH
      : CONTRACT_CONFIG.MIN_WAGE_SENIOR;

    if (wageOffer < minWage) {
      return {
        isValid: false,
        errors: [
          `O salário mínimo para este jogador é €${minWage.toLocaleString(
            "pt-PT"
          )}/ano.`,
        ],
      };
    }

    const maxReasonableWage =
      player.overall * TRANSFER_VALIDATION_CONFIG.MAX_WAGE_HEURISTIC_MULTIPLIER;
    if (wageOffer > maxReasonableWage) {
      this.logger.warn(
        `Salário oferecido (€${wageOffer}) parece excessivamente alto para um jogador OVR ${player.overall}.`
      );
    }

    return { isValid: true };
  }

  /**
   * @param teamId - ID do time comprador
   * @returns ValidationResult
   */
  private async validateSquadLimit(teamId: number): Promise<ValidationResult> {
    this.logger.debug(`Validando limite de elenco do time ${teamId}...`);

    const players = await this.repos.players.findByTeamId(teamId);
    const currentSquadSize = players.length;

    const SQUAD_LIMIT = TRANSFER_VALIDATION_CONFIG.SQUAD_MAX_SIZE;

    if (currentSquadSize >= SQUAD_LIMIT) {
      return {
        isValid: false,
        errors: [
          `O elenco já possui ${currentSquadSize} jogadores. Considere vender ou emprestar jogadores antes de contratar.`,
        ],
      };
    }

    return { isValid: true };
  }

  /**
   * @param teamId - ID do time
   * @returns ValidationResult
   */
  private async validateTransferBan(teamId: number): Promise<ValidationResult> {
    this.logger.debug(`Verificando Transfer Ban do time ${teamId}...`);

    const team = await this.repos.teams.findById(teamId);
    if (!team) {
      return {
        isValid: false,
        errors: ["Time não encontrado."],
      };
    }

    if ((team.budget || 0) < 0) {
      return {
        isValid: false,
        errors: [
          `O clube está sob Transfer Ban devido a dívidas financeiras. Regularize as finanças antes de contratar jogadores.`,
        ],
      };
    }

    return { isValid: true };
  }

  /**
   * @param fee - Valor da transferência
   * @returns ValidationResult
   */
  validateTransferFee(fee: number): ValidationResult {
    if (typeof fee !== "number" || !Number.isFinite(fee)) {
      return {
        isValid: false,
        errors: ["O valor da transferência deve ser um número válido."],
      };
    }

    if (fee < 0) {
      return {
        isValid: false,
        errors: ["O valor da transferência não pode ser negativo."],
      };
    }

    if (fee === 0) {
      this.logger.info("Transferência gratuita detectada.");
    }

    const MAX_REASONABLE_FEE = TRANSFER_VALIDATION_CONFIG.MAX_REASONABLE_FEE;
    if (fee > MAX_REASONABLE_FEE) {
      return {
        isValid: false,
        errors: [
          `O valor da transferência (€${fee.toLocaleString(
            "pt-PT"
          )}) excede limites realistas.`,
        ],
      };
    }

    return { isValid: true };
  }

  /**
   * @param playerId - ID do jogador
   * @param fromTeamId - ID do time vendedor
   * @param toTeamId - ID do time comprador
   * @returns ValidationResult
   */
  async validateNoDuplicateProposal(
    playerId: number,
    fromTeamId: number,
    toTeamId: number
  ): Promise<ValidationResult> {
    this.logger.debug(`Verificando propostas duplicadas...`);

    const existing = await this.repos.transferProposals.findActiveProposal(
      playerId,
      fromTeamId,
      toTeamId
    );

    if (existing) {
      return {
        isValid: false,
        errors: [
          "Já existe uma negociação ativa para este jogador entre estes clubes.",
        ],
      };
    }

    return { isValid: true };
  }

  /**
   * @param playerId - ID do jogador
   * @returns ValidationResult
   */
  async validateLoanEligibility(playerId: number): Promise<ValidationResult> {
    this.logger.debug(
      `Validando elegibilidade para empréstimo do jogador ${playerId}...`
    );

    const player = await this.repos.players.findById(playerId);
    if (!player) {
      return {
        isValid: false,
        errors: ["Jogador não encontrado."],
      };
    }

    // Verificar se o jogador já está emprestado
    // Implementação depende de ter um campo "onLoan" no schema ou verificar contratos ativos de empréstimo
    // Por simplicidade, assume-se que se há contrato ativo do tipo "loan", ele está emprestado

    // Esta verificação pode ser expandida conforme a modelagem de contratos

    return { isValid: true };
  }

  /**
   * @param context - Contexto da transferência
   * @returns ServiceResult com o resultado consolidado
   */
  async validateAll(
    context: TransferValidationContext
  ): Promise<ServiceResult<boolean>> {
    const result = await this.validateTransfer(context);

    if (Result.isFailure(result)) {
      return Result.fail("Erro ao validar transferência.");
    }

    const validation = result.data;

    if (!validation.isValid) {
      const errorMessage = validation.errors.join(" | ");
      return Result.businessRule(errorMessage);
    }

    if (validation.warnings.length > 0) {
      this.logger.warn("Avisos detectados:", validation.warnings);
    }

    return Result.success(true, "Transferência validada com sucesso.");
  }
}
