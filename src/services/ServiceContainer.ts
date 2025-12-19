import type { IRepositoryContainer } from "../repositories/IRepositories";
import { repositoryContainer } from "../repositories/RepositoryContainer";
import { UnitOfWork } from "../repositories/UnitOfWork";
import { GameEventBus } from "./events/GameEventBus";
import {
  GameEventType,
  type MatchFinishedPayload,
  type FinancialCrisisPayload,
  type ContractExpiredPayload,
  type TransferCompletedPayload,
} from "./events/GameEventTypes";
import { CalendarService } from "./CalendarService";
import { ContractService } from "./ContractService";
import { DailySimulationService } from "./DailySimulationService";
import { FinanceService } from "./FinanceService";
import { FinancialHealthChecker } from "./finance/FinancialHealthChecker";
import { FinancialPenaltyService } from "./finance/FinancialPenaltyService";
import { InfrastructureService } from "./InfrastructureService";
import type { IServiceContainer } from "./IServiceContainer";
import { MarketingService } from "./MarketingService";
import { MatchService } from "./MatchService";
import { PlayerService } from "./PlayerService";
import { ScoutingService } from "./ScoutingService";
import { SeasonService } from "./SeasonService";
import { PromotionRelegationService } from "./season/PromotionRelegationService";
import { SeasonTransitionManager } from "./season/SeasonTransitionManager";
import type { IUnitOfWork } from "../repositories/IUnitOfWork";
import { StaffService } from "./StaffService";
import { StatsService } from "./StatsService";
import { CupProgressionManager } from "./match/CupProgressionManager";
import { MatchFanSatisfactionProcessor } from "./match/MatchFanSatisfactionProcessor";
import { MatchResultProcessor } from "./match/MatchResultProcessor";
import { TransferWindowManager } from "./transfer/TransferWindowManager";
import { TransferService } from "./transfer/TransferService";
import { SquadAnalysisService } from "./ai/SquadAnalysisService";
import { AITransferDecisionMaker } from "./ai/AITransferDecisionMaker";
import { DailyTransferProcessor } from "./ai/DailyTransferProcessor";
import { EventService } from "./narrative/EventService";
import { CPUSimulationService } from "./ai/CPUSimulationService";
import { PlayerDevelopmentService } from "./PlayerDevelopmentService";
import { SalaryCalculatorService } from "./finance/SalaryCalculatorService";
import { OperationalCostsService } from "./finance/OperationalCostsService";
import { RevenueService } from "./finance/RevenueService";
import { MatchTacticsManager } from "./match/MatchTacticsManager";
import { MatchSubstitutionManager } from "./match/MatchSubstitutionManager";
import { TransferValidator } from "./transfer/validators/TransferValidator";

export class ServiceContainer implements IServiceContainer {
  public readonly unitOfWork: IUnitOfWork;
  public readonly eventBus: GameEventBus;
  public readonly calendar: CalendarService;
  public readonly contract: ContractService;
  public readonly dailySimulation: DailySimulationService;
  public readonly finance: FinanceService;
  public readonly financialHealth: FinancialHealthChecker;
  public readonly financialPenalty: FinancialPenaltyService;
  public readonly infrastructure: InfrastructureService;
  public readonly marketing: MarketingService;
  public readonly match: MatchService;
  public readonly cupProgression: CupProgressionManager;
  public readonly matchFanSatisfaction: MatchFanSatisfactionProcessor;
  public readonly matchResult: MatchResultProcessor;
  public readonly player: PlayerService;
  public readonly scouting: ScoutingService;
  public readonly season: SeasonService;
  public readonly promotionRelegation: PromotionRelegationService;
  public readonly seasonTransition: SeasonTransitionManager;
  public readonly staff: StaffService;
  public readonly stats: StatsService;
  public readonly transferWindow: TransferWindowManager;
  public readonly transfer: TransferService;
  public readonly squadAnalysis: SquadAnalysisService;
  public readonly aiTransferDecisionMaker: AITransferDecisionMaker;
  public readonly dailyTransferProcessor: DailyTransferProcessor;
  public readonly eventService: EventService;
  public readonly cpuSimulation: CPUSimulationService;
  public readonly playerDevelopment: PlayerDevelopmentService;
  public readonly salaryCalculator: SalaryCalculatorService;
  public readonly operationalCosts: OperationalCostsService;
  public readonly revenueService: RevenueService;
  public readonly matchSubstitution: MatchSubstitutionManager;
  public readonly matchTactics: MatchTacticsManager;
  public readonly transferValidator: TransferValidator;

