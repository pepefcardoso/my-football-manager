import { Logger } from "./Logger";
import type {
  ContractExpiredPayload,
  FinancialCrisisPayload,
  GameEventType,
  MatchFinishedPayload,
  ProposalReceivedPayload,
  ScheduledEventPayload,
  TransferCompletedPayload,
  StadiumCapacityPressuredPayload,
  InfrastructureDegradedPayload,
  InfrastructureCompletedPayload,
} from "../domain/GameEventTypes";

type EventHandler<T> = (payload: T) => Promise<void> | void;

export class GameEventBus {
  private handlers: Map<string, EventHandler<any>[]> = new Map();
  private logger: Logger;

  constructor() {
    this.logger = new Logger("GameEventBus");
  }

  public subscribe(
    eventType: GameEventType.MATCH_FINISHED,
    handler: EventHandler<MatchFinishedPayload>
  ): void;
  public subscribe(
    eventType: GameEventType.CONTRACT_EXPIRED,
    handler: EventHandler<ContractExpiredPayload>
  ): void;
  public subscribe(
    eventType: GameEventType.FINANCIAL_CRISIS,
    handler: EventHandler<FinancialCrisisPayload>
  ): void;
  public subscribe(
    eventType: GameEventType.TRANSFER_COMPLETED,
    handler: EventHandler<TransferCompletedPayload>
  ): void;
  public subscribe(
    eventType: GameEventType.PROPOSAL_RECEIVED,
    handler: EventHandler<ProposalReceivedPayload>
  ): void;
  public subscribe(
    eventType: GameEventType.SCHEDULED_EVENT_TRIGGERED,
    handler: EventHandler<ScheduledEventPayload>
  ): void;
  public subscribe(
    eventType: GameEventType.STADIUM_CAPACITY_PRESSURED,
    handler: EventHandler<StadiumCapacityPressuredPayload>
  ): void;
  public subscribe(
    eventType: GameEventType.INFRASTRUCTURE_DEGRADED,
    handler: EventHandler<InfrastructureDegradedPayload>
  ): void;
   public subscribe(
    eventType: GameEventType.INFRASTRUCTURE_COMPLETED,
    handler: EventHandler<InfrastructureCompletedPayload>
  ): void;

  public subscribe<T>(
    eventType: GameEventType,
    handler: EventHandler<T>
  ): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
    this.logger.debug(`Novo subscriber registrado para ${eventType}`);
  }

  public unsubscribe<T>(
    eventType: GameEventType,
    handler: EventHandler<T>
  ): void {
    if (!this.handlers.has(eventType)) return;

    const handlers = this.handlers.get(eventType)!;
    const index = handlers.indexOf(handler);

    if (index > -1) {
      handlers.splice(index, 1);
    }
  }

  public async publish(
    eventType: GameEventType.MATCH_FINISHED,
    payload: MatchFinishedPayload
  ): Promise<void>;
  public async publish(
    eventType: GameEventType.CONTRACT_EXPIRED,
    payload: ContractExpiredPayload
  ): Promise<void>;
  public async publish(
    eventType: GameEventType.FINANCIAL_CRISIS,
    payload: FinancialCrisisPayload
  ): Promise<void>;
  public async publish(
    eventType: GameEventType.TRANSFER_COMPLETED,
    payload: TransferCompletedPayload
  ): Promise<void>;
  public async publish(
    eventType: GameEventType.PROPOSAL_RECEIVED,
    payload: ProposalReceivedPayload
  ): Promise<void>;
  public async publish(
    eventType: GameEventType.SCHEDULED_EVENT_TRIGGERED,
    payload: ScheduledEventPayload
  ): Promise<void>;
  public async publish(
    eventType: GameEventType.STADIUM_CAPACITY_PRESSURED,
    payload: StadiumCapacityPressuredPayload
  ): Promise<void>;
  public async publish(
    eventType: GameEventType.INFRASTRUCTURE_DEGRADED,
    payload: InfrastructureDegradedPayload
  ): Promise<void>;
  public async publish(
    eventType: GameEventType.INFRASTRUCTURE_COMPLETED,
    payload: InfrastructureCompletedPayload
  ): Promise<void>;

  public async publish<T>(eventType: GameEventType, payload: T): Promise<void> {
    const handlers = this.handlers.get(eventType);

    if (!handlers || handlers.length === 0) {
      return;
    }

    this.logger.info(`Evento publicado: ${eventType}`, payload);

    const results = await Promise.allSettled(
      handlers.map((handler) => handler(payload))
    );

    results.forEach((result, index) => {
      if (result.status === "rejected") {
        this.logger.error(
          `Erro ao processar evento ${eventType} no handler ${index}:`,
          result.reason
        );
      }
    });
  }
}
