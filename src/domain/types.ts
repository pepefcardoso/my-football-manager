import type { MatchState, MatchEventType } from "./enums";
import type { Player, Team, Match } from "./models";

export type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral"
  | "outline";

export interface MatchEventData {
  minute: number;
  type: MatchEventType | string;
  teamId: number;
  playerId?: number;
  description: string;
  severity?: "low" | "medium" | "high";
}

export interface MatchConfig {
  homeTeam: Team;
  awayTeam: Team;
  homePlayers: Player[];
  awayPlayers: Player[];
  weather?: "sunny" | "rainy" | "cloudy" | "windy";
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
  isInjured: boolean;
  injuryDays?: number;
}

export interface MatchResult {
  homeScore: number;
  awayScore: number;
  events: MatchEventData[];
  stats: MatchStats;
  playerUpdates: PlayerMatchUpdate[];
}

export interface MatchSimulationState {
  matchId: number;
  state: MatchState;
  currentMinute: number;
  homeScore: number;
  awayScore: number;
  events: MatchEventData[];
  isLoading: boolean;
  error: string | null;
}

export interface TeamStaffImpact {
  injuryRecoveryMultiplier: number;
  energyRecoveryBonus: number;
  tacticalAnalysisBonus: number;
  scoutingAccuracy: number;
}

export interface InjuryEvent {
  playerId: number;
  playerName: string;
  injuryType: string;
  duration: number;
}

export interface SuspensionEvent {
  playerId: number;
  playerName: string;
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
  amount: number;
  category: string;
  description: string;
}

export interface DailyUpdateResult {
  date: string;
  playersUpdated: number;
  matchesPlayed: Match[];
  injuries: InjuryEvent[];
  suspensions: SuspensionEvent[];
  contractExpiries: ContractExpiryEvent[];
  financialChanges: FinancialChange[];
}

export interface DailySimulationResult {
  playerUpdates: any[];
  logs: string[];
}

export interface GameSave {
  gameState: any;
  currentDate: string;
  version: string;
  timestamp: string;
}

export interface SimPlayer {
  id: number;
  name: string;
  position: string;
  overall: number;
  energy: number;
}

export interface SimTeam {
  id: number;
  name: string;
  players: SimPlayer[];
  tactics?: {
    aggression: "low" | "normal" | "high";
  };
}

export interface TeamStrength {
  overall: number;
  attack: number;
  defense: number;
  midfield: number;
  moralBonus: number;
  fitnessMultiplier: number;
}
