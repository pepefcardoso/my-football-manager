import { MatchState } from "../../../domain/enums";

export interface IMatchState {
  getStateEnum(): MatchState;

  start(): void;

  pause(): void;

  resume(): void;

  simulateMinute(): void;
}
