import { BaseService } from "../BaseService";
import type { IRepositoryContainer } from "../../repositories/IRepositories";
import type { ServiceResult } from "../types/ServiceResults";
import { Result } from "../types/ServiceResults";
import { Position } from "../../domain/enums";
import type { Player } from "../../domain/models";
import { getBalanceValue } from "../../engine/GameBalanceConfig";

interface PlayerWithContractInfo extends Player {
  salary: number | undefined;
  contractEnd: string | null | undefined;
}

export interface SquadNeed {
  position: Position;
  priority: "critical" | "high" | "medium" | "low";
  reason: string;
  minOverall: number;
  maxAge: number;
  maxWage: number;
}

export interface SquadAnalysis {
  teamId: number;
  totalPlayers: number;
  averageAge: number;
  averageOverall: number;
  teamStrength: number;
  positionCounts: Record<Position, number>;
  needs: SquadNeed[];
  surplus: Position[];
  budget: number;
  wageRoomAvailable: number;
}

export interface PlayerFitEvaluation {
  playerId: number;
  needIndex: number;
  fitScore: number;
  reasons: string[];
  isGoodFit: boolean;
}

const BALANCE_CONFIG = getBalanceValue("SQUAD_ANALYSIS");

export class SquadAnalysisService extends BaseService {
  constructor(repositories: IRepositoryContainer) {
    super(repositories, "SquadAnalysisService");
  }

  /**
   * Analisa o elenco completo de um time e identifica necessidades.
   *
   * @param teamId - ID do time a ser analisado
   * @returns Análise completa do elenco com necessidades priorizadas
   */
  async analyzeSquad(teamId: number): Promise<ServiceResult<SquadAnalysis>> {
    return this.execute("analyzeSquad", teamId, async (teamId) => {
      this.logger.info(`🔍 Iniciando análise de elenco do time ${teamId}...`);

      const team = await this.repos.teams.findById(teamId);
      if (!team) {
        throw new Error(`Time ${teamId} não encontrado.`);
      }

      const players = await this.repos.players.findByTeamId(teamId);

      if (players.length === 0) {
        this.logger.warn(`Time ${teamId} não possui jogadores no elenco.`);
        return this.createEmptyAnalysis(teamId, team.budget || 0);
      }

      const positionCounts = this.countPlayersByPosition(players);

      const averageAge = this.calculateAverageAge(players);
      const averageOverall = this.calculateAverageOverall(players);
      const teamStrength = this.calculateTeamStrength(players);

      const wageRoomAvailable = await this.calculateWageRoom(teamId);

      const needs = this.identifyNeeds(
        positionCounts,
        players,
        averageOverall,
        team.budget || 0,
        wageRoomAvailable
      );

      const surplus = this.identifySurplus(positionCounts);

      this.logger.info(
        `✅ Análise concluída: ${needs.length} necessidade(s), ${surplus.length} excesso(s)`
      );

      return {
        teamId,
        totalPlayers: players.length,
        averageAge,
        averageOverall,
        teamStrength,
        positionCounts,
        needs,
        surplus,
        budget: team.budget || 0,
        wageRoomAvailable,
      };
    });
  }

