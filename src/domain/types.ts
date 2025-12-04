export enum Position {
  GK = "GK",
  DF = "DF",
  MF = "MF",
  FW = "FW",
}

export enum StaffRole {
  HEAD_COACH = "head_coach",
  ASSISTANT_COACH = "assistant_coach",
  FITNESS_COACH = "fitness_coach",
  MEDICAL_DOCTOR = "medical_doctor",
  PHYSIOTHERAPIST = "physiotherapist",
  SCOUT = "scout",
  FOOTBALL_DIRECTOR = "football_director",
  EXECUTIVE_DIRECTOR = "executive_director",
}

export enum MatchEventType {
  GOAL = "goal",
  YELLOW_CARD = "yellow_card",
  RED_CARD = "red_card",
  SUBSTITUTION = "substitution",
  INJURY = "injury",
  VAR_CHECK = "var_check",
  PENALTY = "penalty",
}

export enum TransferType {
  TRANSFER = "transfer",
  LOAN = "loan",
  FREE = "free",
}

export enum FinancialCategory {
  TICKET_SALES = "ticket_sales",
  TV_RIGHTS = "tv_rights",
  SPONSORS = "sponsors",
  TRANSFER_IN = "transfer_in",
  TRANSFER_OUT = "transfer_out",
  PRIZE = "prize",
  SALARY = "salary",
  STAFF_SALARY = "staff_salary",
  STADIUM_MAINTENANCE = "stadium_maintenance",
  INFRASTRUCTURE = "infrastructure",
}

export enum WeatherCondition {
  SUNNY = "sunny",
  RAINY = "rainy",
  CLOUDY = "cloudy",
  SNOWY = "snowy",
}

export enum CompetitionFormat {
  LEAGUE = "league",
  KNOCKOUT = "knockout",
  GROUP_KNOCKOUT = "group_knockout",
}

export interface Player {
  id: number;
  teamId: number | null;
  firstName: string;
  lastName: string;
  age: number;
  nationality: string;
  position: Position;
  preferredFoot: string;
  overall: number;
  potential: number;
  finishing: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  pace: number;
  shooting: number;
  moral: number;
  energy: number;
  fitness: number;
  form: number;
  isYouth: boolean;
  isInjured: boolean;
  injuryType: string | null;
  injuryDaysRemaining: number;
  isCaptain: boolean;
  contract?: PlayerContract;

  //TEMPORARIO TODO
  salary?: number;
  contractEnd?: string | null;
  releaseClause?: number | null;
  suspensionGamesRemaining?: number;
}

export interface PlayerContract {
  id: number;
  playerId: number;
  teamId: number;
  startDate: string;
  endDate: string;
  wage: number;
  releaseClause: number | null;
  type: "professional" | "youth" | "loan";
  status: "active" | "expired" | "terminated";
}

export interface Staff {
  id: number;
  teamId: number | null;
  firstName: string;
  lastName: string;
  age: number;
  nationality: string;
  role: StaffRole;
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
}

export interface Match {
  id: number;
  competitionId: number;
  seasonId: number;
  homeTeamId: number;
  awayTeamId: number;
  date: string;
  round: number | null;
  homeScore: number | null;
  awayScore: number | null;
  isPlayed: boolean;
  attendance: number | null;
  ticketRevenue: number | null;
  weather: WeatherCondition | null;
}

export interface MatchEvent {
  id: number;
  matchId: number;
  minute: number;
  type: MatchEventType;
  teamId: number;
  playerId: number | null;
  description: string | null;
}

export interface Competition {
  id: number;
  name: string;
  shortName: string;
  country: string;
  tier: number;
  format: CompetitionFormat;
  teams: number;
  prize: number;
  reputation: number;
}

export interface Season {
  id: number;
  year: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface GameState {
  id: number;
  currentDate: string;
  currentSeasonId: number | null;
  managerName: string;
  playerTeamId: number | null;
  simulationSpeed: number;
}

export interface FinancialRecord {
  id: number;
  teamId: number;
  seasonId: number | null;
  date: string;
  type: "income" | "expense";
  category: FinancialCategory;
  amount: number;
  description: string | null;
}

export interface Transfer {
  id: number;
  playerId: number;
  fromTeamId: number | null;
  toTeamId: number;
  fee: number;
  date: string;
  seasonId: number | null;
  type: TransferType;
}

export interface ScoutingReport {
  id: number;
  playerId: number;
  scoutId: number;
  teamId: number;
  date: string;
  progress: number;
  overallEstimate: number | null;
  potentialEstimate: number | null;
  notes: string | null;
  recommendation: "sign" | "watch" | "reject" | null;
}

export interface PlayerStats {
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  matchesPlayed: number;
  minutesPlayed: number;
  rating: number;
}

export interface TeamStats {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

export interface DailyUpdate {
  date: string;
  events: GameEvent[];
  matchesPlayed: Match[];
  financialChanges: FinancialRecord[];
}

export interface GameEvent {
  type: "match" | "injury" | "contract_expiry" | "transfer_window" | "news";
  title: string;
  description: string;
  importance: "low" | "medium" | "high";
  date: string;
}

export interface PlayerListItem {
  id: number;
  fullName: string;
  position: Position;
  age: number;
  overall: number;
  moral: number;
  energy: number;
  isInjured: boolean;
  isCaptain: boolean;
}

export interface StaffListItem {
  id: number;
  fullName: string;
  role: StaffRole;
  overall: number;
  salary: number;
}

export interface MatchListItem {
  id: number;
  homeTeam: string;
  awayTeam: string;
  date: string;
  homeScore: number | null;
  awayScore: number | null;
  isPlayed: boolean;
  competition: string;
}

export enum TrainingFocus {
  PHYSICAL = "physical",
  TECHNICAL = "technical",
  TACTICAL = "tactical",
  REST = "rest",
}

export interface DailyLog {
  type: "attribute" | "injury" | "moral" | "info";
  message: string;
  entityId?: number;
}
