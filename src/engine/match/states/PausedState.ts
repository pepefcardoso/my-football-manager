// src/engine/match/states/PausedState.ts
import { MatchEngine } from "../../MatchEngine";
import { MatchState } from "../../../domain/enums";
import { PlayingState } from "./PlayingState";
import type { IMatchState } from "./IMatchState";
import { Logger } from "../../../lib/Logger";

const logger = new Logger("PausedState");

/**
 * Estado de pausa da partida.
 * Responsabilidade: Congelar a simulação e permitir retomada.
 */
export class PausedState implements IMatchState {
  constructor(private context: MatchEngine) {}

  getStateEnum(): MatchState {
    return MatchState.PAUSED;
  }

  start(): void {
    logger.warn("Cannot start: Match is already in progress (paused).");
  }

  pause(): void {
    logger.warn("Match is already paused.");
  }

  resume(): void {
    this.context.setState(new PlayingState(this.context));
  }

  simulateMinute(): void {
    logger.warn(
      "Cannot simulate minute: Match is paused. Call resume() first."
    );
  }
}
