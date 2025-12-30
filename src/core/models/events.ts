import { ID, Timestamp, Money } from "./types";

export interface NewsItem {
  id: ID;
  date: Timestamp;
  subject: string;
  body: string;
  type: string;
  relatedPlayerId: ID | null;
  relatedClubId: ID | null;
  relatedMatchId: ID | null;
  relatedCompetitionId: ID | null;
}

export interface GameEvent {
  id: ID;
  date: Timestamp;
  clubId: ID;
  type: string;
  description: string;
  affectedPlayerId: ID | null;
  moralChange: number;
  reputationChange: number;
  financialValue: Money;
}

export interface ScheduledEvent {
  id: ID;
  date: Timestamp;
  type: string;
  processed: boolean;
  targetPlayerId: ID | null;
  targetClubId: ID | null;
  targetMatchId: ID | null;
}
