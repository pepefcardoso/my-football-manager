export interface GameSaveMetadata {
  id: string;
  filename: string;
  managerName: string;
  teamName: string;
  teamId: number;
  currentDate: string;
  seasonYear: number;
  reputation: number;
  playTimeSeconds: number;
  lastSaveTimestamp: string;
  version: string;
  primaryColor: string;
}

export interface GameStateSnapshot {
  currentDate: string;
  currentSeasonId: number | null;
  managerName: string;
  playerTeamId: number | null;
  trainingFocus: string | null;
  simulationSpeed: number;
  totalPlayTime: number;
  saveId: string;
}

export interface CompetitionSnapshot {
  id: number;
  name: string;
  shortName: string;
  country: string;
  tier: number;
  type: string;
  priority: number;
  teams: number;
  prize: number;
  reputation: number;
  config: any;
  window: string | null;
  startMonth: number | null;
  endMonth: number | null;
}

export interface TeamSnapshot {
  id: number;
  name: string;
  shortName: string;
  primaryColor: string;
  secondaryColor: string;
  badgeUrl?: string | null;
  reputation: number;
  budget: number;
  isHuman: boolean;
  stadiumCapacity: number;
  stadiumQuality: number;
  trainingCenterQuality: number;
  youthAcademyQuality: number;
  fanSatisfaction: number;
  fanBase: number;
  transferBudget: number;
  transferStrategy: string;
}

export interface PlayerSnapshot {
  id: number;
  teamId: number | null;
  firstName: string;
  lastName: string;
  age: number;
  nationality: string;
  position: string;
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
  contractWage: number | null;
  contractStartDate: string | null;
  contractEndDate: string | null;
  contractType: string | null;
  contractStatus: string | null;
}

export interface StaffSnapshot {
  id: number;
  teamId: number | null;
  firstName: string;
  lastName: string;
  age: number;
  nationality: string;
  role: string;
  overall: number;
  salary: number;
  contractEnd: string | null;
  specialization: string | null;
}

export interface MatchSnapshot {
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
  weather: string | null;
  groupName: string | null;
}

export interface StandingSnapshot {
  id: number;
  competitionId: number | null;
  seasonId: number | null;
  teamId: number | null;
  groupName: string | null;
  phase: string | null;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

export interface FinancialSnapshot {
  id: number;
  teamId: number | null;
  seasonId: number | null;
  date: string;
  type: string;
  category: string;
  amount: number;
  description: string | null;
}

export interface TransferSnapshot {
  id: number;
  playerId: number | null;
  fromTeamId: number | null;
  toTeamId: number | null;
  fee: number;
  date: string;
  seasonId: number | null;
  type: string;
}

export interface ScoutingSnapshot {
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

export interface TransferProposalSnapshot {
  id: number;
  playerId: number;
  fromTeamId: number;
  toTeamId: number | null;
  type: string;
  status: string;
  fee: number;
  wageOffer: number;
  contractLength: number;
  createdAt: string;
  responseDeadline: string;
  counterOfferFee: number | null;
  rejectionReason: string | null;
}

export interface ClubInterestSnapshot {
  id: number;
  teamId: number;
  playerId: number;
  interestLevel: string;
  priority: number;
  maxFeeWillingToPay: number | null;
  dateAdded: string;
}

export interface GameSave {
  metadata: GameSaveMetadata;
  gameState: GameStateSnapshot;
  teams: TeamSnapshot[];
  players: PlayerSnapshot[];
  staff: StaffSnapshot[];
  competitions: CompetitionSnapshot[];
  matches: MatchSnapshot[];
  standings: StandingSnapshot[];
  financialRecords: FinancialSnapshot[];
  transfers: TransferSnapshot[];
  scoutingReports: ScoutingSnapshot[];
  transferProposals: TransferProposalSnapshot[];
  clubInterests: ClubInterestSnapshot[];
}

export interface CreateSaveOptions {
  filename: string;
  compress?: boolean;
  matchHistoryLimit?: number;
  financialRecordLimit?: number;
}

export interface SaveOperationResult {
  success: boolean;
  saveId: string;
  filepath: string;
  fileSize: number;
  message: string;
}

export interface LoadOperationResult {
  success: boolean;
  save: GameSave | null;
  message: string;
  compatibilityWarnings?: string[];
}

export interface SaveValidationResult {
  isValid: boolean;
  version: string;
  isCompatible: boolean;
  errors: string[];
  warnings: string[];
}
