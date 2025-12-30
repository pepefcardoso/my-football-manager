import { ID, Timestamp, Attribute } from "./types";

export interface PlayerState {
  playerId: ID;
  morale: Attribute;
  fitness: Attribute;
  matchReadiness: Attribute;
}

export interface PlayerInjury {
  id: ID;
  playerId: ID;
  name: string;
  severity: string;
  startDate: Timestamp;
  estimatedReturnDate: Timestamp;
}

export interface PlayerSeasonStats {
  id: ID;
  seasonId: ID;
  playerId: ID;
  clubId: ID;
  gamesPlayed: number;
  minutesPlayed: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  totalRating: number;
  mvpCount: number;
}

export interface PlayerSecondaryPosition {
  playerId: ID;
  positionId: ID;
  proficiency: Attribute;
}
