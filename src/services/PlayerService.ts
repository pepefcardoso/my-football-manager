import { AttributeCalculator } from "../engine/AttributeCalculator";
import { Position } from "../domain/enums";
import type { IRepositoryContainer } from "../repositories/IRepositories";
import { BaseService } from "./BaseService";
import type { ServiceResult } from "../domain/ServiceResults";
import type { Player } from "../domain/models";

export interface UpdatePlayerConditionInput {
  playerId: number;
  energy?: number;
  fitness?: number;
  moral?: number;
}

export interface InjurePlayerInput {
  playerId: number;
  injuryType: string;
  daysRemaining: number;
}

export class PlayerService extends BaseService {
  constructor(repositories: IRepositoryContainer) {
    super(repositories, "PlayerService");
  }

  async updatePlayerOverall(playerId: number): Promise<ServiceResult<void>> {
    return this.executeVoid(
      "updatePlayerOverall",
      playerId,
      async (playerId) => {
        const player = await this.repos.players.findById(playerId);

        if (!player) {
          throw new Error(
            `Tentativa de atualizar overall de jogador inexistente: ${playerId}`
          );
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
        }
      }
    );
  }

  async getPlayerWithContract(
    playerId: number
  ): Promise<ServiceResult<Player | undefined>> {
    return this.execute("getPlayerWithContract", playerId, async (playerId) => {
      return await this.repos.players.findById(playerId);
    });
  }

  async getPlayersByTeam(teamId: number): Promise<ServiceResult<Player[]>> {
    return this.execute("getPlayersByTeam", teamId, async (teamId) => {
      return await this.repos.players.findByTeamId(teamId);
    });
  }

  async getYouthPlayers(teamId: number): Promise<ServiceResult<Player[]>> {
    return this.execute("getYouthPlayers", teamId, async (teamId) => {
      return await this.repos.players.findYouthAcademy(teamId);
    });
  }

  async getFreeAgents(): Promise<ServiceResult<Player[]>> {
    return this.execute("getFreeAgents", null, async () => {
      return await this.repos.players.findFreeAgents();
    });
  }

  async updatePlayerCondition(
    input: UpdatePlayerConditionInput
  ): Promise<ServiceResult<void>> {
    return this.executeVoid(
      "updatePlayerCondition",
      input,
      async ({ playerId, ...updates }) => {
        const player = await this.repos.players.findById(playerId);
        if (!player) {
          throw new Error(`Jogador ${playerId} não encontrado.`);
        }

        await this.repos.players.update(playerId, updates);
      }
    );
  }

  async injurePlayer(input: InjurePlayerInput): Promise<ServiceResult<void>> {
    return this.executeVoid(
      "injurePlayer",
      input,
      async ({ playerId, injuryType, daysRemaining }) => {
        await this.repos.players.update(playerId, {
          isInjured: true,
          injuryType,
          injuryDaysRemaining: daysRemaining,
        });
      }
    );
  }
}
