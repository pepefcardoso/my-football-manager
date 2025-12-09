import type { Player } from "../../domain/models";
import type { TeamStrength } from "../../domain/types";
import { RandomEngine } from "../RandomEngine";
import { GameBalance } from "../GameBalanceConfig";

/**
 * Resultado possível de um ataque
 */
export type AttackOutcome = "goal" | "save" | "miss" | "blocked" | "offside";

/**
 * Contexto de um ataque (dados necessários para simulação)
 */
export interface AttackContext {
  attackingStrength: TeamStrength;
  defendingStrength: TeamStrength;
  attackingPlayers: Player[];
  defendingPlayers: Player[];
  weatherMultiplier: number;
  isHomeTeam: boolean;
}

/**
 * Resultado detalhado de uma simulação de ataque
 */
export interface AttackResult {
  outcome: AttackOutcome;
  shooter?: Player;
  goalkeeper?: Player;
  shotsOnTarget: number;
  totalShots: number;
  wasOffside: boolean;
  wasBlocked: boolean;
  additionalInfo?: Record<string, any>;
}

/**
 * AttackSimulator
 *
 * Responsabilidade: Decidir o resultado de um ataque (gol, defesa, chute fora, etc).
 * Princípio: Open/Closed - pode ser estendido para diferentes tipos de ataque sem modificar.
 */
export class AttackSimulator {
  private context: AttackContext;
  private rng: RandomEngine;

  constructor(context: AttackContext, rng: RandomEngine) {
    this.context = context;
    this.rng = rng;
  }

  /**
   * Simula um ataque completo e retorna o resultado
   * NÃO altera o estado da partida, apenas retorna o resultado puro.
   */
  simulate(): AttackResult {
    const result: AttackResult = {
      outcome: "miss",
      totalShots: 0,
      shotsOnTarget: 0,
      wasOffside: false,
      wasBlocked: false,
    };

    const shotGenerated = this.shouldGenerateShot();
    if (!shotGenerated) {
      result.outcome = "miss";
      return result;
    }

    result.totalShots = 1;

    const shooter = this.selectShooter();
    if (!shooter) {
      result.outcome = "miss";
      return result;
    }
    result.shooter = shooter;

    const shotQuality = this.calculateShotQuality(shooter);

    const shotOnTarget = this.isShotOnTarget(shotQuality);

    if (!shotOnTarget) {
      result.outcome = "miss";
      return result;
    }

    result.shotsOnTarget = 1;

    const goalkeeper = this.selectGoalkeeper();
    result.goalkeeper = goalkeeper;

    if (this.checkOffside()) {
      result.outcome = "offside";
      result.wasOffside = true;
      return result;
    }

    const goalScored = this.resolveGoalAttempt(shooter, goalkeeper);

    if (goalScored) {
      result.outcome = "goal";
    } else {
      result.outcome = "save";
    }

    return result;
  }

  /**
   * Decide se o ataque vai gerar um chute
   */
  private shouldGenerateShot(): boolean {
    return this.rng.chance(GameBalance.MATCH.SHOT_CHANCE_IN_ATTACK);
  }

  /**
   * Seleciona o jogador que vai chutar (priorizando atacantes)
   */
  private selectShooter(): Player | undefined {
    const { attackingPlayers } = this.context;

    if (attackingPlayers.length === 0) return undefined;

    const forwards = attackingPlayers.filter((p) => p.position === "FW");
    if (forwards.length > 0 && this.rng.chance(70)) {
      return this.rng.pickOne(forwards) || undefined;
    }

    const midfielders = attackingPlayers.filter((p) => p.position === "MF");
    if (midfielders.length > 0 && this.rng.chance(50)) {
      return this.rng.pickOne(midfielders) || undefined;
    }

    return this.rng.pickOne(attackingPlayers) || undefined;
  }

  /**
   * Calcula a qualidade do chute baseado nos atributos do jogador
   */
  private calculateShotQuality(shooter: Player): number {
    const { shooting = 50, finishing = 50, overall = 50 } = shooter;

    const quality = shooting * 0.4 + finishing * 0.4 + overall * 0.2;

    return Math.round(quality);
  }

