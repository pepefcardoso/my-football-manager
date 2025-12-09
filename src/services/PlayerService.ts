import { AttributeCalculator } from "../engine/AttributeCalculator";
import { Position } from "../domain/enums";
import { Logger } from "../lib/Logger";
import type { IRepositoryContainer } from "../repositories/IRepositories";
import { repositoryContainer } from "../repositories/RepositoryContainer";

export class PlayerService {
  private logger: Logger;
  private repos: IRepositoryContainer;

  constructor(repositories: IRepositoryContainer) {
    this.repos = repositories;
    this.logger = new Logger("PlayerService");
  }

  /**
   * Recalcula e atualiza o Overall do jogador com base nos atributos atuais
   */
  async updatePlayerOverall(playerId: number): Promise<void> {
    try {
      const player = await this.repos.players.findById(playerId);

      if (!player) {
        this.logger.warn(
          `Tentativa de atualizar overall de jogador inexistente: ${playerId}`
        );
        return;
      }

      const newOverall = AttributeCalculator.calculateOverall(
        player.position as Position,
        {
          finishing: player.finishing || 0,
          passing: player.passing || 0,
          dribbling: player.dribbling || 0,
          defending: player.defending || 0,
          physical: player.physical || 0,
          pace: player.pace || 0,
          shooting: player.shooting || 0,
        }
      );

      if (newOverall !== player.overall) {
        await this.repos.players.update(playerId, { overall: newOverall });
        this.logger.info(
          `Overall atualizado: ${player.firstName} ${player.lastName} (${player.position}) ${player.overall} ➡️ ${newOverall}`
        );
      } else {
        this.logger.debug(
          `Overall mantido para ${player.firstName} ${player.lastName}: ${newOverall}`
        );
      }
    } catch (error) {
      this.logger.error(
        `Erro ao atualizar overall do jogador ${playerId}:`,
        error
      );
    }
  }

  async getPlayerWithContract(playerId: number) {
    this.logger.debug(`Buscando jogador ${playerId} e contrato ativo...`);

    try {
      const result = await this.repos.players.findById(playerId);

      if (!result) {
        this.logger.warn(`Jogador ${playerId} não encontrado.`);
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Erro ao buscar jogador com contrato (${playerId}):`,
        error
      );
      throw error;
    }
  }
}
