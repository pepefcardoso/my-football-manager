import { RandomEngine } from "../engine/RandomEngine";
import type { IRepositoryContainer } from "../repositories/IRepositories";
import { BaseService } from "./BaseService";
import type { ServiceResult } from "./types/ServiceResults";
import {
  ScoutingReportFactory,
  type ScoutedPlayerView,
  type MaskedAttribute,
} from "./factories/ReportFactory";
import { getBalanceValue } from "../engine/GameBalanceConfig";
import { StaffRole } from "../domain/enums";

const SCOUTING_CONFIG = getBalanceValue("SCOUTING");
const PROGRESS_CONFIG = SCOUTING_CONFIG.PROGRESS;

export type { ScoutedPlayerView, MaskedAttribute };

export class ScoutingService extends BaseService {
  constructor(repositories: IRepositoryContainer) {
    super(repositories, "ScoutingService");
  }

  /**
   * Retorna a visão que um time tem de um jogador específico.
   * Os atributos podem estar mascarados (faixa de valores) dependendo do nível de conhecimento (progress).
   * Se o jogador pertence ao time observador, os atributos são exatos (100% progress).
   * * @param playerId - O ID do jogador a ser visualizado.
   * @param viewerTeamId - O ID do time que está visualizando.
   * @returns Objeto ScoutedPlayerView com atributos mascarados ou null se jogador não existir.
   */
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

  /**
   * Retorna a lista de todos os relatórios de observação ativos de um time.
   * * @param teamId - O ID do time.
   * @returns Lista de relatórios de scouting.
   */
  async getScoutingList(teamId: number): Promise<ServiceResult<any[]>> {
    return this.execute("getScoutingList", teamId, async (teamId) => {
      this.logger.debug(`Buscando lista de observação para o time ${teamId}`);
      return await this.repos.scouting.findByTeam(teamId);
    });
  }

  /**
   * Designa um olheiro para observar um jogador específico.
   * Cria um novo relatório ou atualiza um existente iniciando a observação.
   * * @param scoutId - O ID do olheiro (Staff).
   * @param playerId - O ID do jogador alvo.
   * @returns ServiceResult void.
   * @throws Error se olheiro ou jogador não forem encontrados.
   */
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

  /**
   * Processa a evolução diária dos relatórios de scouting.
   * Aumenta a porcentagem de conhecimento sobre os jogadores observados baseados na habilidade do olheiro.
   * * @param currentDate - Data atual da simulação.
   * @returns ServiceResult void.
   */
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
            Math.round(scout.overall / PROGRESS_CONFIG.SCOUT_OVERALL_DIVISOR) +
            RandomEngine.getInt(
              PROGRESS_CONFIG.DAILY_RANDOM_MIN,
              PROGRESS_CONFIG.DAILY_RANDOM_MAX
            );

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

  /**
   * Calcula a precisão geral do departamento de scouting de um time.
   * Baseado na média e qualidade dos olheiros contratados.
   * * @param teamId - O ID do time.
   * @returns Um valor de incerteza (quanto menor, melhor).
   */
  async calculateScoutingAccuracy(
    teamId: number
  ): Promise<ServiceResult<number>> {
    return this.execute("calculateScoutingAccuracy", teamId, async (teamId) => {
      this.logger.debug(
        `Calculando precisão de scouting para o time ${teamId}...`
      );

      const allStaff = await this.repos.staff.findByTeamId(teamId);
      const scouts = allStaff.filter((s) => s.role === StaffRole.SCOUT);

      if (scouts.length === 0) {
        return SCOUTING_CONFIG.BASE_UNCERTAINTY;
      }

      const bestScout = Math.max(...scouts.map((s) => s.overall));
      const reduction = bestScout * SCOUTING_CONFIG.REDUCTION_RATE;

      return Math.max(0, SCOUTING_CONFIG.BASE_UNCERTAINTY - reduction);
    });
  }
}
