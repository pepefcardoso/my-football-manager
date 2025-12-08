import { MatchEventType, MatchState } from "../domain/enums";
import type { Player } from "../domain/models";
import type {
  MatchConfig,
  MatchEventData,
  MatchResult,
  TeamStrength,
} from "../domain/types";
import { RandomEngine } from "./RandomEngine";
import { TeamStrengthCalculator } from "./TeamStrengthCalculator";

export class MatchEngine {
  private currentMinute: number = 0;
  private state: MatchState = MatchState.NOT_STARTED;
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

  private config: MatchConfig;
  private homeStrength: TeamStrength;
  private awayStrength: TeamStrength;
  private weatherMultiplier: number = 1.0;
  private isKnockout: boolean = false;

  constructor(config: MatchConfig, isKnockout: boolean = false) {
    this.config = config;
    this.isKnockout = isKnockout;
    this.homeStrength = TeamStrengthCalculator.calculate(
      config.homePlayers,
      config.homeTacticalBonus || 0
    );
    this.awayStrength = TeamStrengthCalculator.calculate(
      config.awayPlayers,
      config.awayTacticalBonus || 0
    );
    this.applyWeatherEffects(config.weather || "sunny");
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
      type: MatchEventType.SHOT,
      teamId: this.config.homeTeam.id,
      playerId: null,
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
    if (this.state !== MatchState.PLAYING) return;

    const maxMinute = this.currentMinute >= 90 ? 120 : 90;
    if (this.currentMinute >= maxMinute) return;

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

    if (this.currentMinute === 90) {
      this.events.push({
        minute: 90,
        type: MatchEventType.FINISHED,
        teamId: null,
        playerId: null,
        description: `⏱️ FIM DO TEMPO REGULAMENTAR! ${this.config.homeTeam.shortName} ${this.homeScore} x ${this.awayScore} ${this.config.awayTeam.shortName}`,
      });
    }

    if (this.currentMinute === 120) {
      this.events.push({
        minute: 120,
        type: MatchEventType.FINISHED,
        teamId: null,
        playerId: null,
        description: `⏱️ FIM DA PRORROGAÇÃO! ${this.config.homeTeam.shortName} ${this.homeScore} x ${this.awayScore} ${this.config.awayTeam.shortName}`,
      });
    }
  }

  /**
   * Simula 30 minutos de prorrogação (minutos 91-120)
   */
  private simulateExtraTime(): { homeGoals: number; awayGoals: number } {
    this.events.push({
      minute: 90,
      type: MatchEventType.SHOT,
      teamId: null,
      playerId: null,
      description: "⏰ PRORROGAÇÃO! A partida vai para os 30 minutos extras.",
    });

    const goalsBeforeHome = this.homeScore;
    const goalsBeforeAway = this.awayScore;

    const originalHomeStrength = { ...this.homeStrength };
    const originalAwayStrength = { ...this.awayStrength };

    this.homeStrength.fitnessMultiplier *= 0.9;
    this.awayStrength.fitnessMultiplier *= 0.9;

    for (let minute = 91; minute <= 120; minute++) {
      this.simulateMinute();
    }

    this.homeStrength = originalHomeStrength;
    this.awayStrength = originalAwayStrength;

    const homeGoals = this.homeScore - goalsBeforeHome;
    const awayGoals = this.awayScore - goalsBeforeAway;

    return { homeGoals, awayGoals };
  }

