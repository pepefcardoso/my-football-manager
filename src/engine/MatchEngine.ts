import { RandomEngine } from "./RandomEngine";
import type { Player, Team } from "../domain/types";

export enum MatchState {
  NOT_STARTED = "not_started",
  PLAYING = "playing",
  PAUSED = "paused",
  FINISHED = "finished",
}

export interface MatchEvent {
  minute: number;
  type:
    | "goal"
    | "yellow_card"
    | "red_card"
    | "injury"
    | "substitution"
    | "shot"
    | "save"
    | "foul"
    | "corner"
    | "offside";
  teamId: number;
  playerId?: number;
  description: string;
  severity?: "low" | "medium" | "high";
}

export interface MatchConfig {
  homeTeam: Team;
  awayTeam: Team;
  homePlayers: Player[];
  awayPlayers: Player[];
  weather?: "sunny" | "rainy" | "cloudy" | "windy";
}

export interface MatchResult {
  homeScore: number;
  awayScore: number;
  events: MatchEvent[];
  stats: {
    homePossession: number;
    awayPossession: number;
    homeShots: number;
    awayShots: number;
    homeShotsOnTarget: number;
    awayShotsOnTarget: number;
    homeCorners: number;
    awayCorners: number;
    homeFouls: number;
    awayFouls: number;
  };
  playerUpdates: {
    playerId: number;
    energy: number;
    moral: number;
    isInjured: boolean;
    injuryDays?: number;
  }[];
}

interface TeamStrength {
  overall: number;
  attack: number;
  defense: number;
  midfield: number;
  moralBonus: number;
  fitnessMultiplier: number;
}

export class MatchEngine {
  private currentMinute: number = 0;
  private state: MatchState = MatchState.NOT_STARTED;
  private homeScore: number = 0;
  private awayScore: number = 0;
  private events: MatchEvent[] = [];
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

  private config: MatchConfig;
  private homeStrength: TeamStrength;
  private awayStrength: TeamStrength;
  private weatherMultiplier: number = 1.0;

  constructor(config: MatchConfig) {
    this.config = config;
    this.homeStrength = this.calculateTeamStrength(config.homePlayers);
    this.awayStrength = this.calculateTeamStrength(config.awayPlayers);
    this.applyWeatherEffects(config.weather || "sunny");
  }

  // ==================== CÁLCULO DE FORÇA ====================

  private calculateTeamStrength(players: Player[]): TeamStrength {
    if (players.length === 0) {
      return {
        overall: 50,
        attack: 50,
        defense: 50,
        midfield: 50,
        moralBonus: 0,
        fitnessMultiplier: 1.0,
      };
    }

    const attackers = players.filter((p) => p.position === "FW");
    const midfielders = players.filter((p) => p.position === "MF");
    const defenders = players.filter((p) => p.position === "DF");
    const goalkeeper = players.find((p) => p.position === "GK");

    const calcAvg = (arr: Player[], attr: keyof Player) =>
      arr.length > 0
        ? arr.reduce((sum, p) => sum + (Number(p[attr]) || 0), 0) / arr.length
        : 50;

    const attack =
      (calcAvg(attackers, "finishing") +
        calcAvg(attackers, "shooting") +
        calcAvg(attackers, "pace")) /
      3;

    const midfield =
      (calcAvg(midfielders, "passing") +
        calcAvg(midfielders, "dribbling") +
        calcAvg(midfielders, "pace")) /
      3;

    const defense =
      (calcAvg(defenders, "defending") +
        calcAvg(defenders, "physical") +
        (goalkeeper?.defending || 50)) /
      3;

    const overallAvg =
      players.reduce((sum, p) => sum + p.overall, 0) / players.length;

    const avgMoral =
      players.reduce((sum, p) => sum + p.moral, 0) / players.length;
    const moralBonus = ((avgMoral - 50) / 100) * 10;

    const avgEnergy =
      players.reduce((sum, p) => sum + p.energy, 0) / players.length;
    const fitnessMultiplier = 0.7 + (avgEnergy / 100) * 0.3;

    return {
      overall: overallAvg,
      attack,
      defense,
      midfield,
      moralBonus,
      fitnessMultiplier,
    };
  }

  private applyWeatherEffects(weather: string): void {
    switch (weather) {
      case "rainy":
        this.weatherMultiplier = 0.9;
        break;
      case "windy":
        this.weatherMultiplier = 0.95;
        break;
      default:
        this.weatherMultiplier = 1.0;
    }
  }

