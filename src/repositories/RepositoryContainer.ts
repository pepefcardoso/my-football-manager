import { type DbInstance, type DbTransaction } from "../lib/db";
import {
  PlayerRepository,
  playerRepository,
} from "../repositories/PlayerRepository";
import { TeamRepository, teamRepository } from "../repositories/TeamRepository";
import {
  StaffRepository,
  staffRepository,
} from "../repositories/StaffRepository";
import {
  MatchRepository,
  matchRepository,
} from "../repositories/MatchRepository";
import {
  CompetitionRepository,
  competitionRepository,
} from "../repositories/CompetitionRepository";
import {
  SeasonRepository,
  seasonRepository,
} from "../repositories/SeasonRepository";
import {
  FinancialRepository,
  financialRepository,
} from "../repositories/FinancialRepository";
import {
  ScoutingRepository,
  scoutingRepository,
} from "../repositories/ScoutingRepository";
import {
  TransferRepository,
  transferRepository,
} from "../repositories/TransferRepository";
import type { IRepositoryContainer } from "./IRepositories";
import {
  transferProposalRepository,
  TransferProposalRepository,
} from "./TransferProposalRepository";
import {
  clubInterestRepository,
  ClubInterestRepository,
} from "./ClubInterestRepository";
import {
  gameStateRepository,
  GameStateRepository,
} from "./GameStateRepository";
import {
  scheduledEventRepository,
  ScheduledEventRepository,
} from "./ScheduledEventRepository";

export class RepositoryFactory {
  static create(context: DbInstance | DbTransaction): IRepositoryContainer {
    return {
      players: new PlayerRepository(context),
      teams: new TeamRepository(context),
      staff: new StaffRepository(context),
      matches: new MatchRepository(context),
      competitions: new CompetitionRepository(context),
      seasons: new SeasonRepository(context),
      financial: new FinancialRepository(context),
      scouting: new ScoutingRepository(context),
      transfers: new TransferRepository(context),
      transferProposals: new TransferProposalRepository(context),
      clubInterests: new ClubInterestRepository(context),
      gameState: new GameStateRepository(context),
      scheduledEvents: new ScheduledEventRepository(context),
    };
  }
}

class ProductionRepositoryContainer implements IRepositoryContainer {
  public readonly players = playerRepository;
  public readonly teams = teamRepository;
  public readonly staff = staffRepository;
  public readonly matches = matchRepository;
  public readonly competitions = competitionRepository;
  public readonly seasons = seasonRepository;
  public readonly financial = financialRepository;
  public readonly scouting = scoutingRepository;
  public readonly transfers = transferRepository;
  public readonly transferProposals = transferProposalRepository;
  public readonly clubInterests = clubInterestRepository;
  public readonly gameState = gameStateRepository;
  public readonly scheduledEvents = scheduledEventRepository;
}

export const repositoryContainer: IRepositoryContainer =
  new ProductionRepositoryContainer();

export function createRepositoryContainer(
  overrides?: Partial<IRepositoryContainer>
): IRepositoryContainer {
  return {
    ...repositoryContainer,
    ...overrides,
  };
}