  constructor(
    repos: IRepositoryContainer,
    unitOfWork?: IUnitOfWork,
    eventBus?: GameEventBus
  ) {
    this.unitOfWork = unitOfWork || new UnitOfWork();
    this.eventBus = eventBus || new GameEventBus();
    this.financialPenalty = new FinancialPenaltyService(repos);
    this.matchResult = new MatchResultProcessor(repos);
    this.matchFanSatisfaction = new MatchFanSatisfactionProcessor(repos);
    this.cupProgression = new CupProgressionManager(repos);
    this.stats = new StatsService(repos);
    this.contract = new ContractService(repos, this.eventBus);
    this.financialHealth = new FinancialHealthChecker(repos, this.eventBus);
    this.calendar = new CalendarService(repos);
    this.infrastructure = new InfrastructureService(repos);
    this.marketing = new MarketingService(repos);
    this.player = new PlayerService(repos);
    this.scouting = new ScoutingService(repos);
    this.staff = new StaffService(repos);
    this.playerDevelopment = new PlayerDevelopmentService(repos);
    this.dailySimulation = new DailySimulationService(
      repos,
      this.playerDevelopment
    );
    this.season = new SeasonService(repos);
    this.salaryCalculator = new SalaryCalculatorService(repos);
    this.operationalCosts = new OperationalCostsService(repos);
    this.revenueService = new RevenueService(repos);
    this.matchTactics = new MatchTacticsManager(repos);
    this.matchSubstitution = new MatchSubstitutionManager(repos);
    this.finance = new FinanceService(
      repos,
      this.financialHealth,
      this.salaryCalculator,
      this.operationalCosts,
      this.revenueService
    );
    this.promotionRelegation = new PromotionRelegationService(repos);
    this.seasonTransition = new SeasonTransitionManager(
      repos,
      this.promotionRelegation,
      this.season
    );
    this.transferWindow = new TransferWindowManager(repos);
    this.transferValidator = new TransferValidator(repos);
    this.transfer = new TransferService(
      repos,
      this.eventBus,
      this.transferValidator
    );
    this.squadAnalysis = new SquadAnalysisService(repos);
    this.aiTransferDecisionMaker = new AITransferDecisionMaker(
      repos,
      this.transfer,
      this.squadAnalysis,
      this.transferWindow,
      this.financialHealth
    );
    this.dailyTransferProcessor = new DailyTransferProcessor(
      repos,
      this.aiTransferDecisionMaker,
      this.transfer
    );
    this.eventService = new EventService(repos, this.eventBus);
    this.cpuSimulation = new CPUSimulationService(
      repos,
      this.dailySimulation,
      this.staff
    );
    this.match = new MatchService(
      repos,
      this.eventBus,
      this.finance,
      this.matchResult,
      this.matchSubstitution,
      this.matchTactics
    );
    if (!unitOfWork && !eventBus) {
      this.setupSubscriptions();
    }
  }

  private setupSubscriptions() {
    this.eventBus.subscribe(
      GameEventType.MATCH_FINISHED,
      async (payload: MatchFinishedPayload) => {
        if (payload.competitionId && payload.seasonId) {
          await this.matchResult.updateStandings(
            payload.competitionId,
            payload.seasonId,
            payload.homeTeamId,
            payload.awayTeamId,
            payload.homeScore,
            payload.awayScore
          );
        }

        await this.matchFanSatisfaction.updateSatisfactionForMatch(
          payload.matchId,
          payload.homeScore,
          payload.awayScore
        );

        await this.cupProgression.checkAndProgressCup(payload.matchId);
      }
    );

    this.eventBus.subscribe(
      GameEventType.FINANCIAL_CRISIS,
      async (payload: FinancialCrisisPayload) => {
        await this.financialPenalty.applyPenalties(
          payload.teamId,
          payload.severity,
          payload.fanSatisfaction
        );
      }
    );

    this.eventBus.subscribe(
      GameEventType.CONTRACT_EXPIRED,
      async (payload: ContractExpiredPayload) => {
        console.log(`Contrato expirado para jogador ${payload.playerId}`);
      }
    );

    this.eventBus.subscribe(
      GameEventType.TRANSFER_COMPLETED,
      async (payload: TransferCompletedPayload) => {
        console.log(
          `[EVENTO] Transferência Finalizada: Jogador ${payload.playerId} de ${payload.fromTeamId} para ${payload.toTeamId} por ${payload.fee}`
        );
      }
    );
  }
}

export const serviceContainer = new ServiceContainer(repositoryContainer);
