import { GameBalance } from "../../../engine/GameBalanceConfig";
import type {
  IRevenueCalculationStrategy,
  RevenueContext,
  RevenueResult,
} from "./IRevenueStrategy";

export abstract class BaseRevenueStrategy
  implements IRevenueCalculationStrategy
{
  public calculateRevenue(context: RevenueContext): RevenueResult {
    const REVENUE_CONFIG = GameBalance.MATCH.REVENUE;

    const matchImportance = this.calculateImportance(context);

    const satisfactionMultiplier = Math.max(
      REVENUE_CONFIG.MIN_SATISFACTION_MULTIPLIER,
      Math.min(
        REVENUE_CONFIG.MAX_SATISFACTION_MULTIPLIER,
        context.fanSatisfaction / 100
      )
    );

    const baseAttendance = context.stadiumCapacity * satisfactionMultiplier;
    const expectedAttendance = baseAttendance * matchImportance;

    const randomFactor =
      REVENUE_CONFIG.ATTENDANCE_RANDOM_FACTOR_BASE +
      Math.random() * REVENUE_CONFIG.ATTENDANCE_RANDOM_VARIANCE;

    const attendance = Math.round(
      Math.min(context.stadiumCapacity, expectedAttendance * randomFactor)
    );

    const ticketRevenue = Math.round(attendance * context.ticketPrice);

    return {
      ticketRevenue,
      attendance,
      matchImportance,
    };
  }

  protected abstract calculateImportance(context: RevenueContext): number;
}