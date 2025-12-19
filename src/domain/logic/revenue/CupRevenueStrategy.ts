import { BaseRevenueStrategy } from "./BaseRevenueStrategy";
import type { RevenueContext } from "./IRevenueStrategy";
import { getBalanceValue } from "../../../engine/GameBalanceConfig";

const REVENUE_IMPORTANCE_CONFIG = getBalanceValue("MATCH").REVENUE.IMPORTANCE;

export class CupRevenueStrategy extends BaseRevenueStrategy {
  protected calculateImportance(context: RevenueContext): number {
    let importance = REVENUE_IMPORTANCE_CONFIG.BASE;

    importance *= REVENUE_IMPORTANCE_CONFIG.KNOCKOUT_BONUS;

    if (context.competitionTier === 1) {
      importance *= REVENUE_IMPORTANCE_CONFIG.TIER_1_CUP_BONUS;
    }

    return Math.min(REVENUE_IMPORTANCE_CONFIG.MAX_MULTIPLIER, importance);
  }
}
