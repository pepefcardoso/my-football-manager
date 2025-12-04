import type { MatchEventType, MatchState, Position, StaffRole } from "./enums";
import type {
  CompetitionStanding,
  FinancialRecord,
  Match,
  Player,
  PlayerContract,
  Staff,
  Team,
  GameState,
} from "./models";

export type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral"
  | "outline";

export interface PlayerWithContract extends Player {
  contract?: PlayerContract | null;
  fullName: string;
}

export interface TeamFullData extends Team {
  roster: PlayerWithContract[];
  staff: Staff[];
  stats?: TeamStats;
}

export interface StandingRow extends CompetitionStanding {
  teamName: string;
  goalDifference: number;
  form?: string[];
}

export interface TeamStrength {
  overall: number;
  attack: number;
  defense: number;
  midfield: number;
  moralBonus: number;
  fitnessMultiplier: number;
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

export interface SimPlayer
  extends Pick<
    Player,
    | "id"
    | "position"
    | "overall"
    | "energy"
    | "moral"
    | "pace"
    | "shooting"
    | "passing"
    | "defending"
    | "isInjured"
  > {
  name: string;
  currentPosition?: Position | string;
}

export interface SimTeam extends Pick<Team, "id" | "name"> {
  players: SimPlayer[];
  tactics?: {
    aggression: "low" | "normal" | "high";
    style?: "possession" | "counter" | "balanced";
  };
}

export interface MatchConfig {
  homeTeam: Team;
  awayTeam: Team;
  homePlayers: Player[];
  awayPlayers: Player[];
  weather?: "sunny" | "rainy" | "cloudy" | "windy";
}

export interface MatchEventData {
  minute: number;
  type: MatchEventType | string;
  teamId: number | null;
  playerId: number | null;
  description: string;
  severity?: "low" | "medium" | "high";
}

export interface MatchStats {
  homePossession: number;
  awayPossession: number;
  homeShots: number;
  awayShots: number;
  homeShotsOnTarget: number;
  awayShotsOnTarget: number;
  homeCorners: number;
  awayCorners: number;
  homeFouls: number;
  awayFouls: number;
}

export interface PlayerMatchUpdate {
  playerId: number;
  energy: number;
  moral: number;
  rating: number;
  goals: number;
  assists: number;
  isInjured: boolean;
  injuryDays?: number;
  injuryType?: string;
}

export interface MatchResult {
  homeScore: number;
  awayScore: number;
  events: MatchEventData[];
  stats: MatchStats;
  playerUpdates: PlayerMatchUpdate[];
  ticketRevenue?: number;
}

export interface MatchSimulationState {
  matchId: number;
  state: MatchState | string;
  currentMinute: number;
  homeScore: number;
  awayScore: number;
  events: MatchEventData[];
  stats: MatchStats;
  isLoading: boolean;
}

export interface DailyUpdateResult {
  date: string;
  matchesPlayed: Match[];
  matchResults: MatchResult[];
  financialChanges: FinancialRecord[];
  injuries: InjuryEvent[];
  suspensions: SuspensionEvent[];
  contractExpiries: ContractExpiryEvent[];
  news: GameEvent[];
  logs: string[];
}

export interface GameEvent {
  type:
    | "match"
    | "injury"
    | "contract_expiry"
    | "transfer_window"
    | "news"
    | "financial";
  title: string;
  description: string;
  importance: "low" | "medium" | "high";
  date: string;
  relatedEntityId?: number;
}

export interface InjuryEvent {
  playerId: number;
  playerName: string;
  teamId: number;
  injuryType: string;
  duration: number;
}

export interface SuspensionEvent {
  playerId: number;
  playerName: string;
  teamId: number;
  games: number;
  reason: string;
}

export interface ContractExpiryEvent {
  playerId: number;
  playerName: string;
  teamId: number;
}

export interface FinancialChange {
  type: "income" | "expense";
  category: string;
  amount: number;
  description: string;
  teamId: number;
}

export interface GameSave {
  gameState: GameState;
  currentDate: string;
  version: string;
  timestamp: string;
  managerName: string;
  teamName: string;
}

export interface PlayerListItem {
  id: number;
  fullName: string;
  position: Position | string;
  age: number;
  overall: number;
  moral: number;
  energy: number;
  isInjured: boolean;
  isCaptain: boolean;
  wage?: number;
  value?: number;
}

export interface StaffListItem {
  id: number;
  fullName: string;
  role: StaffRole | string;
  overall: number;
  salary: number;
  age: number;
}

export interface MatchListItem {
  id: number;
  homeTeam: string;
  awayTeam: string;
  date: string;
  homeScore: number | null;
  awayScore: number | null;
  isPlayed: boolean;
  competitionName: string;
  userTeamMatch: boolean;
}

export interface DailyLog {
  type: "attribute" | "injury" | "moral" | "info" | "finance";
  message: string;
  entityId?: number;
  date: string;
}

export interface TeamStaffImpact {
  injuryRecoveryMultiplier: number;
  energyRecoveryBonus: number;
  tacticalAnalysisBonus: number;
  scoutingAccuracy: number;
  youthDevelopmentRate: number;
}

export interface PlayerAttributes {
  defending: number;
  physical: number;
  passing: number;
  finishing: number;
  dribbling: number;
  pace: number;
  shooting: number;
}