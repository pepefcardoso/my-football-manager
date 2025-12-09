import { MatchEventType, MatchState } from "../domain/enums";
import type { Player, Team } from "../domain/models";
import type {
  MatchConfig,
  MatchEventData,
  MatchResult,
  TeamStrength,
} from "../domain/types";
import { GameBalance } from "./GameBalanceConfig";
import { RandomEngine } from "./RandomEngine";
import { TeamStrengthCalculator } from "./TeamStrengthCalculator";
import { MatchNarrator, type NarratorContext } from "./match/MatchNarrator";
import { MatchEventGenerator } from "./match/MatchEventGenerator";
import { AttackSimulator, type AttackResult } from "./match/AttackSimulator";

export class MatchEngine {
  private currentMinute: number = 0;
  private state: MatchState = MatchState.NOT_STARTED;
  private homeScore: number = 0;
  private awayScore: number = 0;

  // Histórico de eventos e estatísticas
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

  // Configurações e Estado
  private config: MatchConfig;
  private homeStrength: TeamStrength;
  private awayStrength: TeamStrength;
  private weatherMultiplier: number = 1.0;
  private isKnockout: boolean = false;

  constructor(config: MatchConfig, isKnockout: boolean = false) {
    this.config = config;
    this.isKnockout = isKnockout;

    // Inicialização de forças
    this.homeStrength = TeamStrengthCalculator.calculate({
      id: config.homeTeam.id.toString(),
      tacticalBonus: config.homeTacticalBonus || 0,
      players: config.homePlayers.map(
        (p) =>
          ({
            ...p,
            id: p.id.toString(),
          } as any)
      ),
    } as any);

    this.awayStrength = TeamStrengthCalculator.calculate({
      id: config.awayTeam.id.toString(),
      tacticalBonus: config.awayTacticalBonus || 0,
      players: config.awayPlayers.map(
        (p) =>
          ({
            ...p,
            id: p.id.toString(),
          } as any)
      ),
    } as any);

    this.applyWeatherEffects(config.weather || "sunny");
  }

  private applyWeatherEffects(weather: string): void {
    const penalty =
      GameBalance.MATCH.WEATHER_PENALTY[
        weather as keyof typeof GameBalance.MATCH.WEATHER_PENALTY
      ];
    this.weatherMultiplier = penalty || 1.0;
  }

  // --- Controles de Estado ---

  public start(): void {
    if (this.state !== MatchState.NOT_STARTED) return;
    this.state = MatchState.PLAYING;

    // Narrativa de início delegada
    const description = MatchNarrator.narrateKickOff(
      this.config.homeTeam,
      this.config.awayTeam
    );
    this.addEvent(0, MatchEventType.SHOT, null, null, description);
  }

  public pause(): void {
    if (this.state === MatchState.PLAYING) this.state = MatchState.PAUSED;
  }

  public resume(): void {
    if (this.state === MatchState.PAUSED) this.state = MatchState.PLAYING;
  }

  // --- Loop de Simulação ---

  public simulateToCompletion(): void {
    this.start();
    while (this.currentMinute < 90) {
      this.simulateMinute();
    }
  }

  public simulateMinute(): void {
    if (this.state !== MatchState.PLAYING) return;

    const maxMinute = this.currentMinute >= 90 ? 120 : 90;
    if (this.currentMinute >= maxMinute) return;

    this.currentMinute++;

    // 1. Cálculo de Posse de Bola
    const isHomeAttacking = this.calculatePossession();

    // 2. Tentar Gerar Ataque
    if (RandomEngine.chance(GameBalance.MATCH.ATTACK_CHANCE_PER_MINUTE)) {
      this.processAttackPhase(isHomeAttacking);
    }

    // 3. Tentar Gerar Evento Aleatório
    if (RandomEngine.chance(GameBalance.MATCH.RANDOM_EVENT_CHANCE_PER_MINUTE)) {
      this.processRandomEvent(isHomeAttacking);
    }

    // 4. Checagem de fim de tempo
    this.checkTimeEvents();
  }

