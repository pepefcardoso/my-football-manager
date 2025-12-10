import { Logger } from "../lib/Logger";
import type { IRepositoryContainer } from "../repositories/IRepositories";

export class MarketingService {
  private readonly logger: Logger;
  private readonly repos: IRepositoryContainer;

  constructor(repositories: IRepositoryContainer) {
    this.repos = repositories;
    this.logger = new Logger("MarketingService");
  }

  async updateFanSatisfactionAfterMatch(
    teamId: number,
    result: "win" | "draw" | "loss",
    isHomeGame: boolean,
    opponentReputation: number,
    ticketPrice: number = 50
  ): Promise<void> {
    this.logger.debug(
      `Atualizando satisfação da torcida para time ${teamId}. Resultado: ${result}`
    );

    try {
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
    } catch (error) {
      this.logger.error("Erro ao atualizar satisfação da torcida:", error);
    }
  }

  async updateFanSatisfaction(
    teamId: number,
    change: number,
    reason: string
  ): Promise<void> {
    this.logger.debug(
      `Aplicando mudança manual de satisfação: ${change} (${reason})`
    );

    try {
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
    } catch (error) {
      this.logger.error("Erro ao atualizar satisfação da torcida:", error);
    }
  }

  async getFanSatisfaction(teamId: number): Promise<number> {
    try {
      const team = await this.repos.teams.findById(teamId);
      return team?.fanSatisfaction || 50;
    } catch (error) {
      this.logger.error("Erro ao buscar satisfação da torcida:", error);
      return 50;
    }
  }

  async calculateTicketPriceImpact(
    teamId: number,
    proposedPrice: number
  ): Promise<{
    impact: number;
    message: string;
  }> {
    try {
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
    } catch (error) {
      this.logger.error("Erro ao calcular impacto do preço:", error);
      return { impact: 0, message: "Erro ao calcular" };
    }
  }
}
