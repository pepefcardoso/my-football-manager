import { ID, Timestamp, Attribute, Foot, Money } from "./types";

export interface Manager {
  id: ID;
  name: string;
  nationId: ID;
  birthDate: Timestamp;
  isHuman: boolean;
  reputation: number;
  careerHistory: ManagerCareerRecord[];
  titles: TitleRecord[];
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
  overall: number;
  potential: Attribute;
  proneToInjury: Attribute;
  marketValue: Money;
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

export interface ManagerCareerRecord {
  id: ID;
  managerId: ID;
  clubId: ID;
  clubName: string;
  startDate: Timestamp;
  endDate: Timestamp | null;
  gamesManaged: number;
  wins: number;
  draws: number;
  losses: number;
  trophiesWon: string[];
}

export interface TitleRecord {
  id: ID;
  seasonId: ID;
  competitionId: ID;
  winnerClubId: ID;
  runnerUpClubId: ID;
  managerId: ID;
}
