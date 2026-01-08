import { BaseCommand } from "./BaseCommand";
import { SimulationContext } from "../interfaces";
import { rng } from "../../../utils/generators";
import { MATCH_CONFIG } from "../../../constants/matchEngine";
import { Player } from "../../../models/people";

export class ShootCommand extends BaseCommand {
  execute(ctx: SimulationContext): void {
    const attacker = rng.pick(ctx.hasPossession.startingXI) as Player;
    const keeper = (ctx.defendingTeam.startingXI.find(
      (p) => p.primaryPositionId === "GK"
    ) || ctx.defendingTeam.startingXI[0]) as Player;
    const finishAttr =
      (attacker.finishing + attacker.technique + attacker.determination) / 3;
    const saveAttr =
      (keeper.gkReflexes + keeper.gkDistribution + keeper.gkRushingOut) / 3;

    const momentumBonus =
      ctx.hasPossession.clubId === ctx.home.clubId
        ? (ctx.momentum - 50) / 2
        : (50 - ctx.momentum) / 2;

    const goalChance =
      finishAttr - saveAttr + momentumBonus + rng.range(-20, 20);

    if (goalChance > MATCH_CONFIG.THRESHOLDS.GOAL) {
      this.handleGoal(ctx, attacker);
    } else if (goalChance > MATCH_CONFIG.THRESHOLDS.SAVE) {
      this.handleSave(ctx, attacker, keeper);
    } else {
      this.handleMiss(ctx, attacker);
    }
  }

  private handleGoal(ctx: SimulationContext, attacker: Player) {
    this.createEvent(
      ctx,
      "GOAL",
      ctx.hasPossession.clubId,
      attacker.id,
      `GOLAÇO! ${attacker.name} balança a rede!`
    );
    this.updateStat(ctx, attacker.id, "goals", 1);
    this.updateStat(ctx, attacker.id, "shotsOnTarget", 1);
    this.updateRating(ctx, attacker.id, MATCH_CONFIG.RATING_WEIGHTS.GOAL);

    ctx.momentum =
      ctx.hasPossession.clubId === ctx.home.clubId
        ? MATCH_CONFIG.MOMENTUM.AFTER_GOAL_HOME
        : MATCH_CONFIG.MOMENTUM.AFTER_GOAL_AWAY;

    if (rng.range(0, 100) < MATCH_CONFIG.PROBABILITIES.ASSIST) {
      const potentialAssisters = ctx.hasPossession.startingXI.filter(
        (p) => p.id !== attacker.id
      );
      if (potentialAssisters.length > 0) {
        const assister = rng.pick(potentialAssisters) as Player;
        this.updateStat(ctx, assister.id, "assists", 1);
        this.updateRating(ctx, assister.id, MATCH_CONFIG.RATING_WEIGHTS.ASSIST);
      }
    }
  }

  private handleSave(ctx: SimulationContext, attacker: Player, keeper: Player) {
    this.createEvent(
      ctx,
      "CHANCE",
      ctx.hasPossession.clubId,
      attacker.id,
      `Incrível defesa de ${keeper.name} no chute de ${attacker.name}!`
    );
    this.updateStat(ctx, attacker.id, "shotsOnTarget", 1);
    this.updateStat(ctx, keeper.id, "saves", 1);
    this.updateRating(ctx, keeper.id, MATCH_CONFIG.RATING_WEIGHTS.SAVE);
  }

  private handleMiss(ctx: SimulationContext, attacker: Player) {
    if (rng.range(0, 100) < 30) {
      this.createEvent(
        ctx,
        "CHANCE",
        ctx.hasPossession.clubId,
        attacker.id,
        `${attacker.name} chuta para fora!`
      );
    }
    this.updateStat(ctx, attacker.id, "shotsOffTarget", 1);
    this.updateRating(ctx, attacker.id, MATCH_CONFIG.RATING_WEIGHTS.ERROR);
  }
}
