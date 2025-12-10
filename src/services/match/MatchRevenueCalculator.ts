import { BaseService } from "../BaseService";
import type { IRepositoryContainer } from "../../repositories/IRepositories";
import type { ServiceResult } from "../types/ServiceResults";
import { MatchRevenueConfig } from "../config/ServiceConstants";
import { RevenueStrategyFactory } from "../strategies/revenue/RevenueStrategyFactory";

export interface RevenueCalculationInput {
  matchId: number;
  homeTeam: any;
  competitionId?: number | null;
  round?: number | null;
}

export interface RevenueCalculationResult {
  ticketRevenue: number;
  attendance: number;
}

export class MatchRevenueCalculator extends BaseService {
  constructor(repositories: IRepositoryContainer) {
    super(repositories, "MatchRevenueCalculator");
  }

  async calculateRevenue(
    input: RevenueCalculationInput
  ): Promise<ServiceResult<RevenueCalculationResult>> {
    return this.execute(
      "calculateRevenue",
      input,
      async ({ homeTeam, competitionId, round }) => {
        let competition = undefined;

        if (competitionId) {
          const allCompetitions = await this.repos.competitions.findAll();
          competition = allCompetitions.find((c) => c.id === competitionId);
        }

        const strategy = RevenueStrategyFactory.getStrategy(competition);

        const result = strategy.calculateRevenue({
          stadiumCapacity: homeTeam.stadiumCapacity ?? 10000,
          fanSatisfaction: homeTeam.fanSatisfaction ?? 50,
          ticketPrice: MatchRevenueConfig.BASE_TICKET_PRICE,
          competitionTier: competition?.tier ?? 1,
          round: round || undefined,
        });

        this.logger.debug(
          `Receita calculada (Importância: ${result.matchImportance.toFixed(
            2
          )}):`,
          result
        );

        return {
          ticketRevenue: result.ticketRevenue,
          attendance: result.attendance,
        };
      }
    );
  }
}
