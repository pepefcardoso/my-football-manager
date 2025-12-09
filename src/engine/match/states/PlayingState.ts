import { MatchEngine } from "../../MatchEngine";
import { MatchState, MatchEventType } from "../../../domain/enums";
import { RandomEngine } from "../../RandomEngine";
import { GameBalance } from "../../GameBalanceConfig";
import type { Team, Player } from "../../../domain/models";
import { MatchNarrator, type NarratorContext } from "../MatchNarrator";
import { PausedState } from "./PausedState";
import type { IMatchState } from "./IMatchState";
import { FinishedState } from "./FinishedState";
import { AttackSimulator } from "../AttackSimulator";
import { MatchEventGenerator } from "../MatchEventGenerator";
import { Logger } from "../../../lib/Logger";

const logger = new Logger("PlayingState");

/**
 * Estado principal da partida onde toda a simulação acontece.
 * Responsabilidade: Orquestrar a lógica de cada minuto de jogo.
 *
 * Fluxo de um minuto:
 * 1. Verifica se chegou ao fim (90min)
 * 2. Calcula posse de bola
 * 3. Tenta gerar ataque (usando AttackSimulator)
 * 4. Tenta gerar eventos aleatórios (cartões, lesões)
 */
export class PlayingState implements IMatchState {
  constructor(private context: MatchEngine) {}

  getStateEnum(): MatchState {
    return MatchState.PLAYING;
  }

  start(): void {
    logger.warn("A partida já está em andamento.");
  }

  pause(): void {
    this.context.setState(new PausedState(this.context));
  }

  resume(): void {
    logger.warn("A partida já está em andamento.");
  }

  simulateMinute(): void {
    const currentMinute = this.context.getCurrentMinute();
    const maxMinute = 90;

    if (currentMinute >= maxMinute) {
      this.finishMatch();
      return;
    }

    this.context.incrementMinute();

    const attackingTeamIsHome = this.calculatePossession();

    if (this.context.rng.chance(GameBalance.MATCH.ATTACK_CHANCE_PER_MINUTE)) {
      this.processAttackPhase(attackingTeamIsHome);
    }

    if (
      this.context.rng.chance(GameBalance.MATCH.RANDOM_EVENT_CHANCE_PER_MINUTE)
    ) {
      this.processRandomEvent(attackingTeamIsHome);
    }
  }

  /**
   * Finaliza a partida e transiciona para FinishedState
   */
  private finishMatch(): void {
    const context = this.context;
    const desc = MatchNarrator.getEventDescription(MatchEventType.FINISHED, {
      team: context.config.homeTeam,
      opponent: context.config.awayTeam,
      score: context.getCurrentScore(),
    });

    context.addEvent(90, MatchEventType.FINISHED, null, null, desc);
    context.setState(new FinishedState(context));
  }

  /**
   * Calcula qual time tem a posse de bola neste minuto.
   * Baseado em força overall + bônus de moral + vantagem de casa.
   *
   * @returns true se o time da casa ataca, false se o visitante ataca
   */
  private calculatePossession(): boolean {
    const homeStrength = this.context.getHomeStrength();
    const awayStrength = this.context.getAwayStrength();

    const homePower =
      homeStrength.overall * GameBalance.MATCH.HOME_ADVANTAGE +
      homeStrength.moralBonus;
    const awayPower = awayStrength.overall + awayStrength.moralBonus;

    const total = homePower + awayPower;
    const homeChance = (homePower / total) * 100;

    const isHome = this.context.rng.chance(homeChance);
    this.context.updatePossession(isHome);
    return isHome;
  }

  /**
   * Processa uma fase de ataque usando o AttackSimulator.
   *
   * Fluxo:
   * 1. Define times atacante/defensor
   * 2. Verifica chance de escanteio
   * 3. Simula o ataque (usando AttackSimulator)
   * 4. Processa o resultado (gol, defesa, chute fora, etc)
   *
   * @param attackingTeamIsHome - Define qual time está atacando
   */
  private processAttackPhase(attackingTeamIsHome: boolean): void {
    const config = this.context.config;

    const attackingTeam = attackingTeamIsHome
      ? {
          strength: this.context.getHomeStrength(),
          players: config.homePlayers,
          isHome: true,
          data: config.homeTeam,
        }
      : {
          strength: this.context.getAwayStrength(),
          players: config.awayPlayers,
          isHome: false,
          data: config.awayTeam,
        };

    const defendingTeam = attackingTeamIsHome
      ? {
          strength: this.context.getAwayStrength(),
          players: config.awayPlayers,
          data: config.awayTeam,
        }
      : {
          strength: this.context.getHomeStrength(),
          players: config.homePlayers,
          data: config.homeTeam,
        };

    const simulator = AttackSimulator.fromTeams(
      {
        strength: attackingTeam.strength,
        players: attackingTeam.players,
        isHome: attackingTeam.isHome,
      },
      { strength: defendingTeam.strength, players: defendingTeam.players },
      this.context.getWeatherMultiplier(),
      this.context.rng
    );

    if (this.context.rng.chance(GameBalance.MATCH.CORNER_CHANCE)) {
      this.handleCorner(attackingTeam.data, attackingTeamIsHome);
      const cornerResult = simulator.simulateCornerKick();
      this.handleAttackOutcome(
        cornerResult,
        attackingTeam,
        defendingTeam,
        attackingTeamIsHome
      );
      return;
    }

    const result = simulator.simulate();
    this.handleAttackOutcome(
      result,
      attackingTeam,
      defendingTeam,
      attackingTeamIsHome
    );
  }

