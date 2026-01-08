import { GameState } from "../models/gameState";
import { GameEventMap, GameEventKey } from "./types";
import { logger } from "../utils/Logger";

type EventHandler<K extends GameEventKey> = (
  state: GameState,
  payload: GameEventMap[K]
) => void;

type Unsubscribe = () => void;

class GameEventBus {
  private listeners: Partial<Record<GameEventKey, EventHandler<any>[]>> = {};

  public on<K extends GameEventKey>(
    event: K,
    handler: EventHandler<K>
  ): Unsubscribe {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push(handler);

    return () => this.off(event, handler);
  }

  public off<K extends GameEventKey>(event: K, handler: EventHandler<K>): void {
    if (!this.listeners[event]) return;

    const initialLength = this.listeners[event]!.length;
    this.listeners[event] = this.listeners[event]!.filter((h) => h !== handler);

    if (this.listeners[event]!.length === 0) {
      delete this.listeners[event];
    }

    if (this.listeners[event]?.length !== initialLength) {
      logger.debug("EventBus", `Listener removido para: ${event}`);
    }
  }

  public emit<K extends GameEventKey>(
    state: GameState,
    event: K,
    payload: GameEventMap[K]
  ): void {
    const handlers = this.listeners[event];
    if (handlers) {
      [...handlers].forEach((handler) => {
        try {
          handler(state, payload);
        } catch (error) {
          logger.error("EventBus", `Erro ao processar evento ${event}`, error);
        }
      });
    }
  }

  public clear(): void {
    this.listeners = {};
    logger.warn(
      "EventBus",
      "Todos os listeners foram removidos (Clear Total)."
    );
  }
}

export const eventBus = new GameEventBus();