  // --- Processamento de Lógica ---

  private calculatePossession(): boolean {
    const homePower =
      this.homeStrength.overall * GameBalance.MATCH.HOME_ADVANTAGE +
      this.homeStrength.moralBonus;
    const awayPower = this.awayStrength.overall + this.awayStrength.moralBonus;

    const total = homePower + awayPower;
    const homeChance = (homePower / total) * 100;

    const isHome = RandomEngine.chance(homeChance);

    if (isHome) this.stats.homePossession++;
    else this.stats.awayPossession++;

    return isHome;
  }

  private processAttackPhase(isHome: boolean): void {
    const attackingTeam = isHome
      ? {
          strength: this.homeStrength,
          players: this.config.homePlayers,
          isHome: true,
          data: this.config.homeTeam,
        }
      : {
          strength: this.awayStrength,
          players: this.config.awayPlayers,
          isHome: false,
          data: this.config.awayTeam,
        };

    const defendingTeam = isHome
      ? {
          strength: this.awayStrength,
          players: this.config.awayPlayers,
          data: this.config.awayTeam,
        }
      : {
          strength: this.homeStrength,
          players: this.config.homePlayers,
          data: this.config.homeTeam,
        };

    const simulator = AttackSimulator.fromTeams(
      {
        strength: attackingTeam.strength,
        players: attackingTeam.players,
        isHome: attackingTeam.isHome,
      },
      { strength: defendingTeam.strength, players: defendingTeam.players },
      this.weatherMultiplier
    );

    if (RandomEngine.chance(GameBalance.MATCH.CORNER_CHANCE)) {
      this.handleCorner(attackingTeam.data, isHome);
      const cornerResult = simulator.simulateCornerKick();
      this.handleAttackOutcome(
        cornerResult,
        attackingTeam,
        defendingTeam,
        isHome
      );
      return;
    }

    const result = simulator.simulate();
    this.handleAttackOutcome(result, attackingTeam, defendingTeam, isHome);
  }

  private handleAttackOutcome(
    result: AttackResult,
    attacker: { data: Team },
    defender: { data: Team },
    isHome: boolean
  ): void {
    const shooter = result.shooter;
    const keeper = result.goalkeeper;

    if (result.totalShots > 0) {
      if (isHome) this.stats.homeShots++;
      else this.stats.awayShots++;
    }
    if (result.shotsOnTarget > 0) {
      if (isHome) this.stats.homeShotsOnTarget++;
      else this.stats.awayShotsOnTarget++;
    }

    const narrateContext: NarratorContext = {
      player: shooter,
      team: attacker.data,
      opponent: defender.data,
      additionalInfo: { outcome: result.outcome },
    };

    switch (result.outcome) {
      case "goal": {
        // Correção no-case-declarations: Bloco {}
        if (this.processVAR(isHome, attacker.data.id, shooter!)) {
          if (isHome) this.homeScore++;
          else this.awayScore++;

          const assist = this.getLastPassProvider(isHome, shooter!);
          if (assist) {
            const assistDesc = MatchNarrator.getEventDescription(
              MatchEventType.ASSIST,
              { player: assist }
            );
            this.addEvent(
              this.currentMinute,
              MatchEventType.ASSIST,
              attacker.data.id,
              assist.id,
              assistDesc
            );
          }

          const goalDesc = MatchNarrator.getEventDescription(
            MatchEventType.GOAL,
            narrateContext
          );
          this.addEvent(
            this.currentMinute,
            MatchEventType.GOAL,
            attacker.data.id,
            shooter!.id,
            goalDesc
          );
        }
        break;
      }

      case "save": {
        const saveDesc = MatchNarrator.getEventDescription(
          MatchEventType.SAVE,
          { player: keeper }
        );
        this.addEvent(
          this.currentMinute,
          MatchEventType.SAVE,
          defender.data.id,
          keeper ? keeper.id : null,
          saveDesc
        );
        break;
      }

      case "miss":
      case "blocked": {
        const missDesc = MatchNarrator.getEventDescription(
          MatchEventType.SHOT,
          narrateContext
        );
        this.addEvent(
          this.currentMinute,
          MatchEventType.SHOT,
          attacker.data.id,
          shooter!.id,
          missDesc
        );
        break;
      }

      case "offside": {
        const offsideDesc = MatchNarrator.getEventDescription(
          MatchEventType.OFFSIDE,
          narrateContext
        );
        this.addEvent(
          this.currentMinute,
          MatchEventType.OFFSIDE,
          attacker.data.id,
          shooter!.id,
          offsideDesc
        );
        break;
      }
    }
  }

