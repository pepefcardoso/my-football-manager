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
import { Logger } from "../lib/Logger";

const logger = new Logger("MatchEngine");

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
  private homePlayersOnField: Player[];
  private awayPlayersOnField: Player[];
  private homeBench: Player[];
  private awayBench: Player[];
  private homeSubstitutionsUsed: number = 0;
  private awaySubstitutionsUsed: number = 0;
  private readonly MAX_SUBSTITUTIONS = 5;
  private weatherMultiplier: number = 1.0;

  constructor(config: MatchConfig, private isKnockout: boolean, seed?: number) {
    this.config = config;
    const matchSeed = seed || Date.now();
    this.rng = new RandomEngine(matchSeed);
    this.currentState = new NotStartedState(this);
    this.homePlayersOnField = this.selectStartingLineup(config.homePlayers);
    this.awayPlayersOnField = this.selectStartingLineup(config.awayPlayers);
    this.homeBench = this.selectBench(
      config.homePlayers,
      this.homePlayersOnField
    );
    this.awayBench = this.selectBench(
      config.awayPlayers,
      this.awayPlayersOnField
    );
    this.updateTeamStrengths();
    this.applyWeatherEffects(config.weather || "sunny");
  }

  private selectStartingLineup(players: Player[]): Player[] {
    const sorted = [...players]
      .filter((p) => !p.isInjured && p.energy > 30)
      .sort((a, b) => b.overall - a.overall);

    return sorted.slice(0, 11);
  }

  private selectBench(allPlayers: Player[], starters: Player[]): Player[] {
    const starterIds = new Set(starters.map((p) => p.id));
    return allPlayers
      .filter((p) => !starterIds.has(p.id) && !p.isInjured && p.energy > 20)
      .slice(0, 7);
  }

  public updateTeamStrengths(): void {
    logger.debug(
      `Recalculando forças dos times (Minuto ${this.currentMinute})...`
    );

    this._homeStrength = TeamStrengthCalculator.calculate(
      {
        id: this.config.homeTeam.id.toString(),
        tacticalBonus: 0,
        players: this.homePlayersOnField.map((p) =>
          DomainToEngineAdapter.toEnginePlayer(p)
        ),
      },
      this.config.homeTactics?.tactics
    );

    this._awayStrength = TeamStrengthCalculator.calculate(
      {
        id: this.config.awayTeam.id.toString(),
        tacticalBonus: 0,
        players: this.awayPlayersOnField.map((p) =>
          DomainToEngineAdapter.toEnginePlayer(p)
        ),
      },
      this.config.awayTactics?.tactics
    );

    logger.debug("Forças atualizadas:", {
      home: this._homeStrength.overall,
      away: this._awayStrength.overall,
    });
  }

  public canSubstitute(isHome: boolean): { allowed: boolean; reason?: string } {
    const state = this.getState();
    const subsUsed = isHome
      ? this.homeSubstitutionsUsed
      : this.awaySubstitutionsUsed;

    if (state !== MatchState.PAUSED && state !== MatchState.NOT_STARTED) {
      return {
        allowed: false,
        reason: "A partida precisa estar pausada para realizar substituições.",
      };
    }

    if (subsUsed >= this.MAX_SUBSTITUTIONS) {
      return { allowed: false, reason: "Limite de 5 substituições atingido." };
    }

    return { allowed: true };
  }

  public substitute(
    isHome: boolean,
    playerOutId: number,
    playerInId: number
  ): boolean {
    const check = this.canSubstitute(isHome);
    if (!check.allowed) {
      logger.warn(`[Substitution] Negada: ${check.reason}`);
      return false;
    }

    const teamName = isHome
      ? this.config.homeTeam.shortName
      : this.config.awayTeam.shortName;
    const onField = isHome ? this.homePlayersOnField : this.awayPlayersOnField;
    const bench = isHome ? this.homeBench : this.awayBench;
    const subsUsed = isHome
      ? this.homeSubstitutionsUsed
      : this.awaySubstitutionsUsed;

    if (subsUsed >= this.MAX_SUBSTITUTIONS) {
      logger.warn(
        `[${teamName}] Limite de substituições atingido (${this.MAX_SUBSTITUTIONS}).`
      );
      return false;
    }

    const playerOutIndex = onField.findIndex((p) => p.id === playerOutId);
    if (playerOutIndex === -1) {
      logger.warn(`[${teamName}] Jogador #${playerOutId} não está em campo.`);
      return false;
    }

    const playerInIndex = bench.findIndex((p) => p.id === playerInId);
    if (playerInIndex === -1) {
      logger.warn(`[${teamName}] Jogador #${playerInId} não está no banco.`);
      return false;
    }

    const playerOut = onField[playerOutIndex];
    const playerIn = bench[playerInIndex];

    onField[playerOutIndex] = playerIn;
    bench[playerInIndex] = playerOut;

    if (isHome) {
      this.homeSubstitutionsUsed++;
    } else {
      this.awaySubstitutionsUsed++;
    }

    this.addEvent(
      this.currentMinute,
      MatchEventType.SUBSTITUTION,
      isHome ? this.config.homeTeam.id : this.config.awayTeam.id,
      playerInId,
      `🔄 Substituição: Sai ${playerOut.firstName} ${playerOut.lastName}, entra ${playerIn.firstName} ${playerIn.lastName}.`
    );

    logger.info(
      `[${teamName}] Substituição executada (${subsUsed + 1}/${
        this.MAX_SUBSTITUTIONS
      }): ` +
        `Sai #${playerOutId} (${playerOut.firstName}), Entra #${playerInId} (${playerIn.firstName})`
    );

    this.updateTeamStrengths();

    return true;
  }

  private drainPlayerEnergy(): void {
    const homeMarking = this.config.homeTactics?.tactics?.marking || "zonal";
    const awayMarking = this.config.awayTactics?.tactics?.marking || "zonal";

    const homeDrain = this.calculateEnergyDrain(homeMarking);
    const awayDrain = this.calculateEnergyDrain(awayMarking);

    this.homePlayersOnField.forEach((p) => {
      p.energy = Math.max(0, p.energy - homeDrain);
    });

    this.awayPlayersOnField.forEach((p) => {
      p.energy = Math.max(0, p.energy - awayDrain);
    });
  }

  private calculateEnergyDrain(marking: string): number {
    const baseDrain = 0.5;

    switch (marking) {
      case "pressing_high":
        return baseDrain * 1.5;
      case "man_to_man":
        return baseDrain * 1.3;
      case "zonal":
      case "mixed":
      default:
        return baseDrain;
    }
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
    this.drainPlayerEnergy();
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

  public getHomePlayersOnField(): Player[] {
    return [...this.homePlayersOnField];
  }

  public getAwayPlayersOnField(): Player[] {
    return [...this.awayPlayersOnField];
  }

  public getHomeBench(): Player[] {
    return [...this.homeBench];
  }

  public getAwayBench(): Player[] {
    return [...this.awayBench];
  }

  public getSubstitutionsUsed(isHome: boolean): number {
    return isHome ? this.homeSubstitutionsUsed : this.awaySubstitutionsUsed;
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
          energy: Math.max(0, player.energy),
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

    process(this.homePlayersOnField, homeWon, draw, awayRep, homeRep);
    process(this.awayPlayersOnField, !homeWon, draw, homeRep, awayRep);

    return updates;
  }
}
