import { ID, Timestamp, Money, Attribute } from "./types";

export type CompetitionObjective =
  | "CHAMPION"
  | "PROMOTION"
  | "TOP_4"
  | "TOP_6"
  | "MID_TABLE"
  | "AVOID_RELEGATION";

export type CupObjective =
  | "WIN"
  | "FINAL"
  | "SEMI_FINAL"
  | "QUARTER_FINAL"
  | "ROUND_OF_16"
  | "NOT_IMPORTANT";

export type InfrastructureType =
  | "STADIUM_EXPANSION"
  | "STADIUM_UPGRADE"
  | "STADIUM_PITCH_UPGRADE"
  | "NEW_STADIUM"
  | "YOUTH_ACADEMY_UPGRADE"
  | "TRAINING_CENTER_UPGRADE"
  | "MEDICAL_CENTER_UPGRADE"
  | "DATA_ANALYSIS_CENTER_UPGRADE"
  | "ADMINISTRATION_UPGRADE";

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
  activeMarketingCampaign?: MarketingCampaign;
}

export interface MarketingCampaign {
  type: "FAN_BASE_GROWTH" | "MERCHANDISE_SALES" | "SPONSORSHIP_ATTRACTION";
  startDate: Timestamp;
  endDate: Timestamp;
  cost: Money;
  effectiveness: Attribute;
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
  leagueObjective: CompetitionObjective;
  nationalCupObjective: CupObjective;
  stateLeagueObjective: CupObjective;
  continentalCupObjective: CupObjective;
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
  category: "WAGES" | "TICKETS" | "TRANSFERS" | "SPONSORS";
  description: string;
}

export interface ConstructionProject {
  id: ID;
  clubId: ID;
  type: InfrastructureType;
  startDate: Timestamp;
  finishDate: Timestamp;
  cost: Money;
  targetCapacity?: number;
  targetLevel?: Attribute;
  status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
}
