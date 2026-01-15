import { GameState } from "../models/gameState";
import { GameEventMap, GameEventKey } from "./types";
import { logger } from "../utils/Logger";

type EventHandler<K extends GameEventKey> = (
  state: GameState,
  payload: GameEventMap[K]
) => void;

type Unsubscribe = () => void;

class GameEventBus {
  private listeners: Partial<Record<GameEventKey, Set<EventHandler<any>>>> = {};

  public on<K extends GameEventKey>(
    event: K,
    handler: EventHandler<K>
  ): Unsubscribe {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set();
    }

    this.listeners[event]!.add(handler);

    return () => this.off(event, handler);
  }

  public off<K extends GameEventKey>(event: K, handler: EventHandler<K>): void {
    const handlers = this.listeners[event];
    if (!handlers) return;

    handlers.delete(handler);

    if (handlers.size === 0) {
      delete this.listeners[event];
      // logger.debug("EventBus", `Chave limpa da memória: ${event}`);
    }
  }

  public emit<K extends GameEventKey>(
    state: GameState,
    event: K,
    payload: GameEventMap[K]
  ): void {
    const handlers = this.listeners[event];

    if (!handlers || handlers.size === 0) return;

    for (const handler of handlers) {
      try {
        handler(state, payload);
      } catch (error) {
        logger.error(
          "EventBus",
          `❌ Erro crítico no handler do evento: ${event}`,
          error
        );
      }
    }
  }

  public clear(): void {
    this.listeners = {};
    logger.warn("EventBus", "♻️ EventBus purgado (Hard Reset).");
  }

  public getListenerCount(event: GameEventKey): number {
    return this.listeners[event]?.size ?? 0;
  }

  public hasKey(event: GameEventKey): boolean {
    return Object.prototype.hasOwnProperty.call(this.listeners, event);
  }
}

export const eventBus = new GameEventBus();
