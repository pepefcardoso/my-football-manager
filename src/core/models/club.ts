import { ID, Timestamp, Money, Attribute } from "./types";

export interface Club {
  id: ID;
  dateFounded: Timestamp;
  name: string;
  nickname: string;
  cityId: ID;
  nationId: ID;
  primaryColor: string;
  secondaryColor: string;
  badgePath: string;
  kitHomePath: string;
  kitAwayPath: string;

  fanBaseCurrent: number;
  fanBaseMax: number;
  fanBaseMin: number;
  reputation: number;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ClubInfra {
  clubId: ID;
  stadiumId: ID;
  reserveStadiumId: ID;
  youthAcademyLevel: Attribute;
  dataAnalysisCenterLevel: Attribute;
  trainingCenterLevel: Attribute;
  medicalCenterLevel: Attribute;
  administrationLevel: Attribute;
}

export interface ClubFinances {
  clubId: ID;
  balanceCurrent: Money;
  debtHistorical: Money;
  debtInterestRate: number;
  accumulatedManagementBalance: Money;
  monthlyMembershipRevenue: Money;
}

export interface Sponsorship {
  id: ID;
  clubId: ID;
  name: string;
  totalValue: Money;
  yearsDuration: number;
  type: string;
  expirationDate: Timestamp;
}

export interface Stadium {
  id: ID;
  clubId: ID;
  name: string;
  nickname: string;
  capacity: number;
  maxCapacity: number;
  quality: Attribute;
  pitchQuality: Attribute;
  isUnderConstruction: boolean;
  constructionFinishDate: Timestamp | null;
  newCapacityTarget: number | null;
}

export interface ClubRelationship {
  clubId: ID;
  boardConfidence: Attribute;
  fanApproval: Attribute;
  leagueObjective: string;
  nationalCupObjective: string;
  stateLeagueObjective: string;
  continentalCupObjective: string;
  financialPatience: Attribute;
}

export interface ClubRivalry {
  clubId: ID;
  rivalClubId: ID;
  intensity: Attribute;
}

export interface ClubCompetitionHistory {
  id: ID;
  competitionSeasonId: ID;
  clubId: ID;
  finalPosition: number;
  stageReached: string;
  isTitle: boolean;
}

export interface FinancialEntry {
  id: ID;
  clubFinancesId: ID;
  seasonId: ID;
  date: Timestamp;
  amount: Money;
  category: string; // 'WAGES', 'TICKETS', 'TRANSFERS', 'SPONSORS'
  description: string;
}