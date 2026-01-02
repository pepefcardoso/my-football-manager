import { ID, Timestamp, Money } from "./types";

export type NotificationType = "CRITICAL" | "IMPORTANT" | "INFO";
export type NotificationActionType =
  | "GO_TO_PLAYER"
  | "GO_TO_MATCH"
  | "OPEN_NEGOTIATION"
  | "NONE";

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

export interface Notification {
  id: ID;
  managerId: ID;
  date: Timestamp;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  expiresAt: Timestamp;
  actionType: NotificationActionType;
  actionPayload: string;
}
