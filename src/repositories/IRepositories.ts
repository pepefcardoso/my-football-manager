import type {
  Player,
  Team,
  Staff,
  Match,
  Competition,
  Season,
  ScoutingReport,
  FinancialRecord,
} from "../domain/models";
import type { ClubInterestInsert } from "./ClubInterestRepository";

export interface PlayerCompetitionStats {
  id: number;
  playerId: number | null;
  teamId: number | null;
  competitionId: number | null;
  seasonId: number | null;
  matches: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  saves: number;
  cleanSheets: number;
  goalsConceded: number;
  minutesPlayed: number;
}

export interface IPlayerRepository {
  findById(id: number): Promise<Player | undefined>;
  findByTeamId(teamId: number): Promise<Player[]>;
  findFreeAgents(): Promise<Player[]>;
  findYouthAcademy(teamId: number): Promise<Player[]>;

  create(player: Partial<Player>): Promise<number>;
  update(id: number, data: Partial<Player>): Promise<void>;

  updateConditionBatch(
    updates: Array<{
      id: number;
      energy: number;
      fitness: number;
    }>
  ): Promise<void>;

  updateDailyStatsBatch(
    updates: Array<{
      id: number;
      energy: number;
      fitness: number;
      moral: number;
      overall?: number;
      injuryDays?: number;
      isInjured?: boolean;
    }>
  ): Promise<void>;
}

export interface ITeamRepository {
  findAll(): Promise<Team[]>;
  findById(id: number): Promise<Team | undefined>;
  findHumanTeam(): Promise<Team | undefined>;
  findByIdWithRelations(id: number): Promise<any>;

  update(id: number, data: Partial<Team>): Promise<void>;
  updateBudget(id: number, newBudget: number): Promise<void>;
}

export interface IStaffRepository {
  findById(id: number): Promise<Staff | undefined>;
  findByTeamId(teamId: number): Promise<Staff[]>;
  findFreeAgents(): Promise<Staff[]>;

  create(data: Partial<Staff>): Promise<number>;
  update(id: number, data: Partial<Staff>): Promise<void>;
  fire(id: number): Promise<void>;
}

export interface IClubInterestRepository {
  upsert(data: ClubInterestInsert): Promise<void>;
  findByPlayerId(playerId: number): Promise<any[]>;
  findByTeamId(teamId: number): Promise<any[]>;
  remove(teamId: number, playerId: number): Promise<void>;
  deleteOlderThan(dateThreshold: string): Promise<number>;
}

export interface IMatchRepository {
  findById(id: number): Promise<Match | undefined>;
  findByTeamAndSeason(teamId: number, seasonId: number): Promise<Match[]>;
  findByDateRange(startDate: string, endDate: string): Promise<Match[]>;
  findPendingMatchesByDate(date: string): Promise<Match[]>;

  updateMatchResult(
    id: number,
    homeScore: number,
    awayScore: number,
    attendance: number,
    ticketRevenue: number
  ): Promise<void>;

  createMatchEvents(
    events: Array<{
      matchId: number | null;
      minute: number;
      type: string;
      teamId: number | null;
      playerId: number | null;
      description: string | null;
    }>
  ): Promise<void>;

  createMany(matches: Array<Partial<Match>>): Promise<void>;
}

export interface ICompetitionRepository {
  findAll(): Promise<Competition[]>;
  findByCountry(country: string): Promise<Competition[]>;

  getStandings(competitionId: number, seasonId: number): Promise<any[]>;
  updateStanding(
    competitionId: number,
    seasonId: number,
    teamId: number,
    data: Partial<any>
  ): Promise<void>;

  getTeamForm(
    teamId: number,
    competitionId: number,
    seasonId: number
  ): Promise<("W" | "D" | "L")[]>;

  findPlayerStats(
    playerId: number,
    competitionId: number,
    seasonId: number
  ): Promise<PlayerCompetitionStats | undefined>;

  createPlayerStats(data: Partial<PlayerCompetitionStats>): Promise<void>;

  updatePlayerStats(
    id: number,
    data: Partial<PlayerCompetitionStats>
  ): Promise<void>;

  getTopScorers(
    competitionId: number,
    seasonId: number,
    limit?: number
  ): Promise<any[]>;

  getTopGoalkeepers(
    competitionId: number,
    seasonId: number,
    limit?: number
  ): Promise<any[]>;
}

export interface ISeasonRepository {
  findActiveSeason(): Promise<Season | undefined>;
  create(year: number, startDate: string, endDate: string): Promise<Season>;
}

export interface IFinancialRepository {
  addRecord(record: Partial<FinancialRecord>): Promise<void>;
  findByTeamAndSeason(
    teamId: number,
    seasonId: number
  ): Promise<FinancialRecord[]>;
  getBalance(teamId: number, seasonId: number): Promise<number>;
}

export interface IScoutingRepository {
  findByPlayerAndTeam(
    playerId: number,
    teamId: number
  ): Promise<ScoutingReport | undefined>;
  findByTeam(teamId: number): Promise<any[]>;
  findActiveReports(): Promise<ScoutingReport[]>;

  upsert(data: Partial<ScoutingReport>): Promise<void>;
}

export interface ITransferRepository {
  create(data: any): Promise<void>;
  findRecent(limit?: number): Promise<any[]>;
  findByPlayerId(playerId: number): Promise<any[]>;
}

export interface ITransferProposalRepository {
  create(data: any): Promise<number>;
  findById(id: number): Promise<any>;
  update(id: number, data: any): Promise<void>;
  delete(id: number): Promise<void>;
  findSentByTeam(teamId: number): Promise<any[]>;
  findReceivedByTeam(teamId: number): Promise<any[]>;
  findActiveProposal(
    playerId: number,
    fromTeamId: number,
    toTeamId: number
  ): Promise<any>;
  findActiveByPlayer(playerId: number): Promise<any[]>;
  expireProposals(currentDate: string): Promise<number>;
}

export interface IRepositoryContainer {
  players: IPlayerRepository;
  teams: ITeamRepository;
  staff: IStaffRepository;
  matches: IMatchRepository;
  competitions: ICompetitionRepository;
  seasons: ISeasonRepository;
  financial: IFinancialRepository;
  scouting: IScoutingRepository;
  transfers: ITransferRepository;
  transferProposals: ITransferProposalRepository;
  clubInterests: IClubInterestRepository;
}

export type ServiceFactory<T> = (deps: IRepositoryContainer) => T;
