import { MatchEngine } from "../../MatchEngine";
import { MatchState } from "../../../domain/enums";
import type { IMatchState } from "./IMatchState";
import { Logger } from "../../../lib/Logger";

const logger = new Logger("FinishedState");

/**
 * Estado final da partida.
 * Responsabilidade: Bloquear qualquer ação após o término.
 */
export class FinishedState implements IMatchState {
  constructor(private readonly _context: MatchEngine) {
  }

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
