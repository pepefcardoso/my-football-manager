import { BaseService } from "./BaseService";
import type { IRepositoryContainer } from "../repositories/IRepositories";
import type { ServiceResult } from "./types/ServiceResults";

export class MarketingService extends BaseService {
  constructor(repositories: IRepositoryContainer) {
    super(repositories, "MarketingService");
  }

  async updateFanSatisfactionAfterMatch(
    teamId: number,
    result: "win" | "draw" | "loss",
    isHomeGame: boolean,
    opponentReputation: number,
    ticketPrice: number = 50
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

        const currentSatisfaction = team.fanSatisfaction || 50;
        const teamReputation = team.reputation || 0;

        let change = 0;
        const reputationDiff = opponentReputation - teamReputation;

        if (result === "win") {
          change = 2 + Math.max(0, reputationDiff / 1000);
          if (isHomeGame) change += 1;
        } else if (result === "loss") {
          change = -3;
          if (reputationDiff > 2000) change += 1;
          if (isHomeGame) change -= 1;
        } else {
          if (reputationDiff > 500) change = 1;
          else if (reputationDiff < -500) change = -2;
          else change = 0;
        }

        if (isHomeGame) {
          const fairPrice = 50;
          const reputationTolerance = teamReputation / 1000;
          const adjustedFairPrice = fairPrice + reputationTolerance * 5;

          if (ticketPrice > adjustedFairPrice * 1.5) {
            change -= 2;
            this.logger.info(
              "📉 Penalidade aplicada: Preço do ingresso muito alto."
            );
          } else if (ticketPrice < adjustedFairPrice * 0.5) {
            change += 1;
            this.logger.info("📈 Bônus aplicado: Preço popular.");
          }
        }

        change = Math.max(-5, Math.min(5, Math.round(change)));

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

        const currentSatisfaction = team.fanSatisfaction || 50;
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
      return team?.fanSatisfaction || 50;
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

        const fairPrice = 50;
        const reputationTolerance = (team.reputation || 0) / 1000;
        const adjustedFairPrice = fairPrice + reputationTolerance * 5;

        if (proposedPrice > adjustedFairPrice * 1.5) {
          return {
            impact: -2,
            message: "Preço muito alto - torcida insatisfeita",
          };
        } else if (proposedPrice < adjustedFairPrice * 0.5) {
          return {
            impact: 1,
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
