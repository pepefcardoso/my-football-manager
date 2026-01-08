import { BaseCommand } from "./BaseCommand";
import { SimulationContext } from "../interfaces";
import { rng } from "../../../utils/generators";

export class InjuryCommand extends BaseCommand {
  execute(ctx: SimulationContext): void {
    const victim = rng.pick(ctx.hasPossession.startingXI);
    this.createEvent(
      ctx,
      "INJURY",
      ctx.hasPossession.clubId,
      victim.id,
      `${victim.name} cai no relvado sentindo dores.`
    );
    // TODO lógica de substituição forçada seria tratada pelo Manager (outro sistema)
  }
}

export class IdleCommand extends BaseCommand {
  execute(ctx: SimulationContext): void {
    const homeMid = this.getAverage(ctx.home.startingXI, "passing");
    const awayMid = this.getAverage(ctx.away.startingXI, "passing");

    const diff = homeMid - awayMid;
    ctx.momentum += diff * 0.01;
    ctx.momentum = Math.max(0, Math.min(100, ctx.momentum));
  }

  private getAverage(players: any[], attr: string): number {
    return players.reduce((acc, p) => acc + p[attr], 0) / players.length;
  }
}
