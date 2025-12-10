export enum GameEventType {
  MATCH_FINISHED = "MATCH_FINISHED",
  CONTRACT_EXPIRED = "CONTRACT_EXPIRED",
  FINANCIAL_CRISIS = "FINANCIAL_CRISIS",
}

export interface MatchFinishedPayload {
  matchId: number;
  homeTeamId: number;
  awayTeamId: number;
  homeScore: number;
  awayScore: number;
  competitionId?: number;
  seasonId?: number;
  ticketRevenue: number;
  attendance: number;
  round?: number;
}

export interface ContractExpiredPayload {
  playerId: number;
  teamId: number | null;
  date: string;
}

export interface FinancialCrisisPayload {
  teamId: number;
  currentBudget: number;
  severity: "warning" | "critical";
  fanSatisfaction: number;
}
