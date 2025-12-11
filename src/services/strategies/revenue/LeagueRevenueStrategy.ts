import { BaseRevenueStrategy } from "./BaseRevenueStrategy";
import type { RevenueContext } from "./IRevenueStrategy";
import { getBalanceValue } from "../../../engine/GameBalanceConfig";

const REVENUE_IMPORTANCE_CONFIG = getBalanceValue("MATCH").REVENUE.IMPORTANCE;

export class LeagueRevenueStrategy extends BaseRevenueStrategy {
  protected calculateImportance(context: RevenueContext): number {
    let importance = REVENUE_IMPORTANCE_CONFIG.BASE;

    if (context.competitionTier === 1) {
      importance *= REVENUE_IMPORTANCE_CONFIG.TIER_1_BONUS;
    }

    if (
      context.round &&
      context.round > REVENUE_IMPORTANCE_CONFIG.LATE_ROUND_THRESHOLD
    ) {
      importance *= REVENUE_IMPORTANCE_CONFIG.LATE_ROUND_BONUS;
    }

    return Math.min(REVENUE_IMPORTANCE_CONFIG.MAX_MULTIPLIER, importance);
  }
}
