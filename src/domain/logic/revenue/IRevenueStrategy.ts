export interface RevenueContext {
  stadiumCapacity: number;
  fanSatisfaction: number;
  ticketPrice: number;
  competitionTier: number;
  round?: number;
  isDerby?: boolean;
}

export interface RevenueResult {
  ticketRevenue: number;
  attendance: number;
  matchImportance: number;
}

export interface IRevenueCalculationStrategy {
  calculateRevenue(context: RevenueContext): RevenueResult;
}
