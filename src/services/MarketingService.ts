import { Logger } from "../lib/Logger";
import { teamRepository } from "../repositories/TeamRepository";

const logger = new Logger("MarketingService");

export class MarketingService {
  /**
   * Atualiza a satisfação da torcida após uma partida
   */
  async updateFanSatisfactionAfterMatch(
    teamId: number,
    result: "win" | "draw" | "loss",
    isHomeGame: boolean,
    opponentReputation: number,
    ticketPrice: number = 50
  ): Promise<void> {
    const team = await teamRepository.findById(teamId);
    if (!team) return;

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
        logger.info(
          "Penalidade de satisfação por preço alto de ingresso applied."
        );
      } else if (ticketPrice < adjustedFairPrice * 0.5) {
        change += 1;
        logger.info("Bônus de satisfação por preço popular applied.");
      }
    }

    change = Math.max(-5, Math.min(5, Math.round(change)));

    const newSatisfaction = Math.max(
      0,
      Math.min(100, currentSatisfaction + change)
    );

    if (newSatisfaction !== currentSatisfaction) {
      await teamRepository.update(teamId, { fanSatisfaction: newSatisfaction });
    }
  }
}

export const marketingService = new MarketingService();