  /**
   * Simula disputa de pênaltis com 5 cobranças por time (ou mais se necessário)
   */
  private simulatePenaltyShootout(): "home" | "away" {
    this.events.push({
      minute: 120,
      type: MatchEventType.PENALTY_SHOOTOUT,
      teamId: null,
      playerId: null,
      description: "🥅 DISPUTA DE PÊNALTIS! A decisão será nos pênaltis.",
    });

    let homePenalties = 0;
    let awayPenalties = 0;

    const homeTeam = this.config.homeTeam;
    const awayTeam = this.config.awayTeam;

    const homePlayers = this.config.homePlayers.filter(
      (p) => p.position !== "GK"
    );
    const awayPlayers = this.config.awayPlayers.filter(
      (p) => p.position !== "GK"
    );

    const homeBaseChance =
      70 + Math.min(10, (homeTeam.reputation - awayTeam.reputation) / 500);
    const awayBaseChance =
      70 + Math.min(10, (awayTeam.reputation - homeTeam.reputation) / 500);

    for (let round = 1; round <= 5; round++) {
      const homeShooter =
        homePlayers[Math.min(round - 1, homePlayers.length - 1)];
      const homeConverts = RandomEngine.chance(
        homeBaseChance + homeShooter.finishing / 10
      );

      if (homeConverts) {
        homePenalties++;
        this.events.push({
          minute: 120,
          type: MatchEventType.GOAL,
          teamId: homeTeam.id,
          playerId: homeShooter.id,
          description: `✅ ${homeShooter.firstName} ${homeShooter.lastName} (${homeTeam.shortName}) converte! ${homePenalties}-${awayPenalties}`,
        });
      } else {
        this.events.push({
          minute: 120,
          type: MatchEventType.SHOT,
          teamId: homeTeam.id,
          playerId: homeShooter.id,
          description: `❌ ${homeShooter.firstName} ${homeShooter.lastName} (${homeTeam.shortName}) desperdiça! ${homePenalties}-${awayPenalties}`,
        });
      }

      const awayShooter =
        awayPlayers[Math.min(round - 1, awayPlayers.length - 1)];
      const awayConverts = RandomEngine.chance(
        awayBaseChance + awayShooter.finishing / 10
      );

      if (awayConverts) {
        awayPenalties++;
        this.events.push({
          minute: 120,
          type: MatchEventType.GOAL,
          teamId: awayTeam.id,
          playerId: awayShooter.id,
          description: `✅ ${awayShooter.firstName} ${awayShooter.lastName} (${awayTeam.shortName}) converte! ${homePenalties}-${awayPenalties}`,
        });
      } else {
        this.events.push({
          minute: 120,
          type: MatchEventType.SHOT,
          teamId: awayTeam.id,
          playerId: awayShooter.id,
          description: `❌ ${awayShooter.firstName} ${awayShooter.lastName} (${awayTeam.shortName}) desperdiça! ${homePenalties}-${awayPenalties}`,
        });
      }

      const remainingRounds = 5 - round;
      if (Math.abs(homePenalties - awayPenalties) > remainingRounds) {
        break;
      }
    }

    let suddenDeathRound = 1;

    while (homePenalties === awayPenalties) {
      const homeConverts = RandomEngine.chance(homeBaseChance);
      const awayConverts = RandomEngine.chance(awayBaseChance);

      if (homeConverts) homePenalties++;
      if (awayConverts) awayPenalties++;

      this.events.push({
        minute: 120,
        type: MatchEventType.PENALTY_SHOOTOUT,
        teamId: null,
        playerId: null,
        description: `⚡ Morte Súbita ${suddenDeathRound}: ${homePenalties}-${awayPenalties}`,
      });

      suddenDeathRound++;

      if (suddenDeathRound > 10) break;
    }

    const winner = homePenalties > awayPenalties ? "home" : "away";
    const winnerTeam = winner === "home" ? homeTeam : awayTeam;

    this.events.push({
      minute: 120,
      type: MatchEventType.PENALTY_SHOOTOUT,
      teamId: winnerTeam.id,
      playerId: null,
      description: `🏆 ${winnerTeam.shortName} VENCE NOS PÊNALTIS! ${homePenalties}-${awayPenalties}`,
    });

    if (winner === "home") {
      this.homeScore++;
    } else {
      this.awayScore++;
    }

    return winner;
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
          this.handleGoalScored(isHome, attackingTeam.id, shooter);
        } else {
          if (isHome) this.stats.awayShotsOnTarget++;
          else this.stats.homeShotsOnTarget++;

          this.events.push({
            minute: this.currentMinute,
            type: MatchEventType.SAVE,
            teamId: defendingTeam.id,
            playerId: goalkeeper ? goalkeeper.id : null,
            description: `🧤 Grande defesa de ${
              goalkeeper?.firstName || "o goleiro"
            }!`,
          });
        }
      } else {
        this.events.push({
          minute: this.currentMinute,
          type: MatchEventType.SHOT,
          teamId: attackingTeam.id,
          playerId: shooter.id,
          description: `📉 ${shooter.firstName} chuta para fora.`,
        });
      }
    }

    if (RandomEngine.chance(8)) {
      if (isHome) this.stats.homeCorners++;
      else this.stats.awayCorners++;

      this.events.push({
        minute: this.currentMinute,
        type: MatchEventType.CORNER,
        teamId: attackingTeam.id,
        playerId: null,
        description: `🚩 Escanteio para o ${attackingTeam.shortName}.`,
      });
    }
  }

  private handleGoalScored(isHome: boolean, teamId: number, shooter: Player) {
    if (RandomEngine.chance(10)) {
      this.events.push({
        minute: this.currentMinute,
        type: MatchEventType.VAR_CHECK,
        teamId: null,
        playerId: null,
        description:
          "🖥️ VAR em ação! Analisando possível irregularidade no gol...",
      });

      if (RandomEngine.chance(30)) {
        this.events.push({
          minute: this.currentMinute,
          type: MatchEventType.OFFSIDE,
          teamId: teamId,
          playerId: shooter.id,
          description: `❌ GOL ANULADO! O VAR identificou impedimento de ${shooter.firstName}.`,
        });
        return;
      } else {
        this.events.push({
          minute: this.currentMinute,
          type: MatchEventType.VAR_CHECK,
          teamId: teamId,
          playerId: null,
          description: "✅ Gol confirmado após revisão.",
        });
      }
    }

    if (isHome) this.homeScore++;
    else this.awayScore++;

    const assistProvider = this.getLastPassProvider(isHome, shooter);

    if (assistProvider) {
      this.events.push({
        minute: this.currentMinute,
        type: MatchEventType.ASSIST,
        teamId: teamId,
        playerId: assistProvider.id,
        description: `🎯 Passe perfeito de ${assistProvider.firstName} para o gol!`,
      });
    }

    this.events.push({
      minute: this.currentMinute,
      type: MatchEventType.GOAL,
      teamId: teamId,
      playerId: shooter.id,
      description: `⚽ GOOOL! ${shooter.firstName} ${shooter.lastName} marca!`,
    });
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
        type: MatchEventType.FOUL,
        teamId: team.id,
        playerId: player.id,
        description: `🟨 Falta cometida por ${player.firstName} ${player.lastName}.`,
      });
    } else if (eventType === "yellow") {
      const player = RandomEngine.pickOne(players);
      this.events.push({
        minute: this.currentMinute,
        type: MatchEventType.YELLOW_CARD,
        teamId: team.id,
        playerId: player.id,
        description: `🟨 Cartão amarelo para ${player.firstName} ${player.lastName}!`,
      });
    } else if (eventType === "injury") {
      const player = RandomEngine.pickOne(players);
      this.events.push({
        minute: this.currentMinute,
        type: MatchEventType.INJURY,
        teamId: team.id,
        playerId: player.id,
        description: `🩹 ${player.firstName} ${player.lastName} sente uma lesão e precisa de atendimento.`,
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
    if (
      this.currentMinute === 90 &&
      this.isKnockout &&
      this.homeScore === this.awayScore
    ) {
      this.simulateExtraTime();

      if (this.homeScore === this.awayScore) {
        this.simulatePenaltyShootout();
      }
    }

    if (this.state !== MatchState.FINISHED) {
      this.state = MatchState.FINISHED;
      const finalMinute = this.currentMinute >= 90 ? 120 : 90;
      this.events.push({
        minute: finalMinute,
        type: MatchEventType.FINISHED,
        teamId: this.config.homeTeam.id,
        playerId: null,
        description: `🏁 FIM DE JOGO! ${this.config.homeTeam.shortName} ${this.homeScore} x ${this.awayScore} ${this.config.awayTeam.shortName}`,
      });
    }

    const homeRep = this.config.homeTeam.reputation || 5000;
    const awayRep = this.config.awayTeam.reputation || 5000;

    const homeWon = this.homeScore > this.awayScore;
    const awayWon = this.awayScore > this.homeScore;

    const playerUpdates: MatchResult["playerUpdates"] = [];

    const processPlayers = (
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
        const energyLoss =
          this.currentMinute > 90
            ? RandomEngine.getInt(20, 35)
            : RandomEngine.getInt(10, 20);
        const newEnergy = Math.max(0, player.energy - energyLoss);

        const goals = this.events.filter(
          (e) => e.type === MatchEventType.GOAL && e.playerId === player.id
        ).length;

        let rating = 6.0;
        if (won) rating += 0.5;
        rating += goals * 1.5;
        if (newMoral < 40) rating -= 0.5;

        rating += Math.random() * 2 - 1;
        rating = Math.max(3, Math.min(10, Number(rating.toFixed(1))));

        playerUpdates.push({
          playerId: player.id,
          energy: newEnergy,
          moral: Math.round(newMoral),
          isInjured: false,
          rating: rating,
          goals: goals,
          assists: 0,
        });
      }
    };

    const isDraw = this.homeScore === this.awayScore;

    processPlayers(this.config.homePlayers, homeWon, isDraw, awayRep, homeRep);
    processPlayers(this.config.awayPlayers, awayWon, isDraw, homeRep, awayRep);

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

  private getLastPassProvider(isHome: boolean, shooter: Player): Player | null {
    const players = isHome ? this.config.homePlayers : this.config.awayPlayers;

    if (!RandomEngine.chance(70)) return null;

    const candidates = players.filter(
      (p) => p.id !== shooter.id && !p.isInjured
    );

    if (candidates.length === 0) return null;

    const midfielders = candidates.filter((p) => p.position === "MF");
    if (midfielders.length > 0 && RandomEngine.chance(60)) {
      return RandomEngine.pickOne(midfielders);
    }

    return RandomEngine.pickOne(candidates);
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

  public getEvents(): MatchEventData[] {
    return this.events;
  }
}
