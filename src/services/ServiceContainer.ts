import type { IRepositoryContainer } from "../repositories/IRepositories";
import { repositoryContainer } from "../repositories/RepositoryContainer";
import { CalendarService } from "./CalendarService";
import { ContractService } from "./ContractService";
import { DailySimulationService } from "./DailySimulationService";
import { FinanceService } from "./FinanceService";
import { InfrastructureService } from "./InfrastructureService";
import type { IServiceContainer } from "./IServiceContainer";
import { MarketingService } from "./MarketingService";
import { MatchService } from "./MatchService";
import { PlayerService } from "./PlayerService";
import { ScoutingService } from "./ScoutingService";
import { SeasonService } from "./SeasonService";
import { StaffService } from "./StaffService";
import { StatsService } from "./StatsService";

export class ServiceContainer implements IServiceContainer {
  public readonly calendar: CalendarService;
  public readonly contract: ContractService;
  public readonly dailySimulation: DailySimulationService;
  public readonly finance: FinanceService;
  public readonly infrastructure: InfrastructureService;
  public readonly marketing: MarketingService;
  public readonly match: MatchService;
  public readonly player: PlayerService;
  public readonly scouting: ScoutingService;
  public readonly season: SeasonService;
  public readonly staff: StaffService;
  public readonly stats: StatsService;

  constructor(repos: IRepositoryContainer) {
    this.calendar = new CalendarService();
    this.contract = new ContractService(repos);
    this.infrastructure = new InfrastructureService(repos);
    this.marketing = new MarketingService(repos);
    this.player = new PlayerService(repos);
    this.scouting = new ScoutingService(repos);
    this.staff = new StaffService(repos);
    this.stats = new StatsService(repos);
    this.dailySimulation = new DailySimulationService(repos);

    this.finance = new FinanceService(
      repos,
      this.contract,
      this.infrastructure
    );
    this.season = new SeasonService(repos, this.calendar);
    this.match = new MatchService(repos, this.marketing, this.stats);
  }
}

export const serviceContainer = new ServiceContainer(repositoryContainer);
