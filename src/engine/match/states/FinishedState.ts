import { MatchState } from "../../../domain/enums";
import type { IMatchState } from "./IMatchState";
import type { IMatchEngineContext } from "../IMatchEngineContext";
import { Logger } from "../../../lib/Logger";

const logger = new Logger("FinishedState");

export class FinishedState implements IMatchState {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(private readonly _context: IMatchEngineContext) {}

  getStateEnum(): MatchState {
    return MatchState.FINISHED;
  }

  start(): void {
    logger.warn("Cannot start: Match has already finished.");
  }

  pause(): void {
    logger.warn("Cannot pause: Match has already finished.");
  }

  resume(): void {
    logger.warn("Cannot resume: Match has already finished.");
  }

  simulateMinute(): void {
    logger.warn("Cannot simulate: Match has already finished.");
  }
}