  /**
   * Avalia se um jogador específico serve para preencher uma necessidade do time.
   *
   * @param playerId - ID do jogador candidato
   * @param teamId - ID do time que possui a necessidade
   * @returns Avaliação de fit do jogador para as necessidades do time
   */
  async evaluatePlayerFit(
    playerId: number,
    teamId: number
  ): Promise<ServiceResult<PlayerFitEvaluation[]>> {
    return this.execute(
      "evaluatePlayerFit",
      { playerId, teamId },
      async ({ playerId, teamId }) => {
        this.logger.debug(
          `🎯 Avaliando fit do jogador ${playerId} para time ${teamId}...`
        );

        const player = await this.repos.players.findById(playerId);
        if (!player) {
          throw new Error(`Jogador ${playerId} não encontrado.`);
        }

        const analysisResult = await this.analyzeSquad(teamId);
        if (Result.isFailure(analysisResult)) {
          throw new Error(analysisResult.error.message);
        }

        const analysis = analysisResult.data;

        if (analysis.needs.length === 0) {
          this.logger.info(
            `Time ${teamId} não possui necessidades no momento.`
          );
          return [];
        }

        const evaluations: PlayerFitEvaluation[] = [];

        analysis.needs.forEach((need, index) => {
          const fitScore = this.calculateFitScore(player, need, analysis);
          const reasons = this.generateFitReasons(player, need, fitScore);

          evaluations.push({
            playerId,
            needIndex: index,
            fitScore,
            reasons,
            isGoodFit: fitScore >= BALANCE_CONFIG.FIT_SCORE_GOOD,
          });
        });

        evaluations.sort((a, b) => b.fitScore - a.fitScore);

        this.logger.debug(
          `Jogador ${player.firstName} ${player.lastName}: Melhor fit = ${
            evaluations[0]?.fitScore || 0
          }`
        );

        return evaluations;
      }
    );
  }

  /**
   * Identifica jogadores do próprio elenco que estão em posições excedentes.
   * Útil para a IA decidir quem vender.
   *
   * @param teamId - ID do time
   * @returns Lista de jogadores que podem ser vendidos
   */
  async identifySellablePlayers(
    teamId: number
  ): Promise<ServiceResult<Player[]>> {
    return this.execute("identifySellablePlayers", teamId, async (teamId) => {
      this.logger.info(
        `🏷️ Identificando jogadores vendáveis do time ${teamId}...`
      );

      const analysisResult = await this.analyzeSquad(teamId);
      if (Result.isFailure(analysisResult)) {
        throw new Error(analysisResult.error.message);
      }

      const analysis = analysisResult.data;

      if (analysis.surplus.length === 0) {
        this.logger.info(`Time ${teamId} não possui excedentes.`);
        return [];
      }

      const players = await this.repos.players.findByTeamId(teamId);

      const sellablePlayers = players.filter((player) => {
        const position = player.position as Position;
        const isInSurplusPosition = analysis.surplus.includes(position);

        if (!isInSurplusPosition) return false;

        const isBelowTeamAverage =
          player.overall <
          analysis.averageOverall - BALANCE_CONFIG.SELL_OVR_PENALTY;
        const isOld = player.age > BALANCE_CONFIG.AGE_THRESHOLD_VETERAN;
        const isExpiring = this.isContractExpiring(player);

        return isBelowTeamAverage || isOld || isExpiring;
      });

      sellablePlayers.sort((a, b) => {
        const scoreA = this.calculateSellPriority(a, analysis);
        const scoreB = this.calculateSellPriority(b, analysis);
        return scoreB - scoreA;
      });

      this.logger.info(
        `🏷️ ${sellablePlayers.length} jogadores vendáveis identificados.`
      );

      return sellablePlayers;
    });
  }

  /**
   * Verifica se há orçamento e espaço salarial para uma contratação.
   *
   * @param teamId - ID do time
   * @param estimatedFee - Valor estimado da transferência
   * @param estimatedWage - Salário anual estimado
   * @returns Booleano indicando viabilidade financeira
   */
  async canAffordPlayer(
    teamId: number,
    estimatedFee: number,
    estimatedWage: number
  ): Promise<ServiceResult<boolean>> {
    return this.execute(
      "canAffordPlayer",
      { teamId, estimatedFee, estimatedWage },
      async ({ teamId, estimatedFee, estimatedWage }) => {
        const team = await this.repos.teams.findById(teamId);
        if (!team) throw new Error(`Time ${teamId} não encontrado.`);

        const budget = team.budget || 0;

        if (budget < estimatedFee) {
          this.logger.debug(
            `Time ${teamId} não tem orçamento suficiente (€${budget} < €${estimatedFee})`
          );
          return false;
        }

        const wageRoomAvailable = await this.calculateWageRoom(teamId);

        const monthlyWage = estimatedWage / BALANCE_CONFIG.MONTHS_IN_YEAR;

        if (wageRoomAvailable < monthlyWage) {
          this.logger.debug(
            `Time ${teamId} não tem espaço salarial (€${wageRoomAvailable} < €${monthlyWage})`
          );
          return false;
        }

        return true;
      }
    );
  }