  public start(): void {
    if (this.state !== MatchState.NOT_STARTED) return;
    this.state = MatchState.PLAYING;
    this.events.push({
      minute: 0,
      type: "shot",
      teamId: this.config.homeTeam.id,
      description: "⚽ A partida começou!",
    });
  }

  public pause(): void {
    if (this.state === MatchState.PLAYING) {
      this.state = MatchState.PAUSED;
    }
  }

  public resume(): void {
    if (this.state === MatchState.PAUSED) {
      this.state = MatchState.PLAYING;
    }
  }

  public simulateMinute(): void {
    if (this.state !== MatchState.PLAYING || this.currentMinute >= 90) return;

    this.currentMinute++;

    const homeStrengthTotal =
      this.homeStrength.overall * 1.05 + this.homeStrength.moralBonus;
    const awayStrengthTotal =
      this.awayStrength.overall + this.awayStrength.moralBonus;
    const totalStrength = homeStrengthTotal + awayStrengthTotal;

    const homePossessionChance = (homeStrengthTotal / totalStrength) * 100;
    const isHomeAttacking = RandomEngine.chance(homePossessionChance);

    if (isHomeAttacking) {
      this.stats.homePossession++;
    } else {
      this.stats.awayPossession++;
    }

    if (RandomEngine.chance(20)) {
      this.processAttack(isHomeAttacking);
    }

    if (RandomEngine.chance(1)) {
      this.processRandomEvent(isHomeAttacking);
    }

    if (this.currentMinute >= 90) {
      this.state = MatchState.FINISHED;
      this.events.push({
        minute: 90,
        type: "shot",
        teamId: this.config.homeTeam.id,
        description: `🏁 FIM DE JOGO! ${this.config.homeTeam.shortName} ${this.homeScore} x ${this.awayScore} ${this.config.awayTeam.shortName}`,
        severity: "high",
      });
    }
  }

  private processAttack(isHome: boolean): void {
    const attackingTeam = isHome ? this.config.homeTeam : this.config.awayTeam;
    const defendingTeam = isHome ? this.config.awayTeam : this.config.homeTeam;
    const attackingPlayers = isHome
      ? this.config.homePlayers
      : this.config.awayPlayers;
    const defendingPlayers = isHome
      ? this.config.awayPlayers
      : this.config.homePlayers;

    const attackStrength = isHome
      ? this.homeStrength.attack * this.homeStrength.fitnessMultiplier
      : this.awayStrength.attack * this.awayStrength.fitnessMultiplier;

    const defenseStrength = isHome
      ? this.awayStrength.defense * this.awayStrength.fitnessMultiplier
      : this.homeStrength.defense * this.homeStrength.fitnessMultiplier;

    if (RandomEngine.chance(40)) {
      if (isHome) this.stats.homeShots++;
      else this.stats.awayShots++;

      const shooter = this.selectScorer(attackingPlayers);
      const shotQuality = (shooter.shooting + shooter.finishing) / 2;

      if (RandomEngine.chance((shotQuality / 100) * 60)) {
        if (isHome) this.stats.homeShotsOnTarget++;
        else this.stats.awayShotsOnTarget++;

        const goalkeeper = defendingPlayers.find((p) => p.position === "GK");
        const saveChance = goalkeeper
          ? ((goalkeeper.defending + goalkeeper.overall) / 200) * 100
          : 50;

        const goalChance =
          (attackStrength / (attackStrength + defenseStrength)) *
          100 *
          this.weatherMultiplier;

        if (
          RandomEngine.chance(goalChance) &&
          !RandomEngine.chance(saveChance)
        ) {
          if (isHome) this.homeScore++;
          else this.awayScore++;

          this.events.push({
            minute: this.currentMinute,
            type: "goal",
            teamId: attackingTeam.id,
            playerId: shooter.id,
            description: `⚽ GOOOL! ${shooter.firstName} ${shooter.lastName} marca para o ${attackingTeam.shortName}!`,
            severity: "high",
          });
        } else {
          this.events.push({
            minute: this.currentMinute,
            type: "save",
            teamId: defendingTeam.id,
            playerId: goalkeeper?.id,
            description: `🧤 Grande defesa de ${
              goalkeeper?.firstName || "o goleiro"
            }! ${shooter.firstName} quase marca.`,
          });
        }
      } else {
        this.events.push({
          minute: this.currentMinute,
          type: "shot",
          teamId: attackingTeam.id,
          playerId: shooter.id,
          description: `📉 ${shooter.firstName} ${shooter.lastName} chuta para fora.`,
        });
      }
    }

    if (RandomEngine.chance(8)) {
      if (isHome) this.stats.homeCorners++;
      else this.stats.awayCorners++;

      this.events.push({
        minute: this.currentMinute,
        type: "corner",
        teamId: attackingTeam.id,
        description: `🚩 Escanteio para o ${attackingTeam.shortName}.`,
      });
    }
  }

