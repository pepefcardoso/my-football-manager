export type EventCategory =
  | "media"
  | "board"
  | "player"
  | "fan"
  | "sponsor"
  | "infrastructure";
export type EventImportance = "low" | "medium" | "high" | "critical";

export interface EventOption {
  id: string;
  label: string;
  effectDescription?: string;
}

export interface NarrativeEvent {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  importance: EventImportance;
  date: string;
  options?: EventOption[];
  imageUrl?: string;
}

export interface EventTriggerContext {
  teamId: number;
  currentDate: string;
  budget: number;
  fanSatisfaction: number;
  teamReputation: number;
  averageMorale: number;
  standingPosition?: number;
}
