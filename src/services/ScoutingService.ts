import { scoutingRepository } from "../repositories/ScoutingRepository";
import { staffRepository } from "../repositories/StaffRepository";
import { playerRepository } from "../repositories/PlayerRepository";
import { RandomEngine } from "../engine/RandomEngine";
import type { Player } from "../domain/models";

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
  /**
   * Aplica o Fog of War a um jogador baseado no time que o visualiza
   */
  async getScoutedPlayer(
    playerId: number,
    viewerTeamId: number
  ): Promise<ScoutedPlayerView | null> {
    const player = await playerRepository.findById(playerId);
    if (!player) return null;

    if (player.teamId === viewerTeamId) {
      return this.createFullVisibilityView(player);
    }

    const report = await scoutingRepository.findByPlayerAndTeam(
      playerId,
      viewerTeamId
    );
    const progress = report ? report.progress || 0 : 0;

    return this.createMaskedView(player, progress, report ? report.date : null);
  }

  /**
   * Lista todos os jogadores observados por um time
   */
  async getScoutingList(teamId: number) {
    return await scoutingRepository.findByTeam(teamId);
  }

  /**
   * Atribui um olheiro para observar um jogador
   */
  async assignScoutToPlayer(
    scoutId: number,
    playerId: number
  ): Promise<boolean> {
    try {
      const scout = await staffRepository.findById(scoutId);
      if (!scout || !scout.teamId) return false;

      const player = await playerRepository.findById(playerId);
      if (!player) return false;

      const date = new Date().toISOString().split("T")[0];

      await scoutingRepository.upsert({
        teamId: scout.teamId,
        playerId: playerId,
        scoutId: scoutId,
        date: date,
        progress: 0,
        notes: "Observação iniciada",
      });

      return true;
    } catch (error) {
      console.error("Erro ao atribuir olheiro:", error);
      return false;
    }
  }

  /**
   * Processa a evolução diária dos olheiros
   */
  async processDailyScouting(currentDate: string) {
    const activeReports = await scoutingRepository.findActiveReports();

    for (const report of activeReports) {
      if (!report.scoutId || (report.progress || 0) >= 100) continue;

      const scout = await staffRepository.findById(report.scoutId);
      if (!scout) continue;

      const dailyProgress =
        Math.round(scout.overall / 10) + RandomEngine.getInt(1, 5);

      await scoutingRepository.upsert({
        ...report,
        date: currentDate,
        progress: dailyProgress,
      });
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

export const scoutingService = new ScoutingService();