  private processRandomEvent(isHome: boolean): void {
    const team = isHome ? this.config.homeTeam : this.config.awayTeam;
    const players = isHome ? this.config.homePlayers : this.config.awayPlayers;

    const eventType = RandomEngine.pickOne(["foul", "yellow", "injury"]);

    if (eventType === "foul") {
      if (isHome) this.stats.homeFouls++;
      else this.stats.awayFouls++;

      const player = RandomEngine.pickOne(players);
      this.events.push({
        minute: this.currentMinute,
        type: "foul",
        teamId: team.id,
        playerId: player.id,
        description: `🟨 Falta cometida por ${player.firstName} ${player.lastName}.`,
      });
    } else if (eventType === "yellow") {
      const player = RandomEngine.pickOne(players);
      this.events.push({
        minute: this.currentMinute,
        type: "yellow_card",
        teamId: team.id,
        playerId: player.id,
        description: `🟨 Cartão amarelo para ${player.firstName} ${player.lastName}!`,
        severity: "medium",
      });
    } else if (eventType === "injury") {
      const player = RandomEngine.pickOne(players);
      this.events.push({
        minute: this.currentMinute,
        type: "injury",
        teamId: team.id,
        playerId: player.id,
        description: `🩹 ${player.firstName} ${player.lastName} sente uma lesão e precisa de atendimento.`,
        severity: "medium",
      });
    }
  }

  private selectScorer(players: Player[]): Player {
    const forwards = players.filter((p) => p.position === "FW");
    const midfielders = players.filter((p) => p.position === "MF");

    if (forwards.length > 0 && RandomEngine.chance(70)) {
      return RandomEngine.pickOne(forwards);
    }
    if (midfielders.length > 0 && RandomEngine.chance(50)) {
      return RandomEngine.pickOne(midfielders);
    }
    return RandomEngine.pickOne(players);
  }

  public getMatchResult(): MatchResult {
    const homeRep = this.config.homeTeam.reputation || 5000;
    const awayRep = this.config.awayTeam.reputation || 5000;

    const homeWon = this.homeScore > this.awayScore;
    const awayWon = this.awayScore > this.homeScore;
    // const draw = this.homeScore === this.awayScore;

    const playerUpdates: MatchResult["playerUpdates"] = [];
    for (const player of this.config.homePlayers) {
      let moralChange = 0;

      if (homeWon) {
        const repDiff = awayRep - homeRep;
        moralChange = 5 + Math.max(0, Math.min(15, repDiff / 500));
      } else if (awayWon) {
        const repDiff = homeRep - awayRep;
        moralChange = -5 - Math.max(0, Math.min(15, repDiff / 500));
      } else {
        moralChange = awayRep > homeRep ? 2 : -2;
      }

      const newMoral = Math.max(0, Math.min(100, player.moral + moralChange));
      const newEnergy = Math.max(
        0,
        player.energy - RandomEngine.getInt(30, 50)
      );

      playerUpdates.push({
        playerId: player.id,
        energy: newEnergy,
        moral: Math.round(newMoral),
        isInjured: false,
      });
    }

    for (const player of this.config.awayPlayers) {
      let moralChange = 0;

      if (awayWon) {
        const repDiff = homeRep - awayRep;
        moralChange = 5 + Math.max(0, Math.min(15, repDiff / 500));
      } else if (homeWon) {
        const repDiff = awayRep - homeRep;
        moralChange = -5 - Math.max(0, Math.min(15, repDiff / 500));
      } else {
        moralChange = homeRep > awayRep ? 2 : -2;
      }

      const newMoral = Math.max(0, Math.min(100, player.moral + moralChange));
      const newEnergy = Math.max(
        0,
        player.energy - RandomEngine.getInt(30, 50)
      );

      playerUpdates.push({
        playerId: player.id,
        energy: newEnergy,
        moral: Math.round(newMoral),
        isInjured: false,
      });
    }

    const totalPossession =
      this.stats.homePossession + this.stats.awayPossession;
    const finalHomePossession = Math.round(
      (this.stats.homePossession / totalPossession) * 100
    );

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

  public getCurrentMinute(): number {
    return this.currentMinute;
  }

  public getState(): MatchState {
    return this.state;
  }

  public getCurrentScore(): { home: number; away: number } {
    return { home: this.homeScore, away: this.awayScore };
  }

  public getEvents(): MatchEvent[] {
    return this.events;
  }
}
