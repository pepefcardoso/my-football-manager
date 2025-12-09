import { RandomEngine } from "../engine/RandomEngine";
import type { Player } from "../domain/models";
import { Logger } from "../lib/Logger";
import type { IRepositoryContainer } from "../repositories/IRepositories";
import { repositoryContainer } from "../repositories/RepositoryContainer";

export interface MaskedAttribute {
  value: number | string;
  isExact: boolean;
  min?: number;
  max?: number;
}

export interface ScoutedPlayerView extends Player {
  visibleAttributes: Record<string, MaskedAttribute>;
  scoutingStatus: {
    isObserved: boolean;
    progress: number;
    lastUpdate: string;
  };
}

export class ScoutingService {
  private logger: Logger;
  private repos: IRepositoryContainer;

  constructor(repositories: IRepositoryContainer) {
    this.repos = repositories;
    this.logger = new Logger("ScoutingService");
  }

  /**
   * Aplica o Fog of War a um jogador baseado no time que o visualiza
   */
  async getScoutedPlayer(
    playerId: number,
    viewerTeamId: number
  ): Promise<ScoutedPlayerView | null> {
    try {
      const player = await this.repos.players.findById(playerId);
      if (!player) {
        this.logger.warn(`Jogador ${playerId} não encontrado para scouting.`);
        return null;
      }

      if (player.teamId === viewerTeamId) {
        return this.createFullVisibilityView(player);
      }

      const report = await this.repos.scouting.findByPlayerAndTeam(
        playerId,
        viewerTeamId
      );
      const progress = report ? report.progress || 0 : 0;

      return this.createMaskedView(
        player,
        progress,
        report ? report.date : null
      );
    } catch (error) {
      this.logger.error("Erro ao processar getScoutedPlayer", error);
      throw error;
    }
  }

  /**
   * Lista todos os jogadores observados por um time
   */
  async getScoutingList(teamId: number) {
    this.logger.debug(`Buscando lista de observação para o time ${teamId}`);
    return await this.repos.scouting.findByTeam(teamId);
  }

  /**
   * Atribui um olheiro para observar um jogador
   */
  async assignScoutToPlayer(
    scoutId: number,
    playerId: number
  ): Promise<boolean> {
    this.logger.info(`Atribuindo olheiro ${scoutId} ao jogador ${playerId}...`);

    try {
      const scout = await this.repos.staff.findById(scoutId);
      if (!scout || !scout.teamId) {
        this.logger.warn("Olheiro inválido ou sem time.");
        return false;
      }

      const player = await this.repos.players.findById(playerId);
      if (!player) {
        this.logger.warn("Jogador alvo não encontrado.");
        return false;
      }

      const date = new Date().toISOString().split("T")[0];

      await this.repos.scouting.upsert({
        teamId: scout.teamId,
        playerId: playerId,
        scoutId: scoutId,
        date: date,
        progress: 0,
        notes: "Observação iniciada",
      });

      this.logger.info("Olheiro atribuído com sucesso.");
      return true;
    } catch (error) {
      this.logger.error("Erro ao atribuir olheiro:", error);
      return false;
    }
  }

  /**
   * Processa a evolução diária dos olheiros
   */
  async processDailyScouting(currentDate: string) {
    this.logger.info(`Processando scouting diário para ${currentDate}`);
    try {
      const activeReports = await this.repos.scouting.findActiveReports();
      let updatesCount = 0;

      for (const report of activeReports) {
        if (!report.scoutId || (report.progress || 0) >= 100) continue;

        const scout = await this.repos.staff.findById(report.scoutId);
        if (!scout) continue;

        const dailyProgress =
          Math.round(scout.overall / 10) + RandomEngine.getInt(1, 5);

        await this.repos.scouting.upsert({
          ...report,
          date: currentDate,
          progress: dailyProgress,
        });
        updatesCount++;
      }
      this.logger.info(
        `Scouting diário finalizado. ${updatesCount} relatórios atualizados.`
      );
    } catch (error) {
      this.logger.error("Erro no processamento diário de scouting", error);
    }
  }

  private createFullVisibilityView(player: Player): ScoutedPlayerView {
    const attrs = this.extractAttributes(player);
    const visibleAttrs: Record<string, MaskedAttribute> = {};

    for (const [key, val] of Object.entries(attrs)) {
      visibleAttrs[key] = { value: val, isExact: true, min: val, max: val };
    }

    return {
      ...player,
      visibleAttributes: visibleAttrs,
      scoutingStatus: { isObserved: true, progress: 100, lastUpdate: "Hoje" },
    };
  }

  private createMaskedView(
    player: Player,
    progress: number,
    lastDate: string | null
  ): ScoutedPlayerView {
    const attrs = this.extractAttributes(player);
    const visibleAttrs: Record<string, MaskedAttribute> = {};

    for (const [key, val] of Object.entries(attrs)) {
      visibleAttrs[key] = this.maskValue(val, progress);
    }

    return {
      ...player,
      visibleAttributes: visibleAttrs,
      scoutingStatus: {
        isObserved: progress > 0,
        progress: progress,
        lastUpdate: lastDate || "Nunca",
      },
    };
  }

  private maskValue(realValue: number, progress: number): MaskedAttribute {
    if (progress >= 100) {
      return {
        value: realValue,
        isExact: true,
        min: realValue,
        max: realValue,
      };
    }

    const uncertainty = Math.max(1, Math.round(10 - progress / 10));

    const noise = RandomEngine.getInt(-1, 1);
    const estimatedCenter = Math.max(1, Math.min(99, realValue + noise));

    const min = Math.max(1, estimatedCenter - uncertainty);
    const max = Math.min(99, estimatedCenter + uncertainty);

    return {
      value: `${min}-${max}`,
      isExact: false,
      min,
      max,
    };
  }

  private extractAttributes(player: Player): Record<string, number> {
    return {
      finishing: player.finishing,
      passing: player.passing,
      dribbling: player.dribbling,
      defending: player.defending,
      physical: player.physical,
      pace: player.pace,
      shooting: player.shooting,
      overall: player.overall,
      potential: player.potential,
    };
  }
}

export function createScoutingService(
  repos: IRepositoryContainer
): ScoutingService {
  return new ScoutingService(repos);
}

export const scoutingService = new ScoutingService(repositoryContainer);
