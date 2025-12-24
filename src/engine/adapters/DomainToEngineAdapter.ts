import type { Player, Team } from "../../domain/models";
import type {
  EnginePlayer,
  EngineTeam,
  EngineAttributes,
  EnginePosition,
  EngineCondition,
} from "../../domain/EngineTypes";

export class DomainToEngineAdapter {
  static toEnginePlayer(player: Player): EnginePlayer {
    const skills: EngineAttributes = {
      finishing: player.finishing,
      passing: player.passing,
      dribbling: player.dribbling,
      defending: player.defending,
      physical: player.physical,
      pace: player.pace,
      shooting: player.shooting,
    };

    const condition: EngineCondition = {
      energy: player.energy,
      fitness: player.fitness,
      moral: player.moral,
    };

    const position = player.position as EnginePosition;

    return {
      id: player.id.toString(),
      position,
      overall: player.overall,
      skills,
      condition,
    };
  }

  static toEngineTeam(
    team: Team,
    players: Player[],
    tacticalBonus: number = 0
  ): EngineTeam {
    return {
      id: team.id.toString(),
      tacticalBonus,
      players: players.map((p) => this.toEnginePlayer(p)),
    };
  }
}
