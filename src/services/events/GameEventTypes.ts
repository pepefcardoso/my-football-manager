export enum GameEventType {
  MATCH_FINISHED = "MATCH_FINISHED",
  CONTRACT_EXPIRED = "CONTRACT_EXPIRED",
  FINANCIAL_CRISIS = "FINANCIAL_CRISIS",
  TRANSFER_COMPLETED = "TRANSFER_COMPLETED",
  PROPOSAL_RECEIVED = "PROPOSAL_RECEIVED",
  SCHEDULED_EVENT_TRIGGERED = "SCHEDULED_EVENT_TRIGGERED",
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

export interface TransferCompletedPayload {
  playerId: number;
  fromTeamId: number;
  toTeamId: number;
  fee: number;
  date: string;
}

export interface ProposalReceivedPayload {
  proposalId: number;
  playerId: number;
  fromTeamId: number;
  toTeamId: number;
  fee: number;
}

export interface ScheduledEventPayload {
  eventId: number;
  type: string;
  title: string;
  date: string;
}
