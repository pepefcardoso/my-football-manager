import type { Player, Team } from "../../domain/models";
import type {
  EnginePlayer,
  EngineTeam,
  EngineAttributes,
  EnginePosition,
  EngineCondition,
} from "../types/EngineTypes";

export class DomainToEngineAdapter {
  /**
   * Converte um jogador do domínio (DB) para o formato do motor.
   */
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

  /**
   * Converte um time e sua lista de jogadores para o formato do motor.
   * @param team Dados do time
   * @param players Lista de jogadores (já filtrada/selecionada para a partida se necessário)
   * @param tacticalBonus Bônus tático opcional (padrão 0)
   */
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
