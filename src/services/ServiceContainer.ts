import { repositoryContainer } from "../repositories/RepositoryContainer";
import { UnitOfWork } from "../repositories/UnitOfWork";
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
import { SeasonTransitionManager } from "./season/SeasonTransitionManager";
import type { IUnitOfWork } from "../repositories/IUnitOfWork";
import { StaffService } from "./StaffService";
import { StatsService } from "./StatsService";
import { CupProgressionManager } from "./match/CupProgressionManager";
import { MatchResultProcessor } from "./match/MatchResultProcessor";
import { TransferWindowManager } from "./transfer/TransferWindowManager";
import { TransferService } from "./transfer/TransferService";
import { SquadAnalysisService } from "./ai/SquadAnalysisService";
import { AITransferDecisionMaker } from "./ai/AITransferDecisionMaker";
import { DailyTransferProcessor } from "./ai/DailyTransferProcessor";
import { NarrativeService } from "./narrative/NarrativeService";
import { CPUSimulationService } from "./ai/CPUSimulationService";
import { PlayerDevelopmentService } from "./PlayerDevelopmentService";
import { ValuationService } from "./finance/ValuationService";
import { OperationalCostsService } from "./finance/OperationalCostsService";
import { RevenueService } from "./finance/RevenueService";
import { MatchTacticsManager } from "./match/MatchTacticsManager";
import { MatchSubstitutionManager } from "./match/MatchSubstitutionManager";
import { GameEventBus } from "../lib/GameEventBus";
import {
  GameEventType,
  type ContractExpiredPayload,
  type FinancialCrisisPayload,
  type MatchFinishedPayload,
  type TransferCompletedPayload,
  type StadiumCapacityPressuredPayload,
  type InfrastructureDegradedPayload,
} from "../domain/GameEventTypes";
import { TransferValidator } from "../domain/validators/TransferValidator";
import { YouthAcademyService } from "./YouthAcademyService";
import { CompetitiveAnalysisService } from "./CompetitiveAnalysisService";
import { InfrastructureHistoryService } from "./InfrastructureHistoryService";
import type { IRepositoryContainer } from "../repositories/IRepositories";

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
  public readonly matchResult: MatchResultProcessor;
  public readonly player: PlayerService;
  public readonly scouting: ScoutingService;
  public readonly season: SeasonService;
  public readonly seasonTransition: SeasonTransitionManager;
  public readonly staff: StaffService;
  public readonly stats: StatsService;
  public readonly transferWindow: TransferWindowManager;
  public readonly transfer: TransferService;
  public readonly squadAnalysis: SquadAnalysisService;
  public readonly aiTransferDecisionMaker: AITransferDecisionMaker;
  public readonly dailyTransferProcessor: DailyTransferProcessor;
  public readonly narrativeService: NarrativeService;
  public readonly cpuSimulation: CPUSimulationService;
  public readonly playerDevelopment: PlayerDevelopmentService;
  public readonly valuationService: ValuationService;
  public readonly operationalCosts: OperationalCostsService;
  public readonly revenueService: RevenueService;
  public readonly youthAcademy: YouthAcademyService;
  public readonly competitiveAnalysis: CompetitiveAnalysisService;
  public readonly infrastructureHistory: InfrastructureHistoryService;

  constructor(
    repos: IRepositoryContainer,
    unitOfWork?: IUnitOfWork,
    eventBus?: GameEventBus
  ) {
    this.unitOfWork = unitOfWork || new UnitOfWork();
    this.eventBus = eventBus || new GameEventBus();

    this.financialPenalty = new FinancialPenaltyService(repos);
    this.stats = new StatsService(repos);
    this.matchResult = new MatchResultProcessor(repos, this.stats);
    this.cupProgression = new CupProgressionManager(repos);
    this.contract = new ContractService(repos, this.eventBus);
    this.financialHealth = new FinancialHealthChecker(repos, this.eventBus);
    this.calendar = new CalendarService(repos);
    this.marketing = new MarketingService(repos);
    this.player = new PlayerService(repos);
    this.scouting = new ScoutingService(repos);
    this.staff = new StaffService(repos);
    this.playerDevelopment = new PlayerDevelopmentService(repos);

    this.youthAcademy = new YouthAcademyService(repos);

    this.dailySimulation = new DailySimulationService(
      repos,
      this.playerDevelopment
    );
    this.season = new SeasonService(repos);
    this.valuationService = new ValuationService(repos);
    this.operationalCosts = new OperationalCostsService(repos);
    this.revenueService = new RevenueService(repos);

    this.competitiveAnalysis = new CompetitiveAnalysisService(repos);
    this.infrastructureHistory = new InfrastructureHistoryService(repos);

    this.infrastructure = new InfrastructureService(repos, this.eventBus);

    this.finance = new FinanceService(
      repos,
      this.operationalCosts,
      this.revenueService,
      this.contract,
      this.infrastructure
    );

    this.seasonTransition = new SeasonTransitionManager(
      repos,
      this.season,
      this.youthAcademy
    );

    this.transferWindow = new TransferWindowManager(repos);

    const transferValidator = new TransferValidator(repos);
    this.transfer = new TransferService(
      repos,
      this.eventBus,
      transferValidator
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
    this.narrativeService = new NarrativeService(repos, this.eventBus);
    this.cpuSimulation = new CPUSimulationService(
      repos,
      this.dailySimulation,
      this.staff
    );

    const matchTactics = new MatchTacticsManager(repos);
    const matchSubstitution = new MatchSubstitutionManager(repos);

    this.match = new MatchService(
      repos,
      this.eventBus,
      this.finance,
      matchSubstitution,
      matchTactics
    );

    if (!unitOfWork && !eventBus) {
      this.setupSubscriptions();
    }
  }

  private setupSubscriptions() {
    this.eventBus.subscribe(
      GameEventType.MATCH_FINISHED,
      async (payload: MatchFinishedPayload) => {
        await this.matchResult.handleMatchFinished(payload);

        await this.marketing.processMatchResult(
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

    // **NOVOS EVENTOS**
    this.eventBus.subscribe(
      GameEventType.STADIUM_CAPACITY_PRESSURED,
      async (payload: StadiumCapacityPressuredPayload) => {
        console.log(
          `🚨 [CAPACITY ALERT] Team ${payload.teamId}: Stadium at ${(
            payload.utilizationRate * 100
          ).toFixed(1)}% capacity. ` +
            `Lost revenue: €${payload.lostRevenue.toLocaleString()}/season. ` +
            `Recommended expansion: ${
              payload.recommendedExpansion
            } seats (€${payload.expansionCost.toLocaleString()})`
        );

        // TODO: Create scheduled event or notification for user
      }
    );

    this.eventBus.subscribe(
      GameEventType.INFRASTRUCTURE_DEGRADED,
      async (payload: InfrastructureDegradedPayload) => {
        console.log(
          `⚠️ [DEGRADATION ALERT] Team ${payload.teamId}: ${payload.facilityType} quality dropped to ${payload.currentQuality} ` +
            `(below minimum ${
              payload.minimumQuality
            }). Annual maintenance: €${payload.maintenanceCost.toLocaleString()}`
        );

        // TODO: Create scheduled event or notification for user
      }
    );
  }
}

export const serviceContainer = new ServiceContainer(repositoryContainer);
