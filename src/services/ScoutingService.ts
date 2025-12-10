import { RandomEngine } from "../engine/RandomEngine";
import type { IRepositoryContainer } from "../repositories/IRepositories";
import { BaseService } from "./BaseService";
import type { ServiceResult } from "./types/ServiceResults";
import {
  ScoutingReportFactory,
  type ScoutedPlayerView,
  type MaskedAttribute,
} from "./factories/ReportFactory";

const STAFF_IMPACT_CONFIG = {
  BASE_UNCERTAINTY: 15,
  REDUCTION_RATE: 0.1,
} as const;

export type { ScoutedPlayerView, MaskedAttribute };

export class ScoutingService extends BaseService {
  constructor(repositories: IRepositoryContainer) {
    super(repositories, "ScoutingService");
  }

  async getScoutedPlayer(
    playerId: number,
    viewerTeamId: number
  ): Promise<ServiceResult<ScoutedPlayerView | null>> {
    return this.execute(
      "getScoutedPlayer",
      { playerId, viewerTeamId },
      async ({ playerId, viewerTeamId }) => {
        const player = await this.repos.players.findById(playerId);
        if (!player) {
          this.logger.warn(`Jogador ${playerId} não encontrado para scouting.`);
          return null;
        }

        const report = await this.repos.scouting.findByPlayerAndTeam(
          playerId,
          viewerTeamId
        );

        const progress = report ? report.progress || 0 : 0;
        const lastUpdate = report ? report.date : null;

        return ScoutingReportFactory.createView(
          player,
          progress,
          lastUpdate,
          viewerTeamId
        );
      }
    );
  }

  async getScoutingList(teamId: number): Promise<ServiceResult<any[]>> {
    return this.execute("getScoutingList", teamId, async (teamId) => {
      this.logger.debug(`Buscando lista de observação para o time ${teamId}`);
      return await this.repos.scouting.findByTeam(teamId);
    });
  }

  async assignScoutToPlayer(
    scoutId: number,
    playerId: number
  ): Promise<ServiceResult<void>> {
    return this.executeVoid(
      "assignScoutToPlayer",
      { scoutId, playerId },
      async ({ scoutId, playerId }) => {
        this.logger.info(
          `Atribuindo olheiro ${scoutId} ao jogador ${playerId}...`
        );

        const scout = await this.repos.staff.findById(scoutId);
        if (!scout || !scout.teamId) {
          throw new Error("Olheiro inválido ou sem time associado.");
        }

        const player = await this.repos.players.findById(playerId);
        if (!player) {
          throw new Error("Jogador alvo não encontrado.");
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
      }
    );
  }

  async processDailyScouting(
    currentDate: string
  ): Promise<ServiceResult<void>> {
    return this.executeVoid(
      "processDailyScouting",
      currentDate,
      async (currentDate) => {
        this.logger.info(`Processando scouting diário para ${currentDate}`);

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
      }
    );
  }

  async calculateScoutingAccuracy(
    teamId: number
  ): Promise<ServiceResult<number>> {
    return this.execute("calculateScoutingAccuracy", teamId, async (teamId) => {
      this.logger.debug(
        `Calculando precisão de scouting para o time ${teamId}...`
      );

      const allStaff = await this.repos.staff.findByTeamId(teamId);
      const scouts = allStaff.filter((s) => s.role === "scout");

      if (scouts.length === 0) {
        return STAFF_IMPACT_CONFIG.BASE_UNCERTAINTY;
      }

      const bestScout = Math.max(...scouts.map((s) => s.overall));
      const reduction = bestScout * STAFF_IMPACT_CONFIG.REDUCTION_RATE;

      return Math.max(0, STAFF_IMPACT_CONFIG.BASE_UNCERTAINTY - reduction);
    });
  }
}
