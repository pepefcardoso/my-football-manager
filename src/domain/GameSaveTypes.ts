/**
 * Metadata about a save file - displayed in the Load Game menu
 */
export interface GameSaveMetadata {
  /** Unique identifier for this save */
  id: string;
  /** User-defined filename (without extension) */
  filename: string;
  /** Manager/Player name */
  managerName: string;
  /** Current team name (or "Unemployed") */
  teamName: string;
  /** Current team ID (0 if unemployed) */
  teamId: number;
  /** Current in-game date (YYYY-MM-DD) */
  currentDate: string;
  /** Year of current season */
  seasonYear: number;
  /** Team reputation (used for sorting/display) */
  reputation: number;
  /** Total playtime in seconds */
  playTimeSeconds: number;
  /** Real-world timestamp of last save */
  lastSaveTimestamp: string;
  /** Game version (for compatibility checks) */
  version: string;
  /** Team primary color (for UI theming) */
  primaryColor: string;
}

/**
 * Complete game state snapshot
 */
export interface GameStateSnapshot {
  /** Current game date */
  currentDate: string;
  /** Active season ID */
  currentSeasonId: number | null;
  /** Manager/Player name */
  managerName: string;
  /** Controlled team ID (null if unemployed) */
  playerTeamId: number | null;
  /** Current training focus */
  trainingFocus: string | null;
  /** Simulation speed multiplier */
  simulationSpeed: number;
  /** Total playtime in seconds */
  totalPlayTime: number;
  /** Unique save identifier */
  saveId: string;
}

/**
 * Team snapshot with essential data
 */
export interface TeamSnapshot {
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
  transferBudget: number;
  transferStrategy: string;
}

/**
 * Player snapshot with contract data
 */
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

/**
 * Staff snapshot
 */
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

/**
 * Match snapshot (for match history)
 */
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

/**
 * Competition standing snapshot
 */
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

/**
 * Financial record snapshot
 */
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

/**
 * Transfer record snapshot
 */
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

/**
 * Scouting report snapshot
 */
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

/**
 * Transfer proposal snapshot
 */
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

/**
 * Club interest snapshot
 */
export interface ClubInterestSnapshot {
  id: number;
  teamId: number;
  playerId: number;
  interestLevel: string;
  priority: number;
  maxFeeWillingToPay: number | null;
  dateAdded: string;
}

/**
 * Complete game save containing all game data
 */
export interface GameSave {
  /** Save metadata for UI display */
  metadata: GameSaveMetadata;
  /** Current game state */
  gameState: GameStateSnapshot;
  /** All teams */
  teams: TeamSnapshot[];
  /** All players with contract data */
  players: PlayerSnapshot[];
  /** All staff members */
  staff: StaffSnapshot[];
  /** Match history (last N matches to reduce size) */
  matches: MatchSnapshot[];
  /** Competition standings */
  standings: StandingSnapshot[];
  /** Financial records (last N records) */
  financialRecords: FinancialSnapshot[];
  /** Transfer history (last N transfers) */
  transfers: TransferSnapshot[];
  /** Active scouting reports */
  scoutingReports: ScoutingSnapshot[];
  /** Active transfer proposals */
  transferProposals: TransferProposalSnapshot[];
  /** Active club interests */
  clubInterests: ClubInterestSnapshot[];
}

/**
 * Options for creating a save
 */
export interface CreateSaveOptions {
  /** User-defined filename */
  filename: string;
  /** Whether to compress the save data */
  compress?: boolean;
  /** Number of historical matches to include */
  matchHistoryLimit?: number;
  /** Number of financial records to include */
  financialRecordLimit?: number;
}

/**
 * Result of a save operation
 */
export interface SaveOperationResult {
  success: boolean;
  saveId: string;
  filepath: string;
  fileSize: number;
  message: string;
}

/**
 * Result of a load operation
 */
export interface LoadOperationResult {
  success: boolean;
  save: GameSave | null;
  message: string;
  compatibilityWarnings?: string[];
}

/**
 * Save file validation result
 */
export interface SaveValidationResult {
  isValid: boolean;
  version: string;
  isCompatible: boolean;
  errors: string[];
  warnings: string[];
}
