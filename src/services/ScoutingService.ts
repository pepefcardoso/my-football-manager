import { RandomEngine } from "../engine/RandomEngine";
import type { IRepositoryContainer } from "../repositories/IRepositories";
import { BaseService } from "./BaseService";
import type { ServiceResult } from "../domain/ServiceResults";
import { getBalanceValue } from "../engine/GameBalanceConfig";
import { StaffRole } from "../domain/enums";
import {
  ScoutingReportFactory,
  type ScoutedPlayerView,
  type MaskedAttribute,
} from "../domain/factories/ReportFactory";
import { InfrastructureEconomics } from "../engine/InfrastructureEconomics";
import type { ScoutingSlot } from "../domain/models";

const SCOUTING_CONFIG = getBalanceValue("SCOUTING");

export type { ScoutedPlayerView, MaskedAttribute };

export class ScoutingService extends BaseService {
  constructor(repositories: IRepositoryContainer) {
    super(repositories, "ScoutingService");
  }

  async executeSlotSearch(
    teamId: number,
    slot: ScoutingSlot,
    currentDate: string
  ): Promise<ServiceResult<void>> {
    return this.executeVoid(
      "executeSlotSearch",
      { teamId, slotNumber: slot.slotNumber },
      async () => {
        if (!slot.isActive) return;

        const efficiency = await this.calculateSearchEfficiency(teamId);

        const potentialTargets = await (
          this.repos.players as any
        ).findByCriteria(slot.filters, 20);

        if (potentialTargets.length === 0) return;

        const baseChance = SCOUTING_CONFIG.DISCOVERY_CHANCE.BASE;
        const bonus =
          efficiency * SCOUTING_CONFIG.DISCOVERY_CHANCE.PER_EFFICIENCY_POINT;
        const discoveryChance = baseChance + bonus;
        let newPlayersFound = 0;

        for (const player of potentialTargets) {
          const existingReport = await this.repos.scouting.findByPlayerAndTeam(
            player.id,
            teamId
          );

          if (existingReport) {
            const progressGain =
              RandomEngine.getInt(1, 3) + Math.round(efficiency / 20);
            await this.repos.scouting.upsert({
              ...existingReport,
              date: currentDate,
              progress: Math.min(
                100,
                (existingReport.progress || 0) + progressGain
              ),
            });
            continue;
          }

          if (RandomEngine.chance(discoveryChance)) {
            const initialProgress =
              RandomEngine.getInt(10, 20) + Math.round(efficiency / 5);

            await this.repos.scouting.upsert({
              teamId,
              playerId: player.id,
              scoutId: null,
              date: currentDate,
              progress: Math.min(100, initialProgress),
              notes: `Encontrado via Slot ${slot.slotNumber}`,
            });
            newPlayersFound++;
          }
        }

        if (newPlayersFound > 0) {
          const team = await this.repos.teams.findById(teamId);

          if (team && team.scoutingSlots) {
            const currentSlots = team.scoutingSlots;

            const updatedSlots = currentSlots.map((s) => {
              if (s.slotNumber === slot.slotNumber) {
                return {
                  ...s,
                  stats: {
                    playersFound: s.stats.playersFound + newPlayersFound,
                    lastRunDate: currentDate,
                  },
                };
              }
              return s;
            });

            await this.repos.teams.update(teamId, {
              scoutingSlots: updatedSlots,
            });

            this.logger.info(
              `Slot ${slot.slotNumber} encontrou ${newPlayersFound} novos jogadores.`
            );
          }
        }
      }
    );
  }

  private async calculateSearchEfficiency(teamId: number): Promise<number> {
    const staff = await this.repos.staff.findByTeamId(teamId);
    const scouts = staff.filter((s) => s.role === StaffRole.SCOUT);

    if (scouts.length === 0) return 0;

    const totalOverall = scouts.reduce((sum, s) => sum + s.overall, 0);
    const avgOverall = totalOverall / scouts.length;

    const team = await this.repos.teams.findById(teamId);
    const adminLevel = team?.administrativeCenterQuality || 0;
    const adminBonus =
      InfrastructureEconomics.getAdminBenefits(adminLevel).scoutingEfficiency *
      100;

    return Math.round(avgOverall + adminBonus);
  }

  async getScoutedPlayer(
    playerId: number,
    viewerTeamId: number
  ): Promise<
    ServiceResult<(ScoutedPlayerView & { teamName?: string }) | null>
  > {
    return this.execute(
      "getScoutedPlayer",
      { playerId, viewerTeamId },
      async ({ playerId, viewerTeamId }) => {
        const player = await this.repos.players.findById(playerId);
        if (!player) {
          return null;
        }

        const report = await this.repos.scouting.findByPlayerAndTeam(
          playerId,
          viewerTeamId
        );

        let teamName = "Agente Livre";
        if (player.teamId) {
          const team = await this.repos.teams.findById(player.teamId);
          if (team) teamName = team.name;
        }

        const progress = report ? report.progress || 0 : 0;
        const lastUpdate = report ? report.date : null;

        const view = ScoutingReportFactory.createView(
          player,
          progress,
          lastUpdate,
          viewerTeamId
        );

        return {
          ...view,
          teamName,
        };
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

  async calculateScoutingAccuracy(
    teamId: number
  ): Promise<ServiceResult<number>> {
    return this.execute("calculateScoutingAccuracy", teamId, async (teamId) => {
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

  async getScoutingSlots(
    teamId: number
  ): Promise<ServiceResult<ScoutingSlot[]>> {
    return this.execute("getScoutingSlots", teamId, async (teamId) => {
      const team = await this.repos.teams.findById(teamId);
      if (!team) throw new Error("Time não encontrado.");

      let slots = team.scoutingSlots || [];

      if (slots.length === 0) {
        slots = [
          {
            slotNumber: 1,
            isActive: false,
            filters: {},
            stats: { playersFound: 0, lastRunDate: null },
          },
          {
            slotNumber: 2,
            isActive: false,
            filters: {},
            stats: { playersFound: 0, lastRunDate: null },
          },
          {
            slotNumber: 3,
            isActive: false,
            filters: {},
            stats: { playersFound: 0, lastRunDate: null },
          },
        ];
      }

      return slots;
    });
  }

  async updateScoutingSlots(
    teamId: number,
    slots: ScoutingSlot[]
  ): Promise<ServiceResult<void>> {
    return this.executeVoid(
      "updateScoutingSlots",
      { teamId, slots },
      async ({ teamId, slots }) => {
        if (!Array.isArray(slots) || slots.length > 3) {
          throw new Error("Configuração de slots inválida.");
        }

        await this.repos.teams.update(teamId, { scoutingSlots: slots });

        this.logger.info(`Slots de scouting atualizados para o time ${teamId}`);
      }
    );
  }
}