  /**
   * Verifica se o chute vai no gol (não para fora)
   */
  private isShotOnTarget(shotQuality: number): boolean {
    const { weatherMultiplier } = this.context;

    const baseAccuracy = GameBalance.MATCH.SHOT_ACCURACY_BASE;
    const accuracyChance =
      baseAccuracy * (shotQuality / 100) * weatherMultiplier * 100;

    return this.rng.chance(accuracyChance);
  }

  /**
   * Seleciona o goleiro da defesa
   */
  private selectGoalkeeper(): Player | undefined {
    const { defendingPlayers } = this.context;
    return defendingPlayers.find((p) => p.position === "GK");
  }

  /**
   * Verifica se há impedimento (15% de chance quando há gol)
   */
  private checkOffside(): boolean {
    return this.rng.chance(GameBalance.MATCH.OFFSIDE_IN_GOAL_PROBABILITY);
  }

  /**
   * Resolve a disputa final: gol vs defesa
   * Considera força do ataque, defesa, goleiro e clima
   */
  private resolveGoalAttempt(shooter: Player, goalkeeper?: Player): boolean {
    const { attackingStrength, defendingStrength, weatherMultiplier } =
      this.context;

    const shooterBonus = (shooter.shooting + shooter.finishing) / 200;
    const attackPower =
      attackingStrength.attack *
      attackingStrength.fitnessMultiplier *
      shooterBonus;

    const defensePower =
      defendingStrength.defense * defendingStrength.fitnessMultiplier;

    let saveChance = GameBalance.MATCH.SAVE_CHANCE_BASE;

    if (goalkeeper) {
      const goalkeeperQuality =
        (goalkeeper.defending + goalkeeper.overall) / 200;
      saveChance = goalkeeperQuality * 100;
    }

    const totalStrength = attackPower + defensePower;
    const goalChance = (attackPower / totalStrength) * 100 * weatherMultiplier;

    const beatDefense = this.rng.chance(goalChance);
    if (!beatDefense) return false;

    const beatGoalkeeper = !this.rng.chance(saveChance);

    return beatGoalkeeper;
  }

  /**
   * Simula um ataque de escanteio (contexto diferente)
   */
  simulateCornerKick(): AttackResult {
    const result: AttackResult = {
      outcome: "miss",
      totalShots: 1,
      shotsOnTarget: 0,
      wasOffside: false,
      wasBlocked: false,
    };

    const cornerGoalChance = 10;

    if (this.rng.chance(cornerGoalChance)) {
      const shooter = this.selectShooter();
      if (shooter) {
        result.outcome = "goal";
        result.shooter = shooter;
        result.shotsOnTarget = 1;
      } else {
        result.outcome = "miss";
      }
    } else {
      if (this.rng.chance(50)) {
        result.outcome = "save";
        result.shotsOnTarget = 1;
      } else {
        result.outcome = "miss";
      }
    }

    return result;
  }

  /**
   * Simula uma cobrança de pênalti
   */
  simulatePenalty(shooter: Player): AttackResult {
    const result: AttackResult = {
      outcome: "miss",
      shooter,
      totalShots: 1,
      shotsOnTarget: 1,
      wasOffside: false,
      wasBlocked: false,
    };

    const goalkeeper = this.selectGoalkeeper();
    result.goalkeeper = goalkeeper;

    const shooterSkill = (shooter.finishing + shooter.shooting) / 200;
    const baseChance = 75;
    const conversionChance = baseChance + shooterSkill * 10;

    const converted = this.rng.chance(conversionChance);

    if (converted) {
      result.outcome = "goal";
    } else {
      result.outcome = this.rng.chance(50) ? "save" : "miss";
    }

    return result;
  }

  /**
   * Factory method: cria um simulador a partir de dados simplificados
   */
  static fromTeams(
    attackingTeam: {
      strength: TeamStrength;
      players: Player[];
      isHome: boolean;
    },
    defendingTeam: {
      strength: TeamStrength;
      players: Player[];
    },
    weather: number = 1.0,
    rng: RandomEngine
  ): AttackSimulator {
    const context: AttackContext = {
      attackingStrength: attackingTeam.strength,
      defendingStrength: defendingTeam.strength,
      attackingPlayers: attackingTeam.players,
      defendingPlayers: defendingTeam.players,
      weatherMultiplier: weather,
      isHomeTeam: attackingTeam.isHome,
    };

    return new AttackSimulator(context, rng);
  }
}
