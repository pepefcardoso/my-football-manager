import type {
  FinancialCategory,
  InterestLevel,
  MatchEventType,
  Position,
  StaffRole,
  TransferStatus,
  TransferStrategy,
  TransferType,
  WeatherCondition,
} from "./enums";

export interface Player {
  id: number;
  teamId: number | null;
  firstName: string;
  lastName: string;
  age: number;
  nationality: string;
  position: Position | string;
  preferredFoot: string;
  overall: number;
  potential: number;
  finishing: number;
  passing: number;
  dribbling: number;
  defending: number;
  shooting: number;
  physical: number;
  pace: number;
  moral: number;
  energy: number;
  fitness: number;
  form: number;
  isYouth: boolean;
  isInjured: boolean;
  injuryType: string | null;
  injuryDaysRemaining: number;
  isCaptain: boolean;
  suspensionGamesRemaining: number;
}

export interface PlayerContract {
  id: number;
  playerId: number;
  teamId: number;
  startDate: string;
  endDate: string;
  wage: number;
  releaseClause: number | null;
  type: "professional" | "youth" | "loan" | string;
  status: "active" | "expired" | "terminated" | string;
}

export interface Staff {
  id: number;
  teamId: number | null;
  firstName: string;
  lastName: string;
  age: number;
  nationality: string;
  role: StaffRole | string;
  overall: number;
  salary: number;
  contractEnd: string | null;
  specialization: string | null;
}

export interface Team {
  id: number;
  name: string;
  shortName: string;
  primaryColor: string;
  secondaryColor: string;
  reputation: number;
  budget: number;
  isHuman: boolean;
  stadiumCapacity: number;
  stadiumQuality: number;
  trainingCenterQuality: number;
  youthAcademyQuality: number;
  fanSatisfaction: number;
  fanBase: number;
  headCoachId: number | null;
  footballDirectorId: number | null;
  executiveDirectorId: number | null;
  transferBudget: number;
  transferStrategy: TransferStrategy | string;
  history: TeamAchievement[];
}

export interface Competition {
  id: number;
  name: string;
  shortName: string;
  country: string;
  tier: number;
  teams: number;
  prize: number;
  reputation: number;
  type: "league" | "cup" | string;
  priority: number;
  config?: Record<string, any>;
  window?: string | null;
  startMonth?: number | null;
  endMonth?: number | null;
}

export interface CompetitionStanding {
  id: number;
  competitionId: number | null;
  seasonId: number | null;
  teamId: number | null;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  groupName?: string | null;
  phase?: string | null;
}

export interface Season {
  id: number;
  year: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface Match {
  id: number;
  competitionId: number | null;
  seasonId: number | null;
  homeTeamId: number | null;
  awayTeamId: number | null;
  date: string;
  round: number | null;
  homeScore: number | null;
  awayScore: number | null;
  isPlayed: boolean;
  attendance: number | null;
  ticketRevenue: number | null;
  weather: WeatherCondition | string | null;
  groupName?: string | null;
}

export interface MatchEvent {
  id: number;
  matchId: number | null;
  minute: number;
  type: MatchEventType | string;
  teamId: number | null;
  playerId: number | null;
  description: string | null;
}

export interface Transfer {
  id: number;
  playerId: number | null;
  fromTeamId: number | null;
  toTeamId: number | null;
  fee: number;
  date: string;
  seasonId: number | null;
  type: TransferType | string;
}

export interface ScoutingReport {
  id: number;
  playerId: number | null;
  scoutId: number | null;
  teamId: number | null;
  date: string;
  progress: number;
  overallEstimate: number | null;
  potentialEstimate: number | null;
  notes: string | null;
  recommendation: string | null;
}

export interface FinancialRecord {
  id: number;
  teamId: number | null;
  seasonId: number | null;
  date: string;
  type: "income" | "expense" | string;
  category: FinancialCategory | string;
  amount: number;
  description: string | null;
}

export interface GameState {
  id: number;
  saveId: string;
  currentDate: string;
  currentSeasonId: number | null;
  managerName: string;
  playerTeamId: number | null;
  simulationSpeed: number;
  trainingFocus: string | null;
  totalPlayTime?: number;
  lastPlayedAt?: string | null;
}

export interface TransferProposal {
  id: number;
  playerId: number;
  fromTeamId: number;
  toTeamId: number | null;
  type: "transfer" | "loan" | string;
  status: TransferStatus | string;
  fee: number;
  wageOffer: number;
  contractLength: number;
  createdAt: string;
  responseDeadline: string;
  counterOfferFee: number | null;
  rejectionReason: string | null;
}

export interface ClubInterest {
  id: number;
  teamId: number;
  playerId: number;
  interestLevel: InterestLevel | string;
  priority: number;
  maxFeeWillingToPay: number | null;
  dateAdded: string;
}

export interface TeamAchievement {
  seasonId: number;
  seasonYear: number;
  competitionId: number;
  competitionName: string;
  type: "league" | "cup";
  position: number;
  description: string;
  date: string;
}
