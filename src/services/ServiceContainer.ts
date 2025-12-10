import type { IRepositoryContainer } from "../repositories/IRepositories";
import { repositoryContainer } from "../repositories/RepositoryContainer";
import { CalendarService } from "./CalendarService";
import { ContractService } from "./ContractService";
import { DailySimulationService } from "./DailySimulationService";
import { FinanceService } from "./FinanceService";
import { FinancialHealthChecker } from "./finance/FinancialHealthChecker";
import { FinancialPenaltyService } from "./finance/FinancialPenaltyService";
import { WageCalculator } from "./finance/WageCalculator";
import { InfrastructureService } from "./InfrastructureService";
import type { IServiceContainer } from "./IServiceContainer";
import { MarketingService } from "./MarketingService";
import { MatchService } from "./MatchService";
import { PlayerService } from "./PlayerService";
import { ScoutingService } from "./ScoutingService";
import { SeasonService } from "./SeasonService";
import { PromotionRelegationService } from "./season/PromotionRelegationService";
import { SeasonTransitionManager } from "./season/SeasonTransitionManager";
import { StaffService } from "./StaffService";
import { StatsService } from "./StatsService";
import { CupProgressionManager } from "./match/CupProgressionManager";
import { MatchFanSatisfactionProcessor } from "./match/MatchFanSatisfactionProcessor";
import { MatchFinancialsProcessor } from "./match/MatchFinancialsProcessor";
import { MatchResultProcessor } from "./match/MatchResultProcessor";
import { MatchRevenueCalculator } from "./match/MatchRevenueCalculator";

export class ServiceContainer implements IServiceContainer {
  public readonly calendar: CalendarService;
  public readonly contract: ContractService;
  public readonly dailySimulation: DailySimulationService;
  public readonly finance: FinanceService;
  public readonly financialHealth: FinancialHealthChecker;
  public readonly financialPenalty: FinancialPenaltyService;
  public readonly wageCalculator: WageCalculator;
  public readonly infrastructure: InfrastructureService;
  public readonly marketing: MarketingService;
  public readonly match: MatchService;
  public readonly cupProgression: CupProgressionManager;
  public readonly matchFanSatisfaction: MatchFanSatisfactionProcessor;
  public readonly matchFinancials: MatchFinancialsProcessor;
  public readonly matchResult: MatchResultProcessor;
  public readonly matchRevenue: MatchRevenueCalculator;
  public readonly player: PlayerService;
  public readonly scouting: ScoutingService;
  public readonly season: SeasonService;
  public readonly promotionRelegation: PromotionRelegationService;
  public readonly seasonTransition: SeasonTransitionManager;
  public readonly staff: StaffService;
  public readonly stats: StatsService;

  constructor(repos: IRepositoryContainer) {
    this.calendar = new CalendarService(repos);
    this.contract = new ContractService(repos);
    this.infrastructure = new InfrastructureService(repos);
    this.marketing = new MarketingService(repos);
    this.player = new PlayerService(repos);
    this.scouting = new ScoutingService(repos);
    this.staff = new StaffService(repos);
    this.stats = new StatsService(repos);
    this.dailySimulation = new DailySimulationService(repos);
    this.season = new SeasonService(repos);
    this.promotionRelegation = new PromotionRelegationService(repos);
    this.seasonTransition = new SeasonTransitionManager(
      repos,
      this.promotionRelegation,
      this.season
    );
    this.match = new MatchService(repos);

    this.financialPenalty = new FinancialPenaltyService(repos);
    this.wageCalculator = new WageCalculator(repos);
    this.financialHealth = new FinancialHealthChecker(repos);
    this.finance = new FinanceService(repos);

    this.cupProgression = new CupProgressionManager(repos);
    this.matchFanSatisfaction = new MatchFanSatisfactionProcessor(repos);
    this.matchFinancials = new MatchFinancialsProcessor(repos);
    this.matchResult = new MatchResultProcessor(repos);
    this.matchRevenue = new MatchRevenueCalculator(repos);
  }
}

export const serviceContainer = new ServiceContainer(repositoryContainer);
