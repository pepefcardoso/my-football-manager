import { IMatchCommand, SimulationContext } from "./interfaces";
import { ShootCommand } from "./commands/AttackingCommands";
import { FoulCommand } from "./commands/DisciplineCommands";
import { InjuryCommand, IdleCommand } from "./commands/MiscCommands";
import { rng } from "../../utils/generators";
import { MATCH_CONFIG } from "../../constants/matchEngine";

export class CommandFactory {
  private static shootCmd = new ShootCommand();
  private static foulCmd = new FoulCommand();
  private static injuryCmd = new InjuryCommand();
  private static idleCmd = new IdleCommand();

  static getNextCommand(ctx: SimulationContext): IMatchCommand {
    const roll = rng.range(0, 1000) / 10;
    
    if (roll < MATCH_CONFIG.PROBABILITIES.INJURY_BASE) {
        return this.injuryCmd;
    }

    if (roll < MATCH_CONFIG.PROBABILITIES.FOUL_BASE) {
        return this.foulCmd;
    }

    const momentumModifier = ctx.hasPossession.clubId === ctx.home.clubId 
        ? (ctx.momentum > 60 ? 5 : 0)
        : (ctx.momentum < 40 ? 5 : 0);

    if (roll < (MATCH_CONFIG.PROBABILITIES.ATTACK_BASE + momentumModifier)) {
        return this.shootCmd;
    }

    return this.idleCmd;
  }
}