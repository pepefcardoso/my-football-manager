import { MatchRevenueConfig } from "../../config/ServiceConstants";
import { BaseRevenueStrategy } from "./BaseRevenueStrategy";
import type { RevenueContext } from "./IRevenueStrategy";

export class LeagueRevenueStrategy extends BaseRevenueStrategy {
  protected calculateImportance(context: RevenueContext): number {
    let importance = MatchRevenueConfig.IMPORTANCE.BASE;

    if (context.competitionTier === 1) {
      importance *= MatchRevenueConfig.IMPORTANCE.TIER_1_BONUS;
    }

    if (context.round && context.round > 30) {
      importance *= MatchRevenueConfig.IMPORTANCE.LATE_ROUND_BONUS;
    }

    return Math.min(MatchRevenueConfig.IMPORTANCE.MAX_MULTIPLIER, importance);
  }
}
