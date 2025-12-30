import { ID, Timestamp, Attribute, Foot } from "./types";

export interface Manager {
  id: ID;
  name: string;
  nationId: ID;
  birthDate: Timestamp;
  isHuman: boolean;
  reputation: number;
  preferredStyle: string;
  preferredFormation: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Player {
  id: ID;
  name: string;
  nickname: string;
  nationId: ID;
  birthDate: Timestamp;
  primaryPositionId: ID;
  preferredFoot: Foot;
  crossing: Attribute;
  finishing: Attribute;
  passing: Attribute;
  technique: Attribute;
  defending: Attribute;
  gkReflexes: Attribute;
  gkRushingOut: Attribute;
  gkDistribution: Attribute;
  speed: Attribute;
  force: Attribute;
  stamina: Attribute;
  intelligence: Attribute;
  determination: Attribute;
  potential: Attribute;
  proneToInjury: Attribute;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Staff {
  id: ID;
  name: string;
  nationId: ID;
  birthDate: Timestamp;
  function: string;
  overall: Attribute;
  potential: Attribute;
}
