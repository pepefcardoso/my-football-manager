import { ID, Timestamp, Money } from "./types";

export type NotificationType = "CRITICAL" | "IMPORTANT" | "INFO";

export type EntityType =
  | "PLAYER"
  | "CLUB"
  | "MATCH"
  | "COMPETITION"
  | "TRANSFER_OFFER";

export interface RelatedEntity {
  type: EntityType;
  id: ID;
}

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
  type: NotificationType;
  title: string;
  message: string;
  date: Timestamp;
  isRead: boolean;
  relatedEntity?: RelatedEntity;
  expiresAt?: Timestamp;
}

export interface InjuryNotification extends Notification {
  type: "CRITICAL";
  relatedEntity: {
    type: "PLAYER";
    id: ID;
  };
}

export interface TransferOfferNotification extends Notification {
  type: "IMPORTANT";
  relatedEntity: {
    type: "TRANSFER_OFFER";
    id: ID;
  };
  offerValue: Money;
}
