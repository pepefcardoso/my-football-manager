export enum GameEventType {
  MATCH_FINISHED = "MATCH_FINISHED",
  CONTRACT_EXPIRED = "CONTRACT_EXPIRED",
  FINANCIAL_CRISIS = "FINANCIAL_CRISIS",
  TRANSFER_COMPLETED = "TRANSFER_COMPLETED",
  PROPOSAL_RECEIVED = "PROPOSAL_RECEIVED",
  SCHEDULED_EVENT_TRIGGERED = "SCHEDULED_EVENT_TRIGGERED",
  STADIUM_CAPACITY_PRESSURED = "STADIUM_CAPACITY_PRESSURED",
  INFRASTRUCTURE_DEGRADED = "INFRASTRUCTURE_DEGRADED",
  INFRASTRUCTURE_COMPLETED = "INFRASTRUCTURE_COMPLETED",
}

export interface MatchFinishedPayload {
  matchId: number;
  homeTeamId: number;
  awayTeamId: number;
  homeScore: number;
  awayScore: number;
  seasonId: number;
  date: string;
}

export interface ContractExpiredPayload {
  playerId: number;
  playerName: string;
  teamId: number;
  contractEndDate: string;
}

export interface FinancialCrisisPayload {
  teamId: number;
  currentBudget: number;
  severity: "warning" | "critical";
  fanSatisfaction: number;
}

export interface TransferCompletedPayload {
  playerId: number;
  fromTeamId: number | null;
  toTeamId: number;
  fee: number;
  wageOffer: number;
  date: string;
}

export interface ProposalReceivedPayload {
  proposalId: number;
  playerId: number;
  fromTeamId: number;
  toTeamId: number;
  fee: number;
  wageOffer: number;
  deadline: string;
}

export interface ScheduledEventPayload {
  eventId: number;
  teamId: number;
  date: string;
  type: string;
  title: string;
  description: string;
}

export interface StadiumCapacityPressuredPayload {
  teamId: number;
  currentCapacity: number;
  averageAttendance: number;
  utilizationRate: number;
  lostRevenue: number;
  recommendedExpansion: number;
  expansionCost: number;
}

export interface InfrastructureDegradedPayload {
  teamId: number;
  facilityType: "stadium" | "training" | "youth";
  currentQuality: number;
  minimumQuality: number;
  maintenanceCost: number;
}

export interface InfrastructureCompletedPayload {
  teamId: number;
  facilityType: string;
  newLevel: number;
  description: string;
  completionDate: string;
}
