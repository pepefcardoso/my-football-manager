import { v4 as uuidv4 } from "uuid";
import { SimulationContext, IMatchCommand } from "../interfaces";
import { MatchEvent } from "../../../models/match";

export abstract class BaseCommand implements IMatchCommand {
  abstract execute(ctx: SimulationContext): void;

  protected createEvent(
    ctx: SimulationContext,
    type: string,
    clubId: string,
    playerId: string,
    description: string,
    targetPlayerId: string | null = null
  ) {
    const event: MatchEvent = {
      id: uuidv4(),
      matchId: ctx.matchId,
      period: ctx.period,
      minute: ctx.currentMinute,
      extraMinute: ctx.extraMinute,
      type: type as any,
      clubId,
      playerId,
      targetPlayerId,
      description,
      createdAt: Date.now(),
    };
    ctx.events.push(event);
  }

  protected updateStat(
    ctx: SimulationContext,
    playerId: string,
    field: keyof any,
    value: number | boolean
  ) {
    const stats = ctx.playerStats[playerId];
    if (stats) {
      (stats as any)[field] =
        typeof (stats as any)[field] === "number"
          ? ((stats as any)[field] as number) + (value as number)
          : value;
    }
  }

  protected updateRating(
    ctx: SimulationContext,
    playerId: string,
    delta: number
  ) {
    const stats = ctx.playerStats[playerId];
    if (stats) stats.rating += delta;
  }
}
