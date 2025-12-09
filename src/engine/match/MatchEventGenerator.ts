import { MatchEventType } from "../../domain/enums";
import type { Player, Team } from "../../domain/models";
import { RandomEngine } from "../RandomEngine";
import { GameBalance } from "../GameBalanceConfig";

export interface GeneratedEvent {
  type: MatchEventType;
  teamId: number;
  playerId: number;
  severity?: "low" | "medium" | "high"; // Para lesões
}

export interface GeneratorContext {
  team: Team;
  players: Player[];
}

/**
 * MatchEventGenerator
 * Responsabilidade: Gerar eventos randômicos (Faltas, Cartões, Lesões)
 */
export class MatchEventGenerator {
  
  static tryGenerateRandomEvent(context: GeneratorContext): GeneratedEvent | null {
    // Verifica probabilidade global por minuto
    if (!RandomEngine.chance(GameBalance.MATCH.RANDOM_EVENT_CHANCE_PER_MINUTE)) {
      return null;
    }

    // Decide qual tipo de evento ocorreu
    const eventType = this.selectRandomEventType();
    const player = RandomEngine.pickOne(context.players);

    if (!player) return null;

    if (eventType === "injury") {
        return {
            type: MatchEventType.INJURY,
            teamId: context.team.id,
            playerId: player.id,
            severity: this.determineInjurySeverity()
        };
    }

    return {
        type: eventType as MatchEventType,
        teamId: context.team.id,
        playerId: player.id
    };
  }

  private static selectRandomEventType(): string {
    // Pesos para sorteio
    const weights = {
      [MatchEventType.FOUL]: 60,
      [MatchEventType.YELLOW_CARD]: 25,
      [MatchEventType.INJURY]: 10,
      [MatchEventType.RED_CARD]: 5
    };
    
    const types = Object.keys(weights);
    const weightValues = Object.values(weights);

    return RandomEngine.pickWeighted(types, weightValues);
  }

  private static determineInjurySeverity(): "low" | "medium" | "high" {
      const roll = RandomEngine.getInt(1, 100);
      if (roll > 90) return "high";
      if (roll > 70) return "medium";
      return "low";
  }
}