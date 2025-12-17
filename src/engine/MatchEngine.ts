import { MatchEventType, MatchState } from "../domain/enums";
import type { Player } from "../domain/models";
import type {
  MatchConfig,
  MatchEventData,
  MatchResult,
  TeamStrength,
} from "../domain/types";
import { GameBalance } from "./GameBalanceConfig";
import { RandomEngine } from "./RandomEngine";
import { TeamStrengthCalculator } from "./TeamStrengthCalculator";
import { DomainToEngineAdapter } from "./adapters/DomainToEngineAdapter";
import type { IMatchState } from "./match/states/IMatchState";
import { NotStartedState } from "./match/states/NotStartedState";
import { PlayingState } from "./match/states/PlayingState";
import { PausedState } from "./match/states/PausedState";
import { FinishedState } from "./match/states/FinishedState";
import type { IMatchEngineContext } from "./match/IMatchEngineContext";

export class MatchEngine implements IMatchEngineContext {
  private currentState: IMatchState;
  private currentMinute: number = 0;
  private homeScore: number = 0;
  private awayScore: number = 0;
  private events: MatchEventData[] = [];

  private stats = {
    homePossession: 0,
    awayPossession: 0,
    homeShots: 0,
    awayShots: 0,
    homeShotsOnTarget: 0,
    awayShotsOnTarget: 0,
    homeCorners: 0,
    awayCorners: 0,
    homeFouls: 0,
    awayFouls: 0,
  };

  public readonly config: MatchConfig;
  public readonly rng: RandomEngine;
  private _homeStrength!: TeamStrength;
  private _awayStrength!: TeamStrength;
  private weatherMultiplier: number = 1.0;

  constructor(config: MatchConfig, _isKnockout: boolean, seed?: number) {
    this.config = config;
    const matchSeed = seed || Date.now();
    this.rng = new RandomEngine(matchSeed);

    this.currentState = new NotStartedState(this);

    this.updateTeamStrengths();
    this.applyWeatherEffects(config.weather || "sunny");
  }

  public updateTeamStrengths(): void {
    this._homeStrength = TeamStrengthCalculator.calculate(
      {
        id: this.config.homeTeam.id.toString(),
        tacticalBonus: 0,
        players: this.config.homePlayers.map((p) =>
          DomainToEngineAdapter.toEnginePlayer(p)
        ),
      },
      this.config.homeTactics?.tactics
    );

    this._awayStrength = TeamStrengthCalculator.calculate(
      {
        id: this.config.awayTeam.id.toString(),
        tacticalBonus: 0,
        players: this.config.awayPlayers.map((p) =>
          DomainToEngineAdapter.toEnginePlayer(p)
        ),
      },
      this.config.awayTactics?.tactics
    );
  }

  private applyWeatherEffects(weather: string): void {
    const penalty =
      GameBalance.MATCH.WEATHER_PENALTY[
        weather as keyof typeof GameBalance.MATCH.WEATHER_PENALTY
      ];
    this.weatherMultiplier = penalty || 1.0;
  }

  public transitionToPlaying(): void {
    this.setState(new PlayingState(this));
  }

  public transitionToPaused(): void {
    this.setState(new PausedState(this));
  }

  public transitionToFinished(): void {
    this.setState(new FinishedState(this));
  }

  public setState(newState: IMatchState): void {
    this.currentState = newState;
  }

  public start(): void {
    this.currentState.start();
  }

  public pause(): void {
    this.currentState.pause();
  }

  public resume(): void {
    this.currentState.resume();
  }

  public simulateMinute(): void {
    this.currentState.simulateMinute();
  }

  public simulateToCompletion(): void {
    if (this.currentState.getStateEnum() === MatchState.NOT_STARTED) {
      this.start();
    }

    while (this.currentState.getStateEnum() !== MatchState.FINISHED) {
      this.simulateMinute();
    }
  }

  public incrementMinute(): void {
    this.currentMinute++;
  }

  public addScore(isHome: boolean): void {
    if (isHome) this.homeScore++;
    else this.awayScore++;
  }

