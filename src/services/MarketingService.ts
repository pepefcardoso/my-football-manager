import { BaseService } from "./BaseService";
import type { IRepositoryContainer } from "../repositories/IRepositories";
import type { ServiceResult } from "../domain/ServiceResults";
import { getBalanceValue } from "../engine/GameBalanceConfig";

const MARKETING_CONFIG = getBalanceValue("MARKETING");
const FAN_SATISFACTION = MARKETING_CONFIG.FAN_SATISFACTION;
const TICKET_PRICING = MARKETING_CONFIG.TICKET_PRICING;

export class MarketingService extends BaseService {
  constructor(repositories: IRepositoryContainer) {
    super(repositories, "MarketingService");
  }

  async processMatchResult(
    matchId: number,
    homeScore: number,
    awayScore: number
  ): Promise<ServiceResult<void>> {
    return this.executeVoid(
      "processMatchResult",
      { matchId, homeScore, awayScore },
      async ({ matchId, homeScore, awayScore }) => {
        const match = await this.repos.matches.findById(matchId);
        if (!match || !match.homeTeamId || !match.awayTeamId) return;

        const homeTeam = await this.repos.teams.findById(match.homeTeamId);
        const awayTeam = await this.repos.teams.findById(match.awayTeamId);

        if (!homeTeam || !awayTeam) return;

        const homeResult =
          homeScore > awayScore
            ? "win"
            : homeScore === awayScore
            ? "draw"
            : "loss";
        const awayResult =
          awayScore > homeScore
            ? "win"
            : awayScore === homeScore
            ? "draw"
            : "loss";

        await this.updateFanSatisfactionAfterMatch(
          homeTeam.id,
          homeResult,
          true,
          awayTeam.reputation,
          TICKET_PRICING.BASE_FAIR_PRICE
        );

        await this.updateFanSatisfactionAfterMatch(
          awayTeam.id,
          awayResult,
          false,
          homeTeam.reputation
        );
      }
    );
  }

  async updateFanSatisfactionAfterMatch(
    teamId: number,
    result: "win" | "draw" | "loss",
    isHomeGame: boolean,
    opponentReputation: number,
    ticketPrice: number = TICKET_PRICING.BASE_FAIR_PRICE
  ): Promise<ServiceResult<void>> {
    return this.executeVoid(
      "updateFanSatisfactionAfterMatch",
      { teamId, result, isHomeGame, opponentReputation, ticketPrice },
      async ({
        teamId,
        result,
        isHomeGame,
        opponentReputation,
        ticketPrice,
      }) => {
        this.logger.debug(
          `Atualizando satisfação da torcida para time ${teamId}. Resultado: ${result}`
        );

        const team = await this.repos.teams.findById(teamId);
        if (!team) {
          this.logger.warn(
            `Time ${teamId} não encontrado para atualização de marketing.`
          );
          return;
        }

        const currentSatisfaction =
          team.fanSatisfaction || TICKET_PRICING.BASE_FAIR_PRICE;
        const teamReputation = team.reputation || 0;

        let change: number = FAN_SATISFACTION.DRAW_NEUTRAL;
        const reputationDiff = opponentReputation - teamReputation;

        if (result === "win") {
          change =
            FAN_SATISFACTION.WIN_BASE_GAIN +
            Math.max(
              0,
              reputationDiff / FAN_SATISFACTION.REPUTATION_BONUS_DIVISOR
            );
          if (isHomeGame) change += FAN_SATISFACTION.HOME_WIN_BONUS;
        } else if (result === "loss") {
          change = FAN_SATISFACTION.LOSS_BASE_PENALTY;
          if (reputationDiff > FAN_SATISFACTION.BIG_UPSET_THRESHOLD)
            change += FAN_SATISFACTION.UPSET_LOSS_MITIGATION;
          if (isHomeGame) change += FAN_SATISFACTION.HOME_LOSS_EXTRA_PENALTY;
        } else {
          if (reputationDiff > FAN_SATISFACTION.DRAW_VS_STRONGER_THRESHOLD)
            change = FAN_SATISFACTION.DRAW_VS_STRONGER_GAIN;
          else if (reputationDiff < FAN_SATISFACTION.DRAW_VS_WEAKER_THRESHOLD)
            change = FAN_SATISFACTION.DRAW_VS_WEAKER_PENALTY;
          else change = FAN_SATISFACTION.DRAW_NEUTRAL;
        }

        if (isHomeGame) {
          const adjustedFairPrice =
            TICKET_PRICING.BASE_FAIR_PRICE +
            (teamReputation / TICKET_PRICING.REPUTATION_TOLERANCE_DIVISOR) *
              TICKET_PRICING.REPUTATION_PRICE_MULTIPLIER;

          if (
            ticketPrice >
            adjustedFairPrice * TICKET_PRICING.HIGH_PRICE_THRESHOLD
          ) {
            change += TICKET_PRICING.HIGH_PRICE_PENALTY;
            this.logger.info(
              "📉 Penalidade aplicada: Preço do ingresso muito alto."
            );
          } else if (
            ticketPrice <
            adjustedFairPrice * TICKET_PRICING.LOW_PRICE_THRESHOLD
          ) {
            change += TICKET_PRICING.LOW_PRICE_BONUS;
            this.logger.info("📈 Bônus aplicado: Preço popular.");
          }
        }

        change = Math.max(
          -FAN_SATISFACTION.MAX_CHANGE_PER_MATCH,
          Math.min(FAN_SATISFACTION.MAX_CHANGE_PER_MATCH, Math.round(change))
        );

        const newSatisfaction = Math.max(
          0,
          Math.min(100, currentSatisfaction + change)
        );

        if (newSatisfaction !== currentSatisfaction) {
          await this.repos.teams.update(teamId, {
            fanSatisfaction: newSatisfaction,
          });

          const symbol = change > 0 ? "+" : "";
          this.logger.info(
            `Satisfação da torcida atualizada: ${currentSatisfaction}% ➡️ ${newSatisfaction}% (${symbol}${change})`
          );
        }
      }
    );
  }

