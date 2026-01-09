import { ID, Timestamp } from "./types";
import * as People from "./people";
import * as Club from "./club";
import * as Competition from "./competition";
import * as Match from "./match";
import * as Contract from "./contract";
import * as Tactics from "./tactics";
import * as Stats from "./stats";
import * as Events from "./events";
import * as Geo from "./geo";
import * as Scouting from "./scouting";

export interface MetaState {
  version: string;
  saveName: string;
  currentDate: Timestamp;
  currentUserManagerId: ID;
  userClubId: ID | null;
  activeSeasonId: ID;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PeopleDomain {
  managers: Record<ID, People.Manager>;
  players: Record<ID, People.Player>;
  staff: Record<ID, People.Staff>;
  playerStates: Record<ID, Stats.PlayerState>;
  playerInjuries: Record<ID, Stats.PlayerInjury>;
  playerSecondaryPositions: Record<string, Stats.PlayerSecondaryPosition[]>;
}

export interface ClubDomain {
  clubs: Record<ID, Club.Club>;
  infras: Record<ID, Club.ClubInfra>;
  finances: Record<ID, Club.ClubFinances>;
  relationships: Record<ID, Club.ClubRelationship>;
  rivalries: Record<string, Club.ClubRivalry[]>;
  stadiums: Record<ID, Club.Stadium>;
  sponsorships: Record<ID, Club.Sponsorship>;
}

export type StandingsLookup = Record<string, ID>;

export interface CompetitionDomain {
  seasons: Record<ID, Competition.Season>;
  competitions: Record<ID, Competition.Competition>;
  competitionSeasons: Record<ID, Competition.CompetitionSeason>;
  clubCompetitionSeasons: Record<ID, Competition.ClubCompetitionSeason>;
  fases: Record<ID, Competition.CompetitionFase>;
  groups: Record<ID, Competition.CompetitionGroup>;
  standings: Record<ID, Competition.CompetitionStandings>;
  standingsLookup: StandingsLookup;
  rules: {
    classification: Record<ID, Competition.ClassificationRule>;
    prizes: Record<ID, Competition.PrizeRule>;
  };
}

export interface MatchDomain {
  matches: Record<ID, Match.Match>;
  events: Record<ID, Match.MatchEvent[]>;
  playerStats: Record<ID, Match.PlayerMatchStats>;
  formations: Record<ID, Tactics.Formation>;
  positions: Record<ID, Tactics.Position>;
  teamTactics: Record<ID, Tactics.TeamTactics>;
  tempLineup: Match.TempLineup | null;
}

export interface MarketDomain {
  contracts: Record<ID, Contract.Contract>;
  staffContracts: Record<ID, Contract.StaffContract>;
  clubManagers: Record<ID, Contract.ClubManager>;
  transferOffers: Record<ID, Contract.TransferOffer>;
  loans: Record<ID, Contract.PlayerLoan>;
  scoutingKnowledge: Record<string, Scouting.ScoutingKnowledge>;
  playerContractIndex: Record<ID, ID>;
  clubSquadIndex: Record<ID, ID[]>;
}

export interface WorldDomain {
  nations: Record<ID, Geo.Nation>;
  cities: Record<ID, Geo.City>;
}

export interface SystemDomain {
  news: Record<ID, Events.NewsItem>;
  notifications: Record<ID, Events.Notification>;
  scheduledEvents: Record<ID, Events.ScheduledEvent>;
  financialEntries: Record<ID, Club.FinancialEntry>;
  stats: {
    playerSeason: Record<string, Stats.PlayerSeasonStats>;
  };
}

export interface GameState {
  meta: MetaState;
  people: PeopleDomain;
  clubs: ClubDomain;
  competitions: CompetitionDomain;
  matches: MatchDomain;
  market: MarketDomain;
  world: WorldDomain;
  system: SystemDomain;
}
