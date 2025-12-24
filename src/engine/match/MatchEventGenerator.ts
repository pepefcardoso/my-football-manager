import { MatchEventType } from "../../domain/enums";
import type { Player, Team } from "../../domain/models";
import { RandomEngine } from "../RandomEngine";
import { GameBalance } from "../GameBalanceConfig";

export interface GeneratedEvent {
  type: MatchEventType;
  teamId: number;
  playerId: number;
  severity?: "low" | "medium" | "high";
}

export interface GeneratorContext {
  team: Team;
  players: Player[];
}

export class MatchEventGenerator {
  static tryGenerateRandomEvent(
    context: GeneratorContext,
    rng: RandomEngine
  ): GeneratedEvent | null {
    if (!rng.chance(GameBalance.MATCH.RANDOM_EVENT_CHANCE_PER_MINUTE)) {
      return null;
    }

    const eventType = this.selectRandomEventType(rng);
    const player = rng.pickOne(context.players);

    if (!player) return null;

    if (eventType === "injury") {
      return {
        type: MatchEventType.INJURY,
        teamId: context.team.id,
        playerId: player.id,
        severity: this.determineInjurySeverity(rng),
      };
    }

    return {
      type: eventType as MatchEventType,
      teamId: context.team.id,
      playerId: player.id,
    };
  }

  private static selectRandomEventType(rng: RandomEngine): string {
    const weights = {
      [MatchEventType.FOUL]: 60,
      [MatchEventType.YELLOW_CARD]: 25,
      [MatchEventType.INJURY]: 10,
      [MatchEventType.RED_CARD]: 5,
    };

    return rng.pickWeighted(Object.keys(weights), Object.values(weights));
  }

  private static determineInjurySeverity(
    rng: RandomEngine
  ): "low" | "medium" | "high" {
    const roll = rng.getInt(1, 100);
    if (roll > 90) return "high";
    if (roll > 70) return "medium";
    return "low";
  }
}
