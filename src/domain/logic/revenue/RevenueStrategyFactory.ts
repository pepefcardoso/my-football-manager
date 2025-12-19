import { CompetitionFormat } from "../../../domain/enums";
import type { Competition } from "../../../domain/models";
import { CupRevenueStrategy } from "./CupRevenueStrategy";
import type { IRevenueCalculationStrategy } from "./IRevenueStrategy";
import { LeagueRevenueStrategy } from "./LeagueRevenueStrategy";

export class RevenueStrategyFactory {
  static getStrategy(competition?: Competition): IRevenueCalculationStrategy {
    if (!competition) {
      return new LeagueRevenueStrategy();
    }

    switch (competition.type) {
      case CompetitionFormat.KNOCKOUT:
      case CompetitionFormat.GROUP_KNOCKOUT:
        return new CupRevenueStrategy();
      case CompetitionFormat.LEAGUE:
      default:
        return new LeagueRevenueStrategy();
    }
  }
}