  private createEmptyAnalysis(teamId: number, budget: number): SquadAnalysis {
    const defaultMaxWage =
      budget * BALANCE_CONFIG.EMPTY_ANALYSIS_MAX_WAGE_RATIO;
    const defaultMaxAge = BALANCE_CONFIG.EMPTY_ANALYSIS_MAX_AGE;
    const minBaseOVR = BALANCE_CONFIG.MIN_BASE_OVR;

    return {
      teamId,
      totalPlayers: 0,
      averageAge: 0,
      averageOverall: 0,
      teamStrength: 0,
      positionCounts: {
        [Position.GK]: 0,
        [Position.DF]: 0,
        [Position.MF]: 0,
        [Position.FW]: 0,
      },
      needs: [
        {
          position: Position.GK,
          priority: "critical",
          reason: "Elenco vazio - Precisa de goleiro urgentemente",
          minOverall: minBaseOVR,
          maxAge: defaultMaxAge,
          maxWage: defaultMaxWage,
        },
        {
          position: Position.DF,
          priority: "critical",
          reason: "Elenco vazio - Precisa de defensores urgentemente",
          minOverall: minBaseOVR,
          maxAge: defaultMaxAge,
          maxWage: defaultMaxWage,
        },
        {
          position: Position.MF,
          priority: "critical",
          reason: "Elenco vazio - Precisa de meio-campistas urgentemente",
          minOverall: minBaseOVR,
          maxAge: defaultMaxAge,
          maxWage: defaultMaxWage,
        },
        {
          position: Position.FW,
          priority: "critical",
          reason: "Elenco vazio - Precisa de atacantes urgentemente",
          minOverall: minBaseOVR,
          maxAge: defaultMaxAge,
          maxWage: defaultMaxWage,
        },
      ],
      surplus: [],
      budget,
      wageRoomAvailable: budget * BALANCE_CONFIG.EMPTY_ANALYSIS_WAGEROOM_RATIO,
    };
  }

  private countPlayersByPosition(players: Player[]): Record<Position, number> {
    const counts: Record<Position, number> = {
      [Position.GK]: 0,
      [Position.DF]: 0,
      [Position.MF]: 0,
      [Position.FW]: 0,
    };

    players.forEach((player) => {
      const position = player.position as Position;
      if (position in counts) {
        counts[position]++;
      }
    });

    return counts;
  }

  private calculateAverageAge(players: Player[]): number {
    const sum = players.reduce((acc, p) => acc + p.age, 0);
    return Math.round(sum / players.length);
  }

  private calculateAverageOverall(players: Player[]): number {
    const sum = players.reduce((acc, p) => acc + p.overall, 0);
    return Math.round(sum / players.length);
  }

  private calculateTeamStrength(players: Player[]): number {
    const top11 = [...players]
      .sort((a, b) => b.overall - a.overall)
      .slice(0, BALANCE_CONFIG.TOP_PLAYERS_COUNT);

    if (top11.length === 0) return 0;

    const sum = top11.reduce((acc, p) => acc + p.overall, 0);
    return Math.round(sum / top11.length);
  }