  async updateFanSatisfaction(
    teamId: number,
    change: number,
    reason: string
  ): Promise<ServiceResult<void>> {
    return this.executeVoid(
      "updateFanSatisfaction",
      { teamId, change, reason },
      async ({ teamId, change, reason }) => {
        this.logger.debug(
          `Aplicando mudança manual de satisfação: ${change} (${reason})`
        );

        const team = await this.repos.teams.findById(teamId);
        if (!team) {
          this.logger.warn(`Time ${teamId} não encontrado.`);
          return;
        }

        const currentSatisfaction =
          team.fanSatisfaction || TICKET_PRICING.BASE_FAIR_PRICE;
        const newSatisfaction = Math.max(
          0,
          Math.min(100, currentSatisfaction + change)
        );

        if (newSatisfaction !== currentSatisfaction) {
          await this.repos.teams.update(teamId, {
            fanSatisfaction: newSatisfaction,
          });

          const symbol = change > 0 ? "+" : "";
          this.logger.info(
            `Satisfação atualizada (${reason}): ${currentSatisfaction}% ➡️ ${newSatisfaction}% (${symbol}${change})`
          );
        }
      }
    );
  }

  async getFanSatisfaction(teamId: number): Promise<ServiceResult<number>> {
    return this.execute("getFanSatisfaction", teamId, async (teamId) => {
      const team = await this.repos.teams.findById(teamId);
      return team?.fanSatisfaction || TICKET_PRICING.BASE_FAIR_PRICE;
    });
  }

  async calculateTicketPriceImpact(
    teamId: number,
    proposedPrice: number
  ): Promise<ServiceResult<{ impact: number; message: string }>> {
    return this.execute(
      "calculateTicketPriceImpact",
      { teamId, proposedPrice },
      async ({ teamId, proposedPrice }) => {
        const team = await this.repos.teams.findById(teamId);
        if (!team) {
          return { impact: 0, message: "Time não encontrado" };
        }

        const teamReputation = team.reputation || 0;

        const adjustedFairPrice =
          TICKET_PRICING.BASE_FAIR_PRICE +
          (teamReputation / TICKET_PRICING.REPUTATION_TOLERANCE_DIVISOR) *
            TICKET_PRICING.REPUTATION_PRICE_MULTIPLIER;

        if (
          proposedPrice >
          adjustedFairPrice * TICKET_PRICING.HIGH_PRICE_THRESHOLD
        ) {
          return {
            impact: TICKET_PRICING.HIGH_PRICE_PENALTY,
            message: "Preço muito alto - torcida insatisfeita",
          };
        } else if (
          proposedPrice <
          adjustedFairPrice * TICKET_PRICING.LOW_PRICE_THRESHOLD
        ) {
          return {
            impact: TICKET_PRICING.LOW_PRICE_BONUS,
            message: "Preço popular - torcida satisfeita",
          };
        }

        return {
          impact: 0,
          message: "Preço equilibrado",
        };
      }
    );
  }
}