  public updatePossession(isHome: boolean): void {
    if (isHome) this.stats.homePossession++;
    else this.stats.awayPossession++;
  }

  public updateShots(isHome: boolean, total: number, onTarget: number): void {
    if (isHome) {
      this.stats.homeShots += total;
      this.stats.homeShotsOnTarget += onTarget;
    } else {
      this.stats.awayShots += total;
      this.stats.awayShotsOnTarget += onTarget;
    }
  }

  public updateCorners(isHome: boolean): void {
    if (isHome) this.stats.homeCorners++;
    else this.stats.awayCorners++;
  }

  public updateFouls(isHome: boolean): void {
    if (isHome) this.stats.homeFouls++;
    else this.stats.awayFouls++;
  }

  public addEvent(
    minute: number,
    type: MatchEventType,
    teamId: number | null,
    playerId: number | null,
    description: string
  ): void {
    this.events.push({ minute, type, teamId, playerId, description });
  }

  public getCurrentMinute(): number {
    return this.currentMinute;
  }

  public getState(): MatchState {
    return this.currentState.getStateEnum();
  }

  public getCurrentScore(): { home: number; away: number } {
    return { home: this.homeScore, away: this.awayScore };
  }

  public getEvents(): MatchEventData[] {
    return this.events;
  }

  public getHomeStrength(): TeamStrength {
    return this._homeStrength;
  }

  public getAwayStrength(): TeamStrength {
    return this._awayStrength;
  }

  public getWeatherMultiplier(): number {
    return this.weatherMultiplier;
  }

  public getMatchResult(): MatchResult {
    if (this.currentState.getStateEnum() !== MatchState.FINISHED) {
      this.simulateToCompletion();
    }
    return this.compileFinalResult();
  }

  private compileFinalResult(): MatchResult {
    const playerUpdates = this.calculatePlayerUpdates();
    const totalPossession =
      this.stats.homePossession + this.stats.awayPossession;
    const finalHomePossession =
      totalPossession > 0
        ? Math.round((this.stats.homePossession / totalPossession) * 100)
        : 50;

    return {
      homeScore: this.homeScore,
      awayScore: this.awayScore,
      events: this.events,
      stats: {
        ...this.stats,
        homePossession: finalHomePossession,
        awayPossession: 100 - finalHomePossession,
      },
      playerUpdates,
    };
  }

  private calculatePlayerUpdates(): MatchResult["playerUpdates"] {
    const updates: MatchResult["playerUpdates"] = [];
    const homeRep = this.config.homeTeam.reputation || 5000;
    const awayRep = this.config.awayTeam.reputation || 5000;
    const homeWon = this.homeScore > this.awayScore;
    const draw = this.homeScore === this.awayScore;

    const process = (
      players: Player[],
      won: boolean,
      draw: boolean,
      opponentRep: number,
      teamRep: number
    ) => {
      for (const player of players) {
        let moralChange = 0;
        if (won) {
          const repDiff = opponentRep - teamRep;
          moralChange = 5 + Math.max(0, Math.min(15, repDiff / 500));
        } else if (!won && !draw) {
          const repDiff = teamRep - opponentRep;
          moralChange = -5 - Math.max(0, Math.min(15, repDiff / 500));
        } else {
          moralChange = opponentRep > teamRep ? 2 : -2;
        }
        const newMoral = Math.max(0, Math.min(100, player.moral + moralChange));

        updates.push({
          playerId: player.id,
          energy: Math.max(0, player.energy - 15),
          moral: Math.round(newMoral),
          isInjured: false,
          rating: won ? 7.0 : draw ? 6.5 : 6.0,
          goals: this.events.filter(
            (e) => e.type === MatchEventType.GOAL && e.playerId === player.id
          ).length,
          assists: this.events.filter(
            (e) => e.type === MatchEventType.ASSIST && e.playerId === player.id
          ).length,
          minutesPlayed: 90,
          substitutions: 0,
        });
      }
    };

    process(this.config.homePlayers, homeWon, draw, awayRep, homeRep);
    process(this.config.awayPlayers, !homeWon, draw, homeRep, awayRep);

    return updates;
  }
}
