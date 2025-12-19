import { BaseService } from "../BaseService";
import type { IRepositoryContainer } from "../../repositories/IRepositories";
import type { ServiceResult } from "../../domain/ServiceResults";
import { getBalanceValue } from "../../engine/GameBalanceConfig";

export interface PromotionRelegationResult {
  championName: string;
  promotedTeams: number[];
  relegatedTeams: number[];
}

const SLOTS = getBalanceValue("SEASON").PROMOTION_RELEGATION_SLOTS;

export class PromotionRelegationService extends BaseService {
  constructor(repositories: IRepositoryContainer) {
    super(repositories, "PromotionRelegationService");
  }

  async calculateOutcome(
    seasonId: number
  ): Promise<ServiceResult<PromotionRelegationResult>> {
    return this.execute("calculateOutcome", seasonId, async (seasonId) => {
      const competitions = await this.repos.competitions.findAll();

      const tier1 = competitions.find(
        (c) => c.tier === 1 && c.type === "league"
      );
      const tier2 = competitions.find(
        (c) => c.tier === 2 && c.type === "league"
      );

      let championName = "Desconhecido";
      let relegated: number[] = [];
      let promoted: number[] = [];

      if (tier1) {
        const standingsT1 = await this.repos.competitions.getStandings(
          tier1.id,
          seasonId
        );

        if (standingsT1.length > 0) {
          championName = standingsT1[0].team?.name || "Desconhecido";
          const numberToSwap = SLOTS;
          relegated = standingsT1.slice(-numberToSwap).map((s) => s.teamId!);
        }
      }

      if (tier2) {
        const standingsT2 = await this.repos.competitions.getStandings(
          tier2.id,
          seasonId
        );
        const numberToSwap = SLOTS;
        promoted = standingsT2.slice(0, numberToSwap).map((s) => s.teamId!);
      }

      return {
        championName,
        promotedTeams: promoted,
        relegatedTeams: relegated,
      };
    });
  }
}
