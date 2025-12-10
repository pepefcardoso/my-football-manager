import { BaseService } from "../BaseService";
import type { IRepositoryContainer } from "../../repositories/IRepositories";
import type { ServiceResult } from "../types/ServiceResults";
import { MatchRevenueConfig } from "../config/ServiceConstants";

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
        let matchImportance: number = MatchRevenueConfig.IMPORTANCE.BASE;

        if (competitionId) {
          const competitions = await this.repos.competitions.findAll();
          const comp = competitions.find((c) => c.id === competitionId);

          if (comp) {
            if (comp.tier === 1)
              matchImportance *= MatchRevenueConfig.IMPORTANCE.TIER_1_BONUS;
            if (comp.type === "knockout")
              matchImportance *= MatchRevenueConfig.IMPORTANCE.KNOCKOUT_BONUS;
            if (round && round > 30)
              matchImportance *= MatchRevenueConfig.IMPORTANCE.LATE_ROUND_BONUS;

            matchImportance = Math.min(
              MatchRevenueConfig.IMPORTANCE.MAX_MULTIPLIER,
              matchImportance
            );
          }
        }

        const satisfactionMultiplier = Math.max(
          MatchRevenueConfig.MIN_SATISFACTION_MULTIPLIER,
          Math.min(
            MatchRevenueConfig.MAX_SATISFACTION_MULTIPLIER,
            (homeTeam.fanSatisfaction ?? 50) / 100
          )
        );

        const baseAttendance =
          (homeTeam.stadiumCapacity ?? 10000) * satisfactionMultiplier;
        const expectedAttendance = baseAttendance * matchImportance;
        const randomFactor =
          MatchRevenueConfig.ATTENDANCE_RANDOM_FACTOR_BASE +
          Math.random() * MatchRevenueConfig.ATTENDANCE_RANDOM_VARIANCE;

        const attendance = Math.round(
          Math.min(
            homeTeam.stadiumCapacity ?? 10000,
            expectedAttendance * randomFactor
          )
        );

        const ticketRevenue = Math.round(
          attendance * MatchRevenueConfig.BASE_TICKET_PRICE
        );

        return { ticketRevenue, attendance };
      }
    );
  }
}