  /**
   * DOCUMENTAÇÃO: Calcula o "espaço salarial" disponível para contratações.
   * Assume que o limite mensal de salários é MAX_WAGE_RATIO do orçamento total do clube.
   * @param teamId ID do time
   * @returns O valor em moeda do espaço salarial mensal restante.
   */
  private async calculateWageRoom(teamId: number): Promise<number> {
    const team = await this.repos.teams.findById(teamId);
    if (!team) return 0;

    const budget = team.budget || 0;

    const maxMonthlyWages = budget * BALANCE_CONFIG.MAX_WAGE_RATIO;

    const players = (await this.repos.players.findByTeamId(
      teamId
    )) as PlayerWithContractInfo[];

    let currentMonthlyWages = 0;
    const monthsInYear = BALANCE_CONFIG.MONTHS_IN_YEAR;

    for (const player of players) {
      const annualWage = player.salary || 0;
      currentMonthlyWages += annualWage / monthsInYear;
    }

    const staffMembers = await this.repos.staff.findByTeamId(teamId);
    const staffAnnualWages = staffMembers.reduce(
      (sum, s) => sum + (s.salary || 0),
      0
    );
    currentMonthlyWages += staffAnnualWages / monthsInYear;

    const roundedCurrentMonthlyWages = Math.round(currentMonthlyWages);

    return Math.max(0, maxMonthlyWages - roundedCurrentMonthlyWages);
  }

  private identifyNeeds(
    positionCounts: Record<Position, number>,
    players: Player[],
    averageOverall: number,
    _budget: number,
    wageRoom: number
  ): SquadNeed[] {
    const needs: SquadNeed[] = [];

    const positions = Object.values(Position);
    const maxWageBase = wageRoom;

    positions.forEach((position) => {
      const count = positionCounts[position];
      const minRequired = BALANCE_CONFIG.MIN_PLAYERS_PER_POSITION[position];
      const optimal = BALANCE_CONFIG.OPTIMAL_PLAYERS_PER_POSITION[position];

      if (count <= BALANCE_CONFIG.CRITICAL_THRESHOLD) {
        needs.push({
          position,
          priority: "critical",
          reason: `Apenas ${count} jogador(es) na posição. Risco de não poder escalar time.`,
          minOverall: Math.max(
            BALANCE_CONFIG.MIN_BASE_OVR,
            averageOverall - BALANCE_CONFIG.CRITICAL_OVR_PENALTY
          ),
          maxAge: BALANCE_CONFIG.CRITICAL_MAX_AGE,
          maxWage: maxWageBase * BALANCE_CONFIG.CRITICAL_WAGE_RATIO,
        });
      } else if (count < minRequired) {
        needs.push({
          position,
          priority: "high",
          reason: `Elenco curto na posição (${count}/${minRequired}). Precisa reforçar.`,
          minOverall: Math.max(
            BALANCE_CONFIG.MIN_BASE_OVR,
            averageOverall - BALANCE_CONFIG.HIGH_OVR_PENALTY
          ),
          maxAge: BALANCE_CONFIG.HIGH_MAX_AGE,
          maxWage: maxWageBase * BALANCE_CONFIG.HIGH_WAGE_RATIO,
        });
      } else if (count < optimal) {
        const qualityGap = this.checkQualityGap(
          players,
          position,
          averageOverall
        );
        if (
          qualityGap &&
          qualityGap.gap >= BALANCE_CONFIG.OVERALL_GAP_THRESHOLD
        ) {
          needs.push({
            position,
            priority: "medium",
            reason: `Elenco numericamente OK, mas falta qualidade de elite. Melhor jogador OVR: ${qualityGap.bestOverall}`,
            minOverall: averageOverall + BALANCE_CONFIG.MEDIUM_OVR_BONUS,
            maxAge: BALANCE_CONFIG.MEDIUM_MAX_AGE,
            maxWage: maxWageBase * BALANCE_CONFIG.MEDIUM_WAGE_RATIO,
          });
        }
      }
    });

    const veteranRatio = this.calculateVeteranRatio(players);
    if (veteranRatio > BALANCE_CONFIG.VETERAN_RATIO_WARNING) {
      const isAgingNeedPresent = needs.some(
        (n) => n.maxAge < BALANCE_CONFIG.AGE_THRESHOLD_VETERAN
      );
      if (!isAgingNeedPresent) {
        needs.push({
          position: Position.MF,
          priority: "high",
          reason: `Time muito envelhecido (${(veteranRatio * 100).toFixed(
            0
          )}% > ${
            BALANCE_CONFIG.AGE_THRESHOLD_VETERAN
          } anos). Necessidade de rejuvenescer o elenco.`,
          minOverall: Math.max(BALANCE_CONFIG.MIN_BASE_OVR, averageOverall),
          maxAge: BALANCE_CONFIG.AGE_THRESHOLD_YOUNG,
          maxWage: maxWageBase * BALANCE_CONFIG.HIGH_WAGE_RATIO,
        });
      }
    }

    needs.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    return needs;
  }

