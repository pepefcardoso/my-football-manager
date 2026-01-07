import { GameState } from "../models/gameState";
import { GameEventMap, GameEventKey } from "./types";
import { logger } from "../utils/Logger";

type EventHandler<K extends GameEventKey> = (
  state: GameState,
  payload: GameEventMap[K]
) => void;

class GameEventBus {
  private listeners: Partial<Record<GameEventKey, EventHandler<any>[]>> = {};

  public on<K extends GameEventKey>(event: K, handler: EventHandler<K>): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push(handler);
  }

  public off<K extends GameEventKey>(event: K, handler: EventHandler<K>): void {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event]!.filter((h) => h !== handler);
  }

  public emit<K extends GameEventKey>(
    state: GameState,
    event: K,
    payload: GameEventMap[K]
  ): void {
    const handlers = this.listeners[event];
    if (handlers) {
      handlers.forEach((handler) => {
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
  }
}

export const eventBus = new GameEventBus();
