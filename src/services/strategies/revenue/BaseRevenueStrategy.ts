import { MatchRevenueConfig } from "../../config/ServiceConstants";
import type {
  IRevenueCalculationStrategy,
  RevenueContext,
  RevenueResult,
} from "./IRevenueStrategy";

export abstract class BaseRevenueStrategy
  implements IRevenueCalculationStrategy
{
  public calculateRevenue(context: RevenueContext): RevenueResult {
    const matchImportance = this.calculateImportance(context);

    const satisfactionMultiplier = Math.max(
      MatchRevenueConfig.MIN_SATISFACTION_MULTIPLIER,
      Math.min(
        MatchRevenueConfig.MAX_SATISFACTION_MULTIPLIER,
        context.fanSatisfaction / 100
      )
    );

    const baseAttendance = context.stadiumCapacity * satisfactionMultiplier;
    const expectedAttendance = baseAttendance * matchImportance;

    const randomFactor =
      MatchRevenueConfig.ATTENDANCE_RANDOM_FACTOR_BASE +
      Math.random() * MatchRevenueConfig.ATTENDANCE_RANDOM_VARIANCE;

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
