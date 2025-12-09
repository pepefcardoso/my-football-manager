import { AttributeCalculator } from "../engine/AttributeCalculator";
import { playerRepository } from "../repositories/PlayerRepository";
import { players } from "../db/schema";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import type { Position } from "../domain/enums";
import { Logger } from "../lib/Logger";

export class PlayerService {
  private logger: Logger;

  constructor() {
    this.logger = new Logger("PlayerService");
  }

  /**
   * Recalcula e atualiza o Overall do jogador com base nos atributos atuais
   */
  async updatePlayerOverall(playerId: number): Promise<void> {
    try {
      const player = await playerRepository.findById(playerId);

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
        await playerRepository.update(playerId, { overall: newOverall });
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
      const result = await db.query.players.findFirst({
        where: eq(players.id, playerId),
        with: {
          contracts: {
            where: (contracts, { eq }) => eq(contracts.status, "active"),
            limit: 1,
          },
        },
      });

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

export const playerService = new PlayerService();
