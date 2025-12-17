import { MatchEventType } from "../../domain/enums";
import type { MatchConfig, TeamStrength } from "../../domain/types";
import type { RandomEngine } from "../RandomEngine";
import type { IMatchState } from "./states/IMatchState";

export interface IMatchEngineContext {
  rng: RandomEngine;
  config: MatchConfig;

  transitionToPlaying(): void;
  transitionToPaused(): void;
  transitionToFinished(): void;
  setState(newState: IMatchState): void;

  getCurrentMinute(): number;
  getCurrentScore(): { home: number; away: number };
  getHomeStrength(): TeamStrength;
  getAwayStrength(): TeamStrength;
  getWeatherMultiplier(): number;
  getEvents(): any[];
  updateTeamStrengths(): void;

  incrementMinute(): void;
  addScore(isHome: boolean): void;
  updatePossession(isHome: boolean): void;
  updateShots(isHome: boolean, total: number, onTarget: number): void;
  updateCorners(isHome: boolean): void;
  updateFouls(isHome: boolean): void;
  addEvent(
    minute: number,
    type: MatchEventType,
    teamId: number | null,
    playerId: number | null,
    description: string
  ): void;
}