  private handleCorner(team: Team, isHome: boolean): void {
    if (isHome) this.stats.homeCorners++;
    else this.stats.awayCorners++;
    const desc = MatchNarrator.getEventDescription(MatchEventType.CORNER, {
      team,
    });
    this.addEvent(
      this.currentMinute,
      MatchEventType.CORNER,
      team.id,
      null,
      desc
    );
  }

  private processVAR(
    isHome: boolean,
    teamId: number,
    shooter: Player
  ): boolean {
    if (!RandomEngine.chance(GameBalance.MATCH.VAR_CHECK_PROBABILITY))
      return true;

    this.addEvent(
      this.currentMinute,
      MatchEventType.VAR_CHECK,
      null,
      null,
      MatchNarrator.getEventDescription(MatchEventType.VAR_CHECK)
    );

    if (RandomEngine.chance(GameBalance.MATCH.VAR_OVERTURN_PROBABILITY)) {
      this.addEvent(
        this.currentMinute,
        MatchEventType.OFFSIDE,
        teamId,
        shooter.id,
        MatchNarrator.getEventDescription(MatchEventType.VAR_CHECK, {
          additionalInfo: { result: "overturned" },
        })
      );
      return false;
    }

    this.addEvent(
      this.currentMinute,
      MatchEventType.VAR_CHECK,
      teamId,
      null,
      MatchNarrator.getEventDescription(MatchEventType.VAR_CHECK, {
        additionalInfo: { result: "confirmed" },
      })
    );
    return true;
  }

  private processRandomEvent(isHome: boolean): void {
    const team = isHome ? this.config.homeTeam : this.config.awayTeam;
    const players = isHome ? this.config.homePlayers : this.config.awayPlayers;

    const event = MatchEventGenerator.tryGenerateRandomEvent({ team, players });

    if (!event) return;

    if (event.type === MatchEventType.FOUL) {
      if (isHome) this.stats.homeFouls++;
      else this.stats.awayFouls++;
    }

    const player = players.find((p) => p.id === event.playerId);
    const description = MatchNarrator.getEventDescription(event.type, {
      player,
      team,
    });

    this.addEvent(
      this.currentMinute,
      event.type,
      team.id,
      event.playerId,
      description
    );
  }

  private addEvent(
    minute: number,
    type: MatchEventType,
    teamId: number | null,
    playerId: number | null,
    description: string
  ) {
    this.events.push({ minute, type, teamId, playerId, description });
  }

  private checkTimeEvents() {
    if (this.currentMinute === 90) {
      const desc = MatchNarrator.getEventDescription(MatchEventType.FINISHED, {
        team: this.config.homeTeam,
        opponent: this.config.awayTeam,
        score: { home: this.homeScore, away: this.awayScore },
      });
      this.addEvent(90, MatchEventType.FINISHED, null, null, desc);
    }
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
    }

