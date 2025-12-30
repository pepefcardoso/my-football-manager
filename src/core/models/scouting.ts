import { Attribute, ID, Timestamp } from "./types";

export interface ScoutingKnowledge {
  id: ID;
  observingClubId: ID;
  targetPlayerId: ID;
  knowledgeLevel: Attribute;
  lastUpdated: Timestamp;
}