  private checkQualityGap(
    players: Player[],
    position: Position,
    teamAverage: number
  ): { bestOverall: number; gap: number } | null {
    const positionPlayers = players.filter(
      (p) => p.position === position && !p.isInjured
    );

    if (positionPlayers.length === 0) return null;

    const bestPlayer = positionPlayers.reduce((prev, current) =>
      current.overall > prev.overall ? current : prev
    );

    const gap = teamAverage - bestPlayer.overall;

    if (gap > BALANCE_CONFIG.OVERALL_GAP_THRESHOLD) {
      return { bestOverall: bestPlayer.overall, gap };
    }

    return null;
  }

  private calculateVeteranRatio(players: Player[]): number {
    const veterans = players.filter(
      (p) => p.age >= BALANCE_CONFIG.AGE_THRESHOLD_VETERAN
    );
    return veterans.length / players.length;
  }

  private identifySurplus(
    positionCounts: Record<Position, number>
  ): Position[] {
    const surplus: Position[] = [];

    Object.entries(positionCounts).forEach(([pos, count]) => {
      const position = pos as Position;
      const max = BALANCE_CONFIG.MAX_PLAYERS_PER_POSITION[position];

      if (count > max) {
        surplus.push(position);
      }
    });

    return surplus;
  }

  private calculateFitScore(
    player: Player,
    need: SquadNeed,
    analysis: SquadAnalysis
  ): number {
    let score = 0;
    const { AGE_THRESHOLD_YOUNG, CONDITION_MIN_OVR } = BALANCE_CONFIG;

    if (player.position !== need.position) {
      return 0;
    }

    const overallDiff = player.overall - need.minOverall;
    if (overallDiff >= BALANCE_CONFIG.OVR_FIT_EXCELLENT_BONUS) {
      score += BALANCE_CONFIG.OVR_FIT_EXCELLENT_SCORE;
    } else if (overallDiff >= BALANCE_CONFIG.OVR_FIT_GOOD_BONUS) {
      score += BALANCE_CONFIG.OVR_FIT_GOOD_SCORE;
    } else if (overallDiff >= BALANCE_CONFIG.OVR_FIT_ACCEPTABLE_BONUS) {
      score += BALANCE_CONFIG.OVR_FIT_ACCEPTABLE_SCORE;
    } else {
      return 0;
    }

    if (player.age <= AGE_THRESHOLD_YOUNG) {
      score += BALANCE_CONFIG.AGE_FIT_YOUNG_SCORE;
      if (
        player.potential >
        player.overall + BALANCE_CONFIG.POTENTIAL_GAP_BONUS
      ) {
        score += BALANCE_CONFIG.POTENTIAL_FIT_SCORE;
      }
    } else if (player.age <= need.maxAge) {
      score += BALANCE_CONFIG.AGE_FIT_ACCEPTABLE_SCORE;
    } else {
      score -= BALANCE_CONFIG.AGE_FIT_PENALTY;
    }

    if (player.overall > analysis.averageOverall) {
      score += BALANCE_CONFIG.OVR_AVG_BONUS;
    }

    if (
      !player.isInjured &&
      player.energy > CONDITION_MIN_OVR &&
      player.fitness > CONDITION_MIN_OVR
    ) {
      score += BALANCE_CONFIG.CONDITION_FIT_BONUS;
    } else {
      score -= BALANCE_CONFIG.CONDITION_FIT_PENALTY;
    }

    return Math.max(0, Math.min(100, score));
  }

