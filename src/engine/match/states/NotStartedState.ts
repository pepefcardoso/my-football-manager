import { MatchEngine } from "../../MatchEngine";
import { MatchState, MatchEventType } from "../../../domain/enums";
import { MatchNarrator } from "../MatchNarrator";
import { PlayingState } from "./PlayingState";
import type { IMatchState } from "./IMatchState";
import { Logger } from "../../../lib/Logger";

const logger = new Logger("NotStartedState");

/**
 * Estado inicial da partida.
 * Responsabilidade: Validar início e transicionar para PlayingState.
 */
export class NotStartedState implements IMatchState {
  constructor(private context: MatchEngine) {}

  getStateEnum(): MatchState {
    return MatchState.NOT_STARTED;
  }

  start(): void {
    const kickOffDesc = MatchNarrator.narrateKickOff(
      this.context.config.homeTeam,
      this.context.config.awayTeam
    );

    this.context.addEvent(0, MatchEventType.FINISHED, null, null, kickOffDesc);

    this.context.setState(new PlayingState(this.context));
  }

  pause(): void {
    logger.warn("Cannot pause: Match has not started yet.");
  }

  resume(): void {
    logger.warn("Cannot resume: Match has not started yet.");
  }

  simulateMinute(): void {
    logger.warn("Cannot simulate: Match has not started. Call start() first.");
  }
}
