import { MatchState } from "../../../domain/enums";
import type { IMatchState } from "./IMatchState";
import type { IMatchEngineContext } from "../IMatchEngineContext";
import { Logger } from "../../../lib/Logger";

const logger = new Logger("PausedState");

export class PausedState implements IMatchState {
  constructor(private context: IMatchEngineContext) {}

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
    this.context.transitionToPlaying();
  }

  simulateMinute(): void {
    logger.warn(
      "Cannot simulate minute: Match is paused. Call resume() first."
    );
  }
}