  private generateFitReasons(
    player: Player,
    need: SquadNeed,
    fitScore: number
  ): string[] {
    const reasons: string[] = [];
    const {
      FIT_SCORE_EXCELLENT,
      FIT_SCORE_GOOD,
      FIT_SCORE_ACCEPTABLE,
      AGE_THRESHOLD_YOUNG,
      CONDITION_MIN_OVR,
    } = BALANCE_CONFIG;

    if (player.position !== need.position) {
      reasons.push(
        `Posição incompatível (${player.position} vs ${need.position})`
      );
      return reasons;
    }

    if (fitScore >= FIT_SCORE_EXCELLENT) {
      reasons.push("✅ Encaixe excelente para a necessidade");
    } else if (fitScore >= FIT_SCORE_GOOD) {
      reasons.push("✅ Bom encaixe para a necessidade");
    } else if (fitScore >= FIT_SCORE_ACCEPTABLE) {
      reasons.push("⚠️ Encaixe aceitável, mas não ideal");
    } else {
      reasons.push("❌ Encaixe fraco para a necessidade");
    }

    if (
      player.overall >=
      need.minOverall + BALANCE_CONFIG.OVR_FIT_EXCELLENT_BONUS
    ) {
      reasons.push(`Qualidade superior ao necessário (OVR ${player.overall})`);
    } else if (player.overall >= need.minOverall) {
      reasons.push(`Atende requisitos de qualidade (OVR ${player.overall})`);
    } else {
      reasons.push(
        `Qualidade abaixo do esperado (OVR ${player.overall} < ${need.minOverall})`
      );
    }

    if (player.age <= AGE_THRESHOLD_YOUNG) {
      reasons.push(
        `Jovem promissor (${player.age} anos) com potencial de desenvolvimento.`
      );
    } else if (player.age > need.maxAge) {
      reasons.push(
        `Idade (${player.age} anos) acima do ideal para esta lacuna.`
      );
    }

    if (player.isInjured) {
      reasons.push(
        `⚠️ Atualmente lesionado (${player.injuryDaysRemaining} dias restantes).`
      );
    } else if (
      player.energy <= CONDITION_MIN_OVR ||
      player.fitness <= CONDITION_MIN_OVR
    ) {
      reasons.push("⚠️ Condição física ou energia baixa.");
    }

    return reasons;
  }

  private calculateSellPriority(
    player: Player,
    analysis: SquadAnalysis
  ): number {
    let priority = 0;

    const overallDiff = analysis.averageOverall - player.overall;
    priority += overallDiff * BALANCE_CONFIG.SELL_OVR_WEIGHT;

    const agePenalty = Math.max(
      0,
      player.age - BALANCE_CONFIG.AGE_THRESHOLD_VETERAN
    );
    priority += agePenalty * BALANCE_CONFIG.SELL_AGE_WEIGHT;

    if (this.isContractExpiring(player)) {
      priority += BALANCE_CONFIG.SELL_EXPIRING_BONUS;
    }

    if (player.isInjured) {
      priority += BALANCE_CONFIG.SELL_INJURED_BONUS;
    }

    return priority;
  }

  /**
   * DOCUMENTAÇÃO: Verifica se o contrato de um jogador está a expirar (6 meses ou menos).
   * Utilizado pela IA para decidir quem vender antes de sair de graça.
   * @param player O objeto Player a ser verificado.
   * @returns true se o contrato estiver expirando, false caso contrário.
   */
  private isContractExpiring(player: Player): boolean {
    const playerWithContract = player as PlayerWithContractInfo;

    if (!playerWithContract.contractEnd) return false;

    const SIX_MONTHS_IN_DAYS = BALANCE_CONFIG.CONTRACT_EXPIRING_DAYS;
    const currentDate = new Date();
    const expirationDate = new Date(playerWithContract.contractEnd);

    const timeDifference = expirationDate.getTime() - currentDate.getTime();

    const dayDifference = Math.ceil(timeDifference / (1000 * 3600 * 24));

    return dayDifference <= SIX_MONTHS_IN_DAYS && dayDifference >= 0;
  }
}
