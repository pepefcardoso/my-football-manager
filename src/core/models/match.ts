import { ID, Timestamp, Money, MatchStatus, Period } from "./types";

export interface Match {
  id: ID;
  competitionGroupId: ID;
  stadiumId: ID;
  homeClubId: ID;
  awayClubId: ID;
  homeGoals: number;
  awayGoals: number;
  homePenalties: number | null;
  awayPenalties: number | null;
  roundNumber: number;
  datetime: Timestamp;
  status: MatchStatus;
  attendance: number;
  ticketRevenue: Money;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface MatchEvent {
  id: ID;
  matchId: ID;
  period: Period;
  minute: number;
  extraMinute: number;
  description: string;
  type:
    | "GOAL"
    | "CARD_YELLOW"
    | "CARD_RED"
    | "SUBSTITUTION"
    | "INJURY"
    | "VAR_CHECK"
    | "VAR_DECISION"
    | "OFFSIDE"
    | "FOUL"
    | "CHANCE";
  clubId: ID;
  playerId: ID;
  targetPlayerId: ID | null;
  createdAt: Timestamp;
}

export interface PlayerMatchStats {
  id: ID;
  matchId: ID;
  playerId: ID;
  clubId: ID;
  isStarter: boolean;
  positionPlayedId: ID;
  minutesPlayed: number;
  rating: number;
  goals: number;
  assists: number;
  shotsOnTarget: number;
  shotsOffTarget: number;
  foulsCommitted: number;
  foulsSuffered: number;
  yellowCards: number;
  redCard: boolean;
  crosses: number;
  saves: number;
  wasMvp: boolean;
}

export interface TempLineup {
  starters: ID[];
  bench: ID[];
  reserves: ID[];
  lastUpdated: number;
}
