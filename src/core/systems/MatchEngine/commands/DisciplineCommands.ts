import { BaseCommand } from "./BaseCommand";
import { SimulationContext } from "../interfaces";
import { MATCH_CONFIG } from "../../../constants/matchEngine";

export class FoulCommand extends BaseCommand {
  execute(ctx: SimulationContext): void {
    const offender = ctx.rng.pick(ctx.defendingTeam.startingXI);
    const victim = ctx.rng.pick(ctx.hasPossession.startingXI);

    this.updateStat(ctx, offender.id, "foulsCommitted", 1);
    this.updateStat(ctx, victim.id, "foulsSuffered", 1);

    const roll = ctx.rng.range(0, 100);

    if (roll < MATCH_CONFIG.PROBABILITIES.RED_CARD) {
      this.createEvent(
        ctx,
        "CARD_RED",
        ctx.defendingTeam.clubId,
        offender.id,
        `Vermelho direto! ${offender.name} expulso.`
      );
      this.updateStat(ctx, offender.id, "redCard", true);
      this.updateRating(ctx, offender.id, MATCH_CONFIG.RATING_WEIGHTS.RED_CARD);
    } else if (roll < MATCH_CONFIG.PROBABILITIES.YELLOW_CARD) {
      this.createEvent(
        ctx,
        "CARD_YELLOW",
        ctx.defendingTeam.clubId,
        offender.id,
        `Cartão amarelo para ${offender.name}.`
      );
      this.updateStat(ctx, offender.id, "yellowCards", 1);
      this.updateRating(
        ctx,
        offender.id,
        MATCH_CONFIG.RATING_WEIGHTS.YELLOW_CARD
      );
    } else {
      if (ctx.rng.range(0, 100) < 20) {
        this.createEvent(
          ctx,
          "FOUL",
          ctx.defendingTeam.clubId,
          offender.id,
          `Falta cometida por ${offender.name}.`
        );
      }
    }
  }
}