  /**
   * Registra evento de escanteio
   */
  private handleCorner(team: Team, isHome: boolean): void {
    this.context.updateCorners(isHome);
    const desc = MatchNarrator.getEventDescription(MatchEventType.CORNER, {
      team,
    });
    this.context.addEvent(
      this.context.getCurrentMinute(),
      MatchEventType.CORNER,
      team.id,
      null,
      desc
    );
  }

  /**
   * Processa o resultado de um ataque e gera os eventos apropriados.
   *
   * Possíveis resultados:
   * - goal: Verifica VAR, registra gol e assistência
   * - save: Registra defesa do goleiro
   * - miss/blocked: Registra chute para fora
   * - offside: Registra impedimento
   */
  private handleAttackOutcome(
    result: any,
    attacker: { data: Team },
    defender: { data: Team },
    attackingTeamIsHome: boolean
  ): void {
    const shooter = result.shooter;
    const keeper = result.goalkeeper;

    if (result.totalShots > 0) {
      this.context.updateShots(
        attackingTeamIsHome,
        result.totalShots,
        result.shotsOnTarget
      );
    }

    const narrateContext: NarratorContext = {
      player: shooter,
      team: attacker.data,
      opponent: defender.data,
      additionalInfo: { outcome: result.outcome },
    };

    switch (result.outcome) {
      case "goal": {
        if (!shooter) return;

        if (this.processVAR(attacker.data.id, shooter)) {
          this.context.addScore(attackingTeamIsHome);

          const assist = this.getLastPassProvider(attackingTeamIsHome, shooter);
          if (assist) {
            const assistDesc = MatchNarrator.getEventDescription(
              MatchEventType.ASSIST,
              { player: assist }
            );
            this.context.addEvent(
              this.context.getCurrentMinute(),
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
          this.context.addEvent(
            this.context.getCurrentMinute(),
            MatchEventType.GOAL,
            attacker.data.id,
            shooter.id,
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
        this.context.addEvent(
          this.context.getCurrentMinute(),
          MatchEventType.SAVE,
          defender.data.id,
          keeper ? keeper.id : null,
          saveDesc
        );
        break;
      }

      case "miss":
      case "blocked": {
        if (!shooter) return;

        const missDesc = MatchNarrator.getEventDescription(
          MatchEventType.SHOT,
          narrateContext
        );
        this.context.addEvent(
          this.context.getCurrentMinute(),
          MatchEventType.SHOT,
          attacker.data.id,
          shooter.id,
          missDesc
        );
        break;
      }

      case "offside": {
        if (!shooter) return;

        const offsideDesc = MatchNarrator.getEventDescription(
          MatchEventType.OFFSIDE,
          narrateContext
        );
        this.context.addEvent(
          this.context.getCurrentMinute(),
          MatchEventType.OFFSIDE,
          attacker.data.id,
          shooter.id,
          offsideDesc
        );
        break;
      }
    }
  }

  /**
   * Simula revisão do VAR em possíveis gols.
   *
   * @param teamId - ID do time que marcou o gol
   * @param shooter - Jogador que finalizou
   * @returns true se o gol é válido, false se foi anulado
   */
  private processVAR(teamId: number, shooter: Player): boolean {
    if (!RandomEngine.chance(GameBalance.MATCH.VAR_CHECK_PROBABILITY))
      return true;

    this.context.addEvent(
      this.context.getCurrentMinute(),
      MatchEventType.VAR_CHECK,
      null,
      null,
      MatchNarrator.getEventDescription(MatchEventType.VAR_CHECK)
    );

    if (RandomEngine.chance(GameBalance.MATCH.VAR_OVERTURN_PROBABILITY)) {
      this.context.addEvent(
        this.context.getCurrentMinute(),
        MatchEventType.OFFSIDE,
        teamId,
        shooter.id,
        MatchNarrator.getEventDescription(MatchEventType.VAR_CHECK, {
          additionalInfo: { result: "overturned" },
        })
      );
      return false;
    }

    this.context.addEvent(
      this.context.getCurrentMinute(),
      MatchEventType.VAR_CHECK,
      teamId,
      null,
      MatchNarrator.getEventDescription(MatchEventType.VAR_CHECK, {
        additionalInfo: { result: "confirmed" },
      })
    );
    return true;
  }

  /**
   * Determina quem deu a assistência (70% de chance de haver assistência).
   * Prioriza meio-campistas (60% de chance se disponíveis).
   */
  private getLastPassProvider(
    attackingTeamIsHome: boolean,
    shooter: Player
  ): Player | null {
    const players = attackingTeamIsHome
      ? this.context.config.homePlayers
      : this.context.config.awayPlayers;

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

  /**
   * Processa eventos aleatórios (faltas, cartões, lesões).
   * Usa o MatchEventGenerator para determinar tipo e jogador afetado.
   */
  private processRandomEvent(attackingTeamIsHome: boolean): void {
    const team = attackingTeamIsHome
      ? this.context.config.homeTeam
      : this.context.config.awayTeam;
    const players = attackingTeamIsHome
      ? this.context.config.homePlayers
      : this.context.config.awayPlayers;

    const event = MatchEventGenerator.tryGenerateRandomEvent(
      { team, players },
      this.context.rng
    );

    if (!event) return;

    if (event.type === MatchEventType.FOUL) {
      this.context.updateFouls(attackingTeamIsHome);
    }

    const player = players.find((p) => p.id === event.playerId);
    const description = MatchNarrator.getEventDescription(event.type, {
      player,
      team,
    });

    this.context.addEvent(
      this.context.getCurrentMinute(),
      event.type,
      team.id,
      event.playerId,
      description
    );
  }
}
