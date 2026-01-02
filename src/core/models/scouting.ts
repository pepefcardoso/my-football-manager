import { Attribute, ID, Timestamp } from "./types";

export type ScoutAssignmentType = "GENERAL" | "SPECIFIC";

export interface ScoutingKnowledge {
  id: ID;
  observingClubId: ID;
  targetPlayerId: ID;
  knowledgeLevel: Attribute;
  lastUpdated: Timestamp;
}

export interface ScoutAssignment {
  id: ID;
  scoutId: ID;
  clubId: ID;
  type: ScoutAssignmentType;
  nationId?: ID;
  positionFilter?: string;
  ageMin?: number;
  ageMax?: number;
  targetPlayerId?: ID;
  startDate: Timestamp;
  endDate: Timestamp;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
}

export interface ScoutReport {
  id: ID;
  assignmentId: ID;
  playerId: ID;
  generatedAt: Timestamp;
}