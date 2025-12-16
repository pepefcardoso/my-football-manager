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
import { TransferWindowManager } from "./transfer/TransferWindowManager";
import { TransferService } from "./transfer/TransferService";
import { SquadAnalysisService } from "./ai/SquadAnalysisService";
import { AITransferDecisionMaker } from "./ai/AITransferDecisionMaker";
import { DailyTransferProcessor } from "./ai/DailyTransferProcessor";
import { EventService } from "./narrative/EventService";
import { CPUSimulationService } from "./ai/CPUSimulationService";
import { PlayerDevelopmentService } from "./PlayerDevelopmentService";

export class ServiceContainer implements IServiceContainer {
  public readonly unitOfWork: UnitOfWork;
  public readonly eventBus: GameEventBus;
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
  public readonly transferWindow: TransferWindowManager;
  public readonly transfer: TransferService;
  public readonly squadAnalysis: SquadAnalysisService;
  public readonly aiTransferDecisionMaker: AITransferDecisionMaker;
  public readonly dailyTransferProcessor: DailyTransferProcessor;
  public readonly eventService: EventService;
  public readonly cpuSimulation: CPUSimulationService;
  public readonly playerDevelopment: PlayerDevelopmentService;

  constructor(repos: IRepositoryContainer) {
    this.unitOfWork = new UnitOfWork();
    this.eventBus = new GameEventBus();

    this.wageCalculator = new WageCalculator(repos);
    this.financialPenalty = new FinancialPenaltyService(repos);
    this.matchRevenue = new MatchRevenueCalculator(repos);
    this.matchResult = new MatchResultProcessor(repos);
    this.matchFinancials = new MatchFinancialsProcessor(repos);
    this.matchFanSatisfaction = new MatchFanSatisfactionProcessor(repos);
    this.cupProgression = new CupProgressionManager(repos);
    this.stats = new StatsService(repos);
    this.contract = new ContractService(repos, this.eventBus);
    this.financialHealth = new FinancialHealthChecker(repos, this.eventBus);
    this.match = new MatchService(repos, this.eventBus);
    this.calendar = new CalendarService(repos);
    this.infrastructure = new InfrastructureService(repos);
    this.marketing = new MarketingService(repos);
    this.player = new PlayerService(repos);
    this.scouting = new ScoutingService(repos);
    this.staff = new StaffService(repos);
    this.playerDevelopment = new PlayerDevelopmentService(repos);
    this.dailySimulation = new DailySimulationService(repos, this.playerDevelopment);
    this.season = new SeasonService(repos);
    this.finance = new FinanceService(repos, this.eventBus);
    this.promotionRelegation = new PromotionRelegationService(repos);
    this.seasonTransition = new SeasonTransitionManager(
      repos,
      this.promotionRelegation,
      this.season
    );
    this.transferWindow = new TransferWindowManager(repos);
    this.transfer = new TransferService(repos, this.unitOfWork, this.eventBus);
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
    this.setupSubscriptions();
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
