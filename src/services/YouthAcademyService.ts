import { BaseService } from "./BaseService";
import type { IRepositoryContainer } from "../repositories/IRepositories";
import { type ServiceResult } from "../domain/ServiceResults";
import type { Player } from "../domain/models";
import { Position } from "../domain/enums";
import { RandomEngine } from "../engine/RandomEngine";
import { InfrastructureEconomics } from "../engine/InfrastructureEconomics";
import { getBalanceValue } from "../engine/GameBalanceConfig";

const TRANSFER_CONFIG = getBalanceValue("TRANSFER");

export class YouthAcademyService extends BaseService {
  constructor(repositories: IRepositoryContainer) {
    super(repositories, "YouthAcademyService");
  }

  async getAcademyPlayers(teamId: number): Promise<ServiceResult<Player[]>> {
    return this.execute("getAcademyPlayers", teamId, async (teamId) => {
      return await this.repos.players.findYouthAcademy(teamId);
    });
  }

  async promotePlayer(
    playerId: number,
    teamId: number
  ): Promise<ServiceResult<void>> {
    return this.executeVoid(
      "promotePlayer",
      { playerId, teamId },
      async ({ playerId, teamId }) => {
        const player = await this.repos.players.findById(playerId);

        if (!player) throw new Error("Jogador não encontrado.");
        if (player.teamId !== teamId)
          throw new Error("Jogador não pertence ao seu time.");
        if (!player.isYouth)
          throw new Error("Jogador já faz parte do elenco profissional.");

        const squad = await this.repos.players.findByTeamId(teamId);
        if (squad.length >= TRANSFER_CONFIG.VALIDATION.SQUAD_MAX_SIZE) {
          throw new Error(
            "Elenco principal cheio. Venda ou dispense jogadores antes."
          );
        }

        await this.repos.players.update(playerId, {
          isYouth: false,
          moral: 80,
        });

        const contract = await this.repos.contracts.findActiveByPlayerId(
          playerId
        );
        if (contract) {
          await this.repos.contracts.updateTerms(
            contract.id,
            Math.max(contract.wage, 500),
            contract.endDate
          );
        }

        this.logger.info(
          `Jogador ${player.lastName} promovido para o time principal.`
        );
      }
    );
  }

  async releasePlayer(
    playerId: number,
    teamId: number
  ): Promise<ServiceResult<void>> {
    return this.executeVoid(
      "releasePlayer",
      { playerId, teamId },
      async ({ playerId, teamId }) => {
        const player = await this.repos.players.findById(playerId);

        if (!player || player.teamId !== teamId)
          throw new Error("Operação inválida ou jogador não encontrado.");

        await this.repos.players.update(playerId, {
          teamId: null,
          isYouth: false,
        });

        const contract = await this.repos.contracts.findActiveByPlayerId(
          playerId
        );
        if (contract) {
          await this.repos.contracts.updateStatus(contract.id, "terminated");
        }

        this.logger.info(`Jovem ${player.lastName} dispensado da academia.`);
      }
    );
  }

  async generateYouthIntake(teamId: number): Promise<ServiceResult<Player[]>> {
    return this.execute("generateYouthIntake", teamId, async (teamId) => {
      const team = await this.repos.teams.findById(teamId);
      if (!team) throw new Error("Time não encontrado");

      const quality = team.youthAcademyQuality || 0;
      const benefits = InfrastructureEconomics.getYouthBenefits(quality);
      const quantity = RandomEngine.getInt(2, 5);
      const createdPlayers: Player[] = [];

      this.logger.info(
        `Gerando ${quantity} jovens para time ${teamId}. Qualidade Base: ${quality}`
      );

      for (let i = 0; i < quantity; i++) {
        const position = RandomEngine.pickOne(Object.values(Position));
        const age = RandomEngine.getInt(15, 17);
        const qualityBonus = Math.round(quality * 0.2);
        const variance = RandomEngine.getInt(-4, 4);

        const baseOvr = Math.max(
          30,
          Math.min(58, 30 + qualityBonus + variance)
        );

        const minPot = baseOvr + 10 + benefits.minPotentialBonus;
        const maxPot = Math.min(94, baseOvr + 40 + benefits.maxPotentialBonus);

        const potential = Math.min(99, RandomEngine.getInt(minPot, maxPot));

        const stats = this.generateBaseStats(position, baseOvr);

        const playerData: any = {
          teamId,
          firstName: `Jovem`,
          lastName: `Promessa ${RandomEngine.getInt(100, 999)}`,
          age,
          position,
          nationality: "BRA", // TODO: Usar nacionalidade do time no futuro
          overall: baseOvr,
          potential,
          isYouth: true,
          ...stats,
          moral: 50,
          energy: 100,
          fitness: 100,
        };

        const newId = await this.repos.players.create(playerData);

        await this.repos.contracts.create({
          playerId: newId,
          teamId,
          wage: 100,
          startDate: new Date().toISOString(),
          endDate: new Date(new Date().getFullYear() + 3, 11, 31).toISOString(),
          type: "youth",
          status: "active",
        } as any);

        const newPlayer = await this.repos.players.findById(newId);
        if (newPlayer) createdPlayers.push(newPlayer);
      }

      return createdPlayers;
    });
  }

  private generateBaseStats(position: string, ovr: number) {
    const base = ovr;

    const v = () => RandomEngine.getInt(-2, 2);

    if (position === Position.GK) {
      return {
        defending: base + 5 + v(),
        physical: base + v(),
        passing: Math.max(1, base - 20 + v()),
        finishing: 5,
        dribbling: 5,
        pace: Math.max(1, base - 10 + v()),
        shooting: 5,
      };
    }
    if (position === Position.DF) {
      return {
        defending: base + 3 + v(),
        physical: base + 2 + v(),
        passing: base - 5 + v(),
        finishing: Math.max(1, base - 20),
        dribbling: base - 10 + v(),
        pace: base - 2 + v(),
        shooting: Math.max(1, base - 15),
      };
    }
    if (position === Position.FW) {
      return {
        defending: Math.max(1, base - 25),
        physical: base - 5 + v(),
        passing: base - 5 + v(),
        finishing: base + 5 + v(),
        dribbling: base + v(),
        pace: base + 2 + v(),
        shooting: base + 4 + v(),
      };
    }
    return {
      defending: base - 5 + v(),
      physical: base - 2 + v(),
      passing: base + 5 + v(),
      finishing: base - 5 + v(),
      dribbling: base + 2 + v(),
      pace: base + v(),
      shooting: base - 5 + v(),
    };
  }
}
