import { AttributeCalculator } from "../engine/AttributeCalculator";
import { Position } from "../domain/enums";
import { Logger } from "../lib/Logger";
import type { IRepositoryContainer } from "../repositories/IRepositories";

export class PlayerService {
  private readonly logger: Logger;
  private readonly repos: IRepositoryContainer;

  constructor(repositories: IRepositoryContainer) {
    this.repos = repositories;
    this.logger = new Logger("PlayerService");
  }

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

  async getPlayersByTeam(teamId: number) {
    this.logger.debug(`Buscando jogadores do time ${teamId}...`);

    try {
      return await this.repos.players.findByTeamId(teamId);
    } catch (error) {
      this.logger.error(`Erro ao buscar jogadores do time ${teamId}:`, error);
      return [];
    }
  }

  async getYouthPlayers(teamId: number) {
    this.logger.debug(`Buscando jogadores da base do time ${teamId}...`);

    try {
      return await this.repos.players.findYouthAcademy(teamId);
    } catch (error) {
      this.logger.error(
        `Erro ao buscar jogadores da base do time ${teamId}:`,
        error
      );
      return [];
    }
  }

  async getFreeAgents() {
    this.logger.debug(`Buscando jogadores sem contrato...`);

    try {
      return await this.repos.players.findFreeAgents();
    } catch (error) {
      this.logger.error("Erro ao buscar jogadores sem contrato:", error);
      return [];
    }
  }

  async updatePlayerCondition(
    playerId: number,
    updates: {
      energy?: number;
      fitness?: number;
      moral?: number;
    }
  ): Promise<void> {
    this.logger.debug(`Atualizando condição do jogador ${playerId}...`);

    try {
      const player = await this.repos.players.findById(playerId);
      if (!player) {
        this.logger.warn(`Jogador ${playerId} não encontrado.`);
        return;
      }

      await this.repos.players.update(playerId, updates);
      this.logger.debug(`Condição atualizada para jogador ${playerId}`);
    } catch (error) {
      this.logger.error(
        `Erro ao atualizar condição do jogador ${playerId}:`,
        error
      );
    }
  }

  async injurePlayer(
    playerId: number,
    injuryType: string,
    daysRemaining: number
  ): Promise<void> {
    this.logger.info(
      `Aplicando lesão ao jogador ${playerId}: ${injuryType} (${daysRemaining} dias)`
    );

    try {
      await this.repos.players.update(playerId, {
        isInjured: true,
        injuryType,
        injuryDaysRemaining: daysRemaining,
      });

      this.logger.info(`Lesão aplicada com sucesso ao jogador ${playerId}`);
    } catch (error) {
      this.logger.error(`Erro ao lesionar jogador ${playerId}:`, error);
    }
  }
}
