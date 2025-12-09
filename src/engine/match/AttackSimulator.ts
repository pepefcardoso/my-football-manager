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
 *
 * Uso:
 * ```ts
 * const simulator = new AttackSimulator(context);
 * const result = simulator.simulate();
 *
 * if (result.outcome === 'goal') {
 *   // Atualizar placar
 * }
 * ```
 */
export class AttackSimulator {
  private context: AttackContext;

  constructor(context: AttackContext) {
    this.context = context;
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

    // Verifica se vai gerar um chute
    const shotGenerated = this.shouldGenerateShot();
    if (!shotGenerated) {
      result.outcome = "miss";
      return result;
    }

    result.totalShots = 1;

    // Seleciona o chutador
    const shooter = this.selectShooter();
    result.shooter = shooter;

    // Calcula qualidade do chute
    const shotQuality = this.calculateShotQuality(shooter);

    // Verifica se o chute vai no gol
    const shotOnTarget = this.isShotOnTarget(shotQuality);

    if (!shotOnTarget) {
      result.outcome = "miss";
      return result;
    }

    result.shotsOnTarget = 1;

    // Seleciona o goleiro
    const goalkeeper = this.selectGoalkeeper();
    result.goalkeeper = goalkeeper;

    // Verifica impedimento antes do gol
    if (this.checkOffside()) {
      result.outcome = "offside";
      result.wasOffside = true;
      return result;
    }

    // Calcula chance de gol vs defesa
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
    return RandomEngine.chance(GameBalance.MATCH.SHOT_CHANCE_IN_ATTACK);
  }

  /**
   * Seleciona o jogador que vai chutar (priorizando atacantes)
   */
  private selectShooter(): Player {
    const { attackingPlayers } = this.context;

    // Prioriza atacantes (70% de chance)
    const forwards = attackingPlayers.filter((p) => p.position === "FW");
    if (forwards.length > 0 && RandomEngine.chance(70)) {
      return RandomEngine.pickOne(forwards);
    }

    // Depois meias (50% de chance)
    const midfielders = attackingPlayers.filter((p) => p.position === "MF");
    if (midfielders.length > 0 && RandomEngine.chance(50)) {
      return RandomEngine.pickOne(midfielders);
    }

    // Qualquer jogador em último caso
    return RandomEngine.pickOne(attackingPlayers);
  }

  /**
   * Calcula a qualidade do chute baseado nos atributos do jogador
   */
  private calculateShotQuality(shooter: Player): number {
    const { shooting = 50, finishing = 50, overall = 50 } = shooter;

    // Média ponderada: 40% shooting, 40% finishing, 20% overall
    const quality = shooting * 0.4 + finishing * 0.4 + overall * 0.2;

    return Math.round(quality);
  }

  /**
   * Verifica se o chute vai no gol (não para fora)
   */
  private isShotOnTarget(shotQuality: number): boolean {
    const { weatherMultiplier } = this.context;

    // Chance base * qualidade do chute * clima
    const baseAccuracy = GameBalance.MATCH.SHOT_ACCURACY_BASE;
    const accuracyChance =
      baseAccuracy * (shotQuality / 100) * weatherMultiplier * 100;

    return RandomEngine.chance(accuracyChance);
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
    return RandomEngine.chance(GameBalance.MATCH.OFFSIDE_IN_GOAL_PROBABILITY);
  }

  /**
   * Resolve a disputa final: gol vs defesa
   * Considera força do ataque, defesa, goleiro e clima
   */
  private resolveGoalAttempt(shooter: Player, goalkeeper?: Player): boolean {
    const { attackingStrength, defendingStrength, weatherMultiplier } =
      this.context;

    // Calcula força efetiva do ataque
    const shooterBonus = (shooter.shooting + shooter.finishing) / 200;
    const attackPower =
      attackingStrength.attack *
      attackingStrength.fitnessMultiplier *
      shooterBonus;

    // Calcula força efetiva da defesa
    const defensePower =
      defendingStrength.defense * defendingStrength.fitnessMultiplier;

    // Calcula chance de defesa do goleiro
    let saveChance = GameBalance.MATCH.SAVE_CHANCE_BASE;

    if (goalkeeper) {
      const goalkeeperQuality =
        (goalkeeper.defending + goalkeeper.overall) / 200;
      saveChance = goalkeeperQuality * 100;
    }

    // Chance final de gol = força do ataque vs defesa, ajustada pelo clima
    const totalStrength = attackPower + defensePower;
    const goalChance = (attackPower / totalStrength) * 100 * weatherMultiplier;

    // Primeiro verifica se ultrapassa a defesa
    const beatDefense = RandomEngine.chance(goalChance);
    if (!beatDefense) return false;

    // Depois verifica se o goleiro defende
    const beatGoalkeeper = !RandomEngine.chance(saveChance);

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

    // Escanteios têm menor chance de gol (~10%)
    const cornerGoalChance = 10;

    if (RandomEngine.chance(cornerGoalChance)) {
      result.outcome = "goal";
      result.shooter = this.selectShooter();
      result.shotsOnTarget = 1;
    } else {
      // 50% de chance de ser chute no gol (mas defendido)
      if (RandomEngine.chance(50)) {
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

    // Pênaltis têm alta chance de conversão (~75-85%)
    const shooterSkill = (shooter.finishing + shooter.shooting) / 200;
    const baseChance = 75;
    const conversionChance = baseChance + shooterSkill * 10;

    const converted = RandomEngine.chance(conversionChance);

    if (converted) {
      result.outcome = "goal";
    } else {
      // 50/50 entre defesa ou chute fora
      result.outcome = RandomEngine.chance(50) ? "save" : "miss";
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
    weather: number = 1.0
  ): AttackSimulator {
    const context: AttackContext = {
      attackingStrength: attackingTeam.strength,
      defendingStrength: defendingTeam.strength,
      attackingPlayers: attackingTeam.players,
      defendingPlayers: defendingTeam.players,
      weatherMultiplier: weather,
      isHomeTeam: attackingTeam.isHome,
    };

    return new AttackSimulator(context);
  }
}
