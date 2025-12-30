import { ID, Money, Timestamp } from "./types";

export interface Season {
  id: ID;
  year: number;
  beginning: Timestamp;
  ending: Timestamp;
  active: boolean;
}

export interface Competition {
  id: ID;
  name: string;
  nickname: string;
  type: string;
  hierarchyLevel: number;
  standardFormatType: string;
  standingsPriority: string;
}

export interface CompetitionSeason {
  id: ID;
  competitionId: ID;
  seasonId: ID;
  tieBreakingCriteria1: string;
  tieBreakingCriteria2: string;
  tieBreakingCriteria3: string;
  tieBreakingCriteria4: string;
}

export interface CompetitionFase {
  id: ID;
  competitionSeasonId: ID;
  name: string;
  orderIndex: number;
  type: string;
  isTwoLeggedKnockout: boolean;
  isFinalSingleGame: boolean;
}

export interface CompetitionGroup {
  id: ID;
  competitionFaseId: ID;
  name: string;
}

export interface ClubCompetitionSeason {
  id: ID;
  competitionSeasonId: ID;
  clubId: ID;
}

export interface CompetitionStandings {
  id: ID;
  competitionGroupId: ID;
  clubCompetitionSeasonId: ID;
  points: number;
  gamesPlayed: number;
  wins: number;
  draws: number;
  defeats: number;
  goalsScored: number;
  goalsConceded: number;
  goalsBalance: number;
}

export interface ClassificationRule {
  id: ID;
  competitionSeasonId: ID;
  competitionFaseId: ID;
  ruleType: string; // 'PROMOTION', 'RELEGATION', 'CONTINENTAL_QUALIFICATION'
  startPosition: number;
  endPosition: number;
  slotQuantity: number;
  priorityOrder: number;
  destinyCompetitionId: ID;
  destinyStageKey: string;
}

export interface PrizeRule {
  id: ID;
  competitionSeasonId: ID;
  competitionFaseId: ID | null;
  ruleType: string; // 'POSITION_FINAL', 'WIN_MATCH', 'DRAW_MATCH'
  position: number | null;
  amount: Money;
}