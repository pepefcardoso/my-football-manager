import { Logger } from "../../lib/Logger";
import {
  GameEventType,
  type MatchFinishedPayload,
  type ContractExpiredPayload,
  type FinancialCrisisPayload,
  type TransferCompletedPayload,
  type ProposalReceivedPayload,
} from "./GameEventTypes";

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