    return this.compileFinalResult();
  }

  private simulateExtraTime(): void {
    this.addEvent(
      90,
      MatchEventType.SHOT,
      null,
      null,
      MatchNarrator.narrateExtraTime()
    );

    this.homeStrength.fitnessMultiplier *= 0.9;
    this.awayStrength.fitnessMultiplier *= 0.9;

    for (let m = 91; m <= 120; m++) {
      this.simulateMinute();
    }
  }

  private simulatePenaltyShootout(): "home" | "away" {
    this.addEvent(
      120,
      MatchEventType.PENALTY_SHOOTOUT,
      null,
      null,
      MatchNarrator.getEventDescription(MatchEventType.PENALTY_SHOOTOUT)
    );

    let homePenalties = 0;
    let awayPenalties = 0;

    const homeSim = AttackSimulator.fromTeams(
      {
        strength: this.homeStrength,
        players: this.config.homePlayers,
        isHome: true,
      },
      { strength: this.awayStrength, players: this.config.awayPlayers }
    );
    const awaySim = AttackSimulator.fromTeams(
      {
        strength: this.awayStrength,
        players: this.config.awayPlayers,
        isHome: false,
      },
      { strength: this.homeStrength, players: this.config.homePlayers }
    );

    const shoot = (
      simulator: AttackSimulator,
      team: Team,
      players: Player[],
      currentScore: { h: number; a: number }
    ) => {
      const shooter = RandomEngine.pickOne(
        players.filter((p) => p.position !== "GK")
      );
      const result = simulator.simulatePenalty(shooter);

      const converted = result.outcome === "goal";
      const desc = MatchNarrator.getEventDescription(MatchEventType.PENALTY, {
        player: shooter,
        team,
        additionalInfo: { converted },
      });

      const _updatedScore = ` (${currentScore.h}-${currentScore.a})`;

      this.addEvent(
        120,
        MatchEventType.GOAL,
        team.id,
        shooter.id,
        converted ? desc + " ✅" : desc + " ❌"
      );

      return converted;
    };

    // Série regular de 5 cobranças
    for (let i = 0; i < 5; i++) {
      const homeGoal = shoot(
        homeSim,
        this.config.homeTeam,
        this.config.homePlayers,
        { h: homePenalties, a: awayPenalties }
      );
      if (homeGoal) homePenalties++;

      const awayGoal = shoot(
        awaySim,
        this.config.awayTeam,
        this.config.awayPlayers,
        { h: homePenalties, a: awayPenalties }
      );
      if (awayGoal) awayPenalties++;

      // Checagem se alguém já ganhou matematicamente pode ser add aqui
    }

    // Morte súbita se empate
    let round = 6;
    while (homePenalties === awayPenalties && round < 20) {
      const homeGoal = shoot(
        homeSim,
        this.config.homeTeam,
        this.config.homePlayers,
        { h: homePenalties, a: awayPenalties }
      );
      if (homeGoal) homePenalties++;

      const awayGoal = shoot(
        awaySim,
        this.config.awayTeam,
        this.config.awayPlayers,
        { h: homePenalties, a: awayPenalties }
      );
      if (awayGoal) awayPenalties++;

      round++;
    }

    return homePenalties > awayPenalties ? "home" : "away";
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

    // Agora usando as variáveis que antes estavam ociosas
    const process = (
      players: Player[],
      won: boolean,
      draw: boolean,
      opponentRep: number,
      teamRep: number
    ) => {
      for (const player of players) {
        let moralChange = 0;

        // Lógica de cálculo de moral
        if (won) {
          const repDiff = opponentRep - teamRep;
          moralChange = 5 + Math.max(0, Math.min(15, repDiff / 500));
        } else if (!won && !draw) {
          const repDiff = teamRep - opponentRep;
          moralChange = -5 - Math.max(0, Math.min(15, repDiff / 500));
        } else {
          // Empate: favorece quem tem menos reputação
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
          assists: 0,
        });
      }
    };

    const homeRep = this.config.homeTeam.reputation || 5000;
    const awayRep = this.config.awayTeam.reputation || 5000;
    const homeWon = this.homeScore > this.awayScore;
    const draw = this.homeScore === this.awayScore;

    process(this.config.homePlayers, homeWon, draw, awayRep, homeRep);
    process(this.config.awayPlayers, !homeWon, draw, homeRep, awayRep);

    return updates;
  }

  public getCurrentMinute() {
    return this.currentMinute;
  }
  public getState() {
    return this.state;
  }
  public getCurrentScore() {
    return { home: this.homeScore, away: this.awayScore };
  }
  public getEvents() {
    return this.events;
  }
}
