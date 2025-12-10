import { MatchRevenueConfig } from "../../config/ServiceConstants";
import { BaseRevenueStrategy } from "./BaseRevenueStrategy";
import type { RevenueContext } from "./IRevenueStrategy";

export class CupRevenueStrategy extends BaseRevenueStrategy {
  protected calculateImportance(context: RevenueContext): number {
    let importance = MatchRevenueConfig.IMPORTANCE.BASE;

    importance *= MatchRevenueConfig.IMPORTANCE.KNOCKOUT_BONUS;

    if (context.competitionTier === 1) {
      importance *= 1.1;
    }

    return Math.min(MatchRevenueConfig.IMPORTANCE.MAX_MULTIPLIER, importance);
  }
}
