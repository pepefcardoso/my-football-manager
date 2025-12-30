import { ID } from "./types";

export interface Formation {
  id: ID;
  name: string;
}

export interface Position {
  id: ID;
  name: string;
}

export interface FormationPosition {
  id: ID;
  formationId: ID;
  positionId: ID;
  gridX: number;
  gridY: number;
}

export interface TeamTactics {
  id: ID;
  clubId: ID;
  formationId: ID;
  mentality: string;
  passingStyle: string;
  pressingIntensity: string;
  tempo: string;
